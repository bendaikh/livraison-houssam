<?php

namespace App\Services;

use App\Support\Utf8Text;
use App\Models\ConfirmationAgentBilling;
use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\SellerBilling;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class BillingService
{
    public function __construct(
        private ?InvoicePdfService $invoicePdfService = null
    ) {
        $this->invoicePdfService ??= app(InvoicePdfService::class);
    }

    public const ROLE_SELLER = 'seller';
    public const ROLE_CONFIRMATION = 'confirmation';
    public const ROLE_DELIVERY = 'delivery';

    public function getAdminDashboard(array $filters = []): array
    {
        $month = $this->resolveMonth($filters['month'] ?? null);
        $role = $filters['role'] ?? null;
        $entityId = isset($filters['entity_id']) ? (int) $filters['entity_id'] : null;

        $this->refreshUnpaidBillings($month, $role, $entityId);

        $records = collect();

        if ($role === null || $role === self::ROLE_SELLER) {
            $records = $records->merge($this->getSellerRecords($month, $entityId));
        }

        if ($role === null || $role === self::ROLE_CONFIRMATION) {
            $records = $records->merge($this->getConfirmationRecords($month, $entityId));
        }

        if ($role === null || $role === self::ROLE_DELIVERY) {
            $records = $records->merge($this->getDeliveryRecords($month, $entityId));
        }

        $records = $records
            ->filter(fn (array $record) => $record['orders_count'] > 0 || $record['settlement_amount'] > 0)
            ->values();

        $unpaid = $records
            ->where('status', 'unpaid')
            ->sortBy([
                ['period_start', 'asc'],
                ['role', 'asc'],
                ['entity_name', 'asc'],
            ])
            ->values();

        $paid = $records
            ->where('status', 'paid')
            ->sortByDesc('paid_at')
            ->values();

        return [
            'filters' => [
                'month' => $month->format('Y-m'),
                'role' => $role,
                'entity_id' => $entityId,
            ],
            'summary' => $this->buildSummary($records, $unpaid, $paid),
            'unpaid' => $unpaid,
            'paid' => $paid,
        ];
    }

    public function preview(array $filters = []): array
    {
        [$role, $entityId, $periodStart, $periodEnd] = $this->resolveCustomPeriodFilters($filters);

        $orders = $this->getEligibleOrdersForRole($role, $entityId, $periodStart, $periodEnd);

        return [
            'role' => $role,
            'entity_id' => $entityId,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'orders_count' => $orders->count(),
            'orders' => $orders->map(fn (Order $order) => $this->mapPreviewOrder($order, $role))->values(),
            'summary' => $this->buildPreviewSummary($orders, $role),
        ];
    }

    public function generate(array $filters = []): array
    {
        if (!empty($filters['period_start']) && !empty($filters['period_end'])) {
            return $this->generateCustomPeriodInvoice($filters);
        }

        $month = $this->resolveMonth($filters['month'] ?? null);
        $role = $filters['role'] ?? null;
        $entityId = isset($filters['entity_id']) ? (int) $filters['entity_id'] : null;

        if ($role === null || $role === self::ROLE_SELLER) {
            $this->generateSellerBillings($month, $role === self::ROLE_SELLER ? $entityId : null);
        }

        if ($role === null || $role === self::ROLE_CONFIRMATION) {
            $this->generateConfirmationBillings($month, $role === self::ROLE_CONFIRMATION ? $entityId : null);
        }

        if ($role === null || $role === self::ROLE_DELIVERY) {
            $this->generateDeliveryBillings($month, $role === self::ROLE_DELIVERY ? $entityId : null);
        }

        return $this->getAdminDashboard($filters);
    }

    public function downloadPdf(string $role, int $billingId): array
    {
        $billing = $this->findBillingRecord($role, $billingId);
        $pdfPath = $this->invoicePdfService->generateForBilling($role, $billingId);
        $billing->update(['pdf_path' => $pdfPath]);
        $billing = $billing->fresh();

        return [
            'invoice_number' => $billing->invoice_number,
            'pdf_path' => $billing->pdf_path,
            'pdf_url' => Storage::disk('public')->url($billing->pdf_path),
        ];
    }

    public function markPaid(string $role, int $billingId, User $actor, ?string $notes = null): array
    {
        return match ($role) {
            self::ROLE_SELLER => $this->markSellerBillingPaid($billingId, $actor, $notes),
            self::ROLE_CONFIRMATION => $this->markConfirmationBillingPaid($billingId, $actor, $notes),
            self::ROLE_DELIVERY => $this->markDeliveryBillingPaid($billingId, $actor, $notes),
            default => abort(422, 'Unsupported billing role.'),
        };
    }

    private function refreshUnpaidBillings(Carbon $month, ?string $role, ?int $entityId): void
    {
        if (($role === null || $role === self::ROLE_SELLER) && $this->sellerBillingTablesExist()) {
            SellerBilling::with('vendor')
                ->whereNull('paid_at')
                ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
                ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
                ->when($entityId && $role === self::ROLE_SELLER, fn ($query) => $query->where('vendor_id', $entityId))
                ->get()
                ->each(function (SellerBilling $billing) {
                    if (!$billing->vendor?->is_active) {
                        return;
                    }

                    $this->recalculateSellerBilling($billing, $billing->vendor, false);
                });
        }

        if ($role === null || $role === self::ROLE_CONFIRMATION) {
            ConfirmationAgentBilling::with('user.role')
                ->whereNull('paid_at')
                ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
                ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
                ->when($entityId && $role === self::ROLE_CONFIRMATION, fn ($query) => $query->where('user_id', $entityId))
                ->get()
                ->each(function (ConfirmationAgentBilling $billing) {
                    if (!$billing->user?->isConfirmationAgent()) {
                        return;
                    }

                    $this->recalculateConfirmationBilling($billing, $billing->user, false);
                });
        }

        if (($role === null || $role === self::ROLE_DELIVERY) && $this->deliveryBillingTablesExist()) {
            DeliveryPersonBilling::with('deliveryPerson.role')
                ->whereNull('paid_at')
                ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
                ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
                ->when($entityId && $role === self::ROLE_DELIVERY, fn ($query) => $query->where('delivery_person_id', $entityId))
                ->get()
                ->each(function (DeliveryPersonBilling $billing) {
                    if (!$billing->deliveryPerson?->isDeliveryPerson()) {
                        return;
                    }

                    $this->recalculateDeliveryBilling($billing, $billing->deliveryPerson, false);
                });

            DeliveryPersonBilling::query()
                ->whereNull('paid_at')
                ->where('total_orders', 0)
                ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
                ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
                ->when($entityId && $role === self::ROLE_DELIVERY, fn ($query) => $query->where('delivery_person_id', $entityId))
                ->get()
                ->each(fn (DeliveryPersonBilling $billing) => $this->deleteEmptyDeliveryBilling($billing));
        }
    }

    private function getSellerRecords(Carbon $month, ?int $vendorId = null): Collection
    {
        if (!$this->sellerBillingTablesExist()) {
            return collect();
        }

        return SellerBilling::with(['vendor', 'paidBy'])
            ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
            ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
            ->when($vendorId, fn ($query) => $query->where('vendor_id', $vendorId))
            ->get()
            ->map(fn (SellerBilling $billing) => $this->mapSellerBilling($billing));
    }

    private function getConfirmationRecords(Carbon $month, ?int $userId = null): Collection
    {
        return ConfirmationAgentBilling::with(['user.role', 'paidBy'])
            ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
            ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
            ->when($userId, fn ($query) => $query->where('user_id', $userId))
            ->get()
            ->map(fn (ConfirmationAgentBilling $billing) => $this->mapConfirmationBilling($billing));
    }

    private function getDeliveryRecords(Carbon $month, ?int $deliveryPersonId = null): Collection
    {
        if (!$this->deliveryBillingTablesExist()) {
            return collect();
        }

        return DeliveryPersonBilling::with(['deliveryPerson.role', 'paidBy'])
            ->where('total_orders', '>', 0)
            ->whereDate('period_start', '<=', $month->copy()->endOfMonth()->toDateString())
            ->whereDate('period_end', '>=', $month->copy()->startOfMonth()->toDateString())
            ->when($deliveryPersonId, fn ($query) => $query->where('delivery_person_id', $deliveryPersonId))
            ->get()
            ->map(fn (DeliveryPersonBilling $billing) => $this->mapDeliveryBilling($billing));
    }

    private function generateSellerBillings(Carbon $month, ?int $vendorId = null): void
    {
        if (!$this->sellerBillingTablesExist()) {
            return;
        }

        $vendors = Vendor::query()
            ->where('is_active', true)
            ->when($vendorId, fn ($query) => $query->where('id', $vendorId))
            ->get();

        DB::transaction(function () use ($vendors, $month) {
            foreach ($vendors as $vendor) {
                $periods = $this->buildSellerPeriodsForMonth(
                    $month,
                    $vendor->billing_frequency ?: 'weekly'
                );

                foreach ($periods as $period) {
                    $billing = SellerBilling::firstOrCreate(
                        [
                            'vendor_id' => $vendor->id,
                            'period_start' => $period['period_start']->toDateString(),
                            'period_end' => $period['period_end']->toDateString(),
                        ],
                        [
                            'billing_frequency' => $vendor->billing_frequency ?: 'weekly',
                        ]
                    );

                    if ($billing->paid_at) {
                        continue;
                    }

                    $this->recalculateSellerBilling($billing, $vendor, true);
                }
            }
        });
    }

    private function generateConfirmationBillings(Carbon $month, ?int $userId = null): void
    {
        $periodStart = $month->copy()->startOfMonth();
        $periodEnd = $month->copy()->endOfMonth();

        $agents = User::with('role')
            ->where('is_active', true)
            ->when($userId, fn ($query) => $query->where('id', $userId))
            ->get()
            ->filter(fn (User $agent) => $agent->isConfirmationAgent())
            ->values();

        DB::transaction(function () use ($agents, $periodStart, $periodEnd) {
            foreach ($agents as $agent) {
                $billing = ConfirmationAgentBilling::firstOrCreate([
                    'user_id' => $agent->id,
                    'period_start' => $periodStart->toDateString(),
                    'period_end' => $periodEnd->toDateString(),
                ]);

                if ($billing->paid_at) {
                    continue;
                }

                $this->recalculateConfirmationBilling($billing, $agent, true);
            }
        });
    }

    private function generateDeliveryBillings(Carbon $month, ?int $deliveryPersonId = null): void
    {
        if (!$this->deliveryBillingTablesExist()) {
            return;
        }

        $cursor = $month->copy()->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();

        while ($cursor->lte($monthEnd)) {
            $this->generateDeliveryBillingsForDate($cursor->copy(), $deliveryPersonId);
            $cursor->addDay();
        }
    }

    private function generateDeliveryBillingsForDate(Carbon $date, ?int $deliveryPersonId = null): void
    {
        $periodStart = $date->copy()->startOfDay();
        $periodEnd = $date->copy()->endOfDay();

        $people = User::with('role')
            ->where('is_active', true)
            ->when($deliveryPersonId, fn ($query) => $query->where('id', $deliveryPersonId))
            ->get()
            ->filter(fn (User $person) => $person->isDeliveryPerson())
            ->values();

        DB::transaction(function () use ($people, $periodStart, $periodEnd) {
            foreach ($people as $person) {
                $deliveredOrders = $this->getDeliveredOrdersForDeliveryBilling($person, $periodStart, $periodEnd);
                $billing = DeliveryPersonBilling::where([
                    'delivery_person_id' => $person->id,
                    'period_start' => $periodStart->toDateString(),
                    'period_end' => $periodEnd->toDateString(),
                ])->first();

                if ($billing?->paid_at) {
                    continue;
                }

                if ($deliveredOrders->isEmpty()) {
                    $this->deleteEmptyDeliveryBilling($billing);
                    continue;
                }

                $billing ??= DeliveryPersonBilling::create([
                    'delivery_person_id' => $person->id,
                    'period_start' => $periodStart->toDateString(),
                    'period_end' => $periodEnd->toDateString(),
                ]);

                $this->syncDeliveryBillingTotals($billing, $deliveredOrders, true);
            }
        });
    }

    private function recalculateSellerBilling(SellerBilling $billing, Vendor $vendor, bool $touchGeneratedAt): SellerBilling
    {
        $periodStart = Carbon::parse($billing->period_start)->startOfDay();
        $periodEnd = Carbon::parse($billing->period_end)->endOfDay();

        $deliveredOrders = Order::where('vendor_id', $vendor->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$periodStart, $periodEnd])
            ->where(function ($query) use ($billing) {
                $query->where('seller_invoice_status', Order::INVOICE_NOT_INVOICED)
                    ->orWhereHas('sellerBillings', function ($billingQuery) use ($billing) {
                        $billingQuery->where('seller_billings.id', $billing->id);
                    });
            })
            ->get(['id', 'total', 'commission_amount', 'shipping_cost', 'seller_net_profit']);

        $grossSales = (float) $deliveredOrders->sum(fn (Order $order) => (float) $order->total);
        $commissionAmount = (float) $deliveredOrders->sum(fn (Order $order) => (float) $order->commission_amount);

        $payload = [
            'billing_frequency' => $vendor->billing_frequency ?: 'weekly',
            'delivered_orders_count' => $deliveredOrders->count(),
            'gross_sales' => $grossSales,
            'commission_amount' => $commissionAmount,
            'net_amount' => $grossSales - $commissionAmount,
        ];

        if ($touchGeneratedAt) {
            $payload['generated_at'] = now();
        }

        $billing->orders()->sync($deliveredOrders->pluck('id'));
        $billing->update($payload);

        if ($touchGeneratedAt) {
            $this->finalizeInvoiceGeneration(self::ROLE_SELLER, $billing, $deliveredOrders);
        }

        return $billing->fresh(['vendor', 'paidBy']);
    }

    private function recalculateConfirmationBilling(ConfirmationAgentBilling $billing, User $agent, bool $touchGeneratedAt): ConfirmationAgentBilling
    {
        $periodStart = Carbon::parse($billing->period_start)->startOfDay();
        $periodEnd = Carbon::parse($billing->period_end)->endOfDay();

        $deliveredOrders = Order::where('confirmation_agent_id', $agent->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$periodStart, $periodEnd])
            ->where(function ($query) use ($billing) {
                $query->where('confirmation_invoice_status', Order::INVOICE_NOT_INVOICED)
                    ->orWhereHas('confirmationBillings', function ($billingQuery) use ($billing) {
                        $billingQuery->where('confirmation_agent_billings.id', $billing->id);
                    });
            })
            ->get(['id']);

        $deliveredOrderIds = $deliveredOrders->pluck('id');

        $commissionPerOrder = (float) $agent->effective_commission_per_order;
        $payload = [
            'delivered_orders_count' => $deliveredOrderIds->count(),
            'commission_per_order' => $commissionPerOrder,
            'total_amount' => $deliveredOrderIds->count() * $commissionPerOrder,
        ];

        if ($touchGeneratedAt) {
            $payload['generated_at'] = now();
        }

        $billing->orders()->sync($deliveredOrderIds);
        $billing->update($payload);

        if ($touchGeneratedAt) {
            $this->finalizeInvoiceGeneration(self::ROLE_CONFIRMATION, $billing, $deliveredOrders);
        }

        return $billing->fresh(['user.role', 'paidBy']);
    }

    private function recalculateDeliveryBilling(DeliveryPersonBilling $billing, User $deliveryPerson, bool $touchGeneratedAt): ?DeliveryPersonBilling
    {
        $periodStart = Carbon::parse($billing->period_start)->startOfDay();
        $periodEnd = Carbon::parse($billing->period_end)->endOfDay();
        $deliveredOrders = $this->getDeliveredOrdersForDeliveryBilling($deliveryPerson, $periodStart, $periodEnd, $billing->id);

        if ($deliveredOrders->isEmpty()) {
            $this->deleteEmptyDeliveryBilling($billing);
            return null;
        }

        return $this->syncDeliveryBillingTotals($billing, $deliveredOrders, $touchGeneratedAt);
    }

    private function markSellerBillingPaid(int $billingId, User $actor, ?string $notes): array
    {
        abort_unless($this->sellerBillingTablesExist(), 503, 'Seller billing tables are not available.');

        $billing = SellerBilling::with(['vendor', 'paidBy'])->findOrFail($billingId);

        if (!$billing->paid_at && $billing->vendor) {
            $this->recalculateSellerBilling($billing, $billing->vendor, false);
        }

        $billing->update([
            'paid_at' => now(),
            'paid_by_id' => $actor->id,
            'notes' => $notes ?? $billing->notes,
        ]);

        return $this->mapSellerBilling($billing->fresh(['vendor', 'paidBy']));
    }

    private function markConfirmationBillingPaid(int $billingId, User $actor, ?string $notes): array
    {
        $billing = ConfirmationAgentBilling::with(['user.role', 'paidBy'])->findOrFail($billingId);

        if (!$billing->paid_at && $billing->user?->isConfirmationAgent()) {
            $this->recalculateConfirmationBilling($billing, $billing->user, false);
        }

        $billing->update([
            'paid_at' => now(),
            'paid_by_id' => $actor->id,
            'notes' => $notes ?? $billing->notes,
        ]);

        return $this->mapConfirmationBilling($billing->fresh(['user.role', 'paidBy']));
    }

    private function markDeliveryBillingPaid(int $billingId, User $actor, ?string $notes): array
    {
        abort_unless($this->deliveryBillingTablesExist(), 503, 'Delivery billing tables are not available.');

        $billing = DeliveryPersonBilling::with(['deliveryPerson.role', 'paidBy'])->findOrFail($billingId);

        if (!$billing->paid_at && $billing->deliveryPerson?->isDeliveryPerson()) {
            $billing = $this->recalculateDeliveryBilling($billing, $billing->deliveryPerson, false);
        }

        if (!$billing || (int) $billing->total_orders === 0) {
            abort(422, 'Cannot mark an empty delivery invoice as paid.');
        }

        $billing->update([
            'paid_at' => now(),
            'paid_by_id' => $actor->id,
            'notes' => $notes ?? $billing->notes,
        ]);

        return $this->mapDeliveryBilling($billing->fresh(['deliveryPerson.role', 'paidBy']));
    }

    private function mapSellerBilling(SellerBilling $billing): array
    {
        return [
            'key' => self::ROLE_SELLER . '-' . $billing->id,
            'source_id' => $billing->id,
            'role' => self::ROLE_SELLER,
            'role_label' => 'Seller',
            'entity_id' => $billing->vendor_id,
            'entity_name' => $billing->vendor?->name ?? 'Unknown seller',
            'frequency' => $billing->billing_frequency ?: 'weekly',
            'frequency_label' => $this->frequencyLabel($billing->billing_frequency ?: 'weekly'),
            'period_start' => $billing->period_start?->toDateString(),
            'period_end' => $billing->period_end?->toDateString(),
            'orders_count' => (int) $billing->delivered_orders_count,
            'rate_amount' => null,
            'gross_amount' => (float) $billing->gross_sales,
            'fee_amount' => (float) $billing->commission_amount,
            'settlement_amount' => (float) $billing->net_amount,
            'settlement_label' => 'Payout to seller',
            'direction' => 'outgoing',
            'status' => $billing->paid_at ? 'paid' : 'unpaid',
            'generated_at' => $billing->generated_at?->toIso8601String(),
            'paid_at' => $billing->paid_at?->toIso8601String(),
            'paid_by_name' => $billing->paidBy?->name,
            'notes' => $billing->notes,
            'invoice_number' => $billing->invoice_number,
            'pdf_url' => $billing->pdf_path ? Storage::disk('public')->url($billing->pdf_path) : null,
            'calculation_label' => 'Sum of Seller Net Profits (Prix de vente - Prix produit - Livraison - Fullfilment)',
        ];
    }

    private function mapConfirmationBilling(ConfirmationAgentBilling $billing): array
    {
        return [
            'key' => self::ROLE_CONFIRMATION . '-' . $billing->id,
            'source_id' => $billing->id,
            'role' => self::ROLE_CONFIRMATION,
            'role_label' => 'Confirmation',
            'entity_id' => $billing->user_id,
            'entity_name' => $billing->user?->name ?? 'Unknown agent',
            'frequency' => 'monthly',
            'frequency_label' => 'Monthly',
            'period_start' => $billing->period_start?->toDateString(),
            'period_end' => $billing->period_end?->toDateString(),
            'orders_count' => (int) $billing->delivered_orders_count,
            'rate_amount' => (float) $billing->commission_per_order,
            'gross_amount' => (float) $billing->total_amount,
            'fee_amount' => 0.0,
            'settlement_amount' => (float) $billing->total_amount,
            'settlement_label' => 'Salary / commission payout',
            'direction' => 'outgoing',
            'status' => $billing->paid_at ? 'paid' : 'unpaid',
            'generated_at' => $billing->generated_at?->toIso8601String(),
            'paid_at' => $billing->paid_at?->toIso8601String(),
            'paid_by_name' => $billing->paidBy?->name,
            'notes' => $billing->notes,
            'invoice_number' => $billing->invoice_number,
            'pdf_url' => $billing->pdf_path ? Storage::disk('public')->url($billing->pdf_path) : null,
            'calculation_label' => sprintf('Monthly commission at %.2f per delivered order', (float) $billing->commission_per_order),
        ];
    }

    private function mapDeliveryBilling(DeliveryPersonBilling $billing): array
    {
        return [
            'key' => self::ROLE_DELIVERY . '-' . $billing->id,
            'source_id' => $billing->id,
            'role' => self::ROLE_DELIVERY,
            'role_label' => 'Delivery',
            'entity_id' => $billing->delivery_person_id,
            'entity_name' => $billing->deliveryPerson?->name ?? 'Unknown delivery person',
            'frequency' => 'daily',
            'frequency_label' => 'Daily',
            'period_start' => $billing->period_start?->toDateString(),
            'period_end' => $billing->period_end?->toDateString(),
            'orders_count' => (int) $billing->total_orders,
            'rate_amount' => null,
            'gross_amount' => (float) $billing->total_collected,
            'fee_amount' => (float) $billing->total_commission,
            'settlement_amount' => (float) $billing->total_due_to_admin,
            'settlement_label' => 'Cash due back to admin',
            'direction' => 'incoming',
            'status' => $billing->paid_at ? 'paid' : 'unpaid',
            'generated_at' => $billing->generated_at?->toIso8601String(),
            'paid_at' => $billing->paid_at?->toIso8601String(),
            'paid_by_name' => $billing->paidBy?->name,
            'notes' => $billing->notes,
            'invoice_number' => $billing->invoice_number,
            'pdf_url' => $billing->pdf_path ? Storage::disk('public')->url($billing->pdf_path) : null,
            'calculation_label' => 'Collected cash minus delivery commission',
        ];
    }

    private function getDeliveredOrdersForDeliveryBilling(
        User $deliveryPerson,
        Carbon $periodStart,
        Carbon $periodEnd,
        ?int $currentBillingId = null
    ): EloquentCollection {
        return Order::where('delivery_person_id', $deliveryPerson->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$periodStart, $periodEnd])
            ->where(function ($query) use ($currentBillingId) {
                $query->where('delivery_invoice_status', Order::INVOICE_NOT_INVOICED);

                if ($currentBillingId) {
                    $query->orWhereHas('deliveryPersonBillings', function ($billingQuery) use ($currentBillingId) {
                        $billingQuery->where('delivery_person_billings.id', $currentBillingId);
                    });
                }
            })
            ->get(['id', 'collected_amount', 'delivery_person_commission', 'amount_due_to_admin']);
    }

    private function syncDeliveryBillingTotals(
        DeliveryPersonBilling $billing,
        EloquentCollection $deliveredOrders,
        bool $touchGeneratedAt
    ): DeliveryPersonBilling {
        $payload = [
            'total_orders' => $deliveredOrders->count(),
            'total_collected' => $deliveredOrders->sum(fn (Order $order) => (float) $order->collected_amount),
            'total_commission' => $deliveredOrders->sum(fn (Order $order) => (float) $order->delivery_person_commission),
            'total_due_to_admin' => $deliveredOrders->sum(fn (Order $order) => (float) $order->amount_due_to_admin),
        ];

        if ($touchGeneratedAt) {
            $payload['generated_at'] = now();
        }

        $billing->orders()->sync($deliveredOrders->pluck('id'));
        $billing->update($payload);

        if ($touchGeneratedAt) {
            $this->finalizeInvoiceGeneration(self::ROLE_DELIVERY, $billing, $deliveredOrders);
        }

        return $billing->fresh(['deliveryPerson.role', 'paidBy']);
    }

    private function deleteEmptyDeliveryBilling(?DeliveryPersonBilling $billing): void
    {
        if (!$billing || $billing->paid_at) {
            return;
        }

        $billing->orders()->sync([]);
        $billing->delete();
    }

    private function buildSummary(Collection $records, Collection $unpaid, Collection $paid): array
    {
        $pendingOutgoing = $unpaid
            ->where('direction', 'outgoing')
            ->sum('settlement_amount');

        $pendingIncoming = $unpaid
            ->where('direction', 'incoming')
            ->sum('settlement_amount');

        return [
            'total_invoices' => $records->count(),
            'open_invoices' => $unpaid->count(),
            'paid_invoices' => $paid->count(),
            'pending_payout_total' => (float) $pendingOutgoing,
            'pending_collection_total' => (float) $pendingIncoming,
            'paid_total' => (float) $paid->sum('settlement_amount'),
            'role_totals' => [
                self::ROLE_SELLER => [
                    'count' => $records->where('role', self::ROLE_SELLER)->count(),
                    'open' => $unpaid->where('role', self::ROLE_SELLER)->count(),
                ],
                self::ROLE_CONFIRMATION => [
                    'count' => $records->where('role', self::ROLE_CONFIRMATION)->count(),
                    'open' => $unpaid->where('role', self::ROLE_CONFIRMATION)->count(),
                ],
                self::ROLE_DELIVERY => [
                    'count' => $records->where('role', self::ROLE_DELIVERY)->count(),
                    'open' => $unpaid->where('role', self::ROLE_DELIVERY)->count(),
                ],
            ],
        ];
    }

    private function resolveMonth(?string $month): Carbon
    {
        return $month
            ? Carbon::parse($month)->startOfMonth()
            : Carbon::now()->startOfMonth();
    }

    private function buildSellerPeriodsForMonth(Carbon $month, string $frequency): Collection
    {
        $cursor = $month->copy()->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();
        $periods = collect();

        while ($cursor->lte($monthEnd)) {
            [$periodStart, $periodEnd] = $this->resolveSellerPeriod($cursor, $frequency);
            $key = $periodStart->toDateString() . ':' . $periodEnd->toDateString();

            if (!$periods->has($key)) {
                $periods->put($key, [
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                ]);
            }

            $cursor->addDay();
        }

        return $periods->values();
    }

    private function resolveSellerPeriod(Carbon $date, string $frequency): array
    {
        $frequency = $frequency === 'twice_weekly' ? 'twice_weekly' : 'weekly';
        $weekStart = $date->copy()->startOfWeek(Carbon::MONDAY);

        if ($frequency === 'twice_weekly') {
            // Split the operating week into two settlement windows.
            if ($date->dayOfWeekIso <= 3) {
                return [$weekStart, $weekStart->copy()->addDays(2)];
            }

            return [$weekStart->copy()->addDays(3), $date->copy()->endOfWeek(Carbon::SUNDAY)];
        }

        return [$weekStart, $date->copy()->endOfWeek(Carbon::SUNDAY)];
    }

    private function frequencyLabel(string $frequency): string
    {
        return match ($frequency) {
            'twice_weekly' => 'Twice Weekly',
            'monthly' => 'Monthly',
            'daily' => 'Daily',
            default => 'Weekly',
        };
    }

    private function deliveryBillingTablesExist(): bool
    {
        return Schema::hasTable('delivery_person_billings')
            && Schema::hasTable('delivery_person_billing_order');
    }

    private function sellerBillingTablesExist(): bool
    {
        return Schema::hasTable('seller_billings')
            && Schema::hasTable('seller_billing_order');
    }

    private function generateCustomPeriodInvoice(array $filters): array
    {
        [$role, $entityId, $periodStart, $periodEnd] = $this->resolveCustomPeriodFilters($filters);

        DB::transaction(function () use ($role, $entityId, $periodStart, $periodEnd) {
            match ($role) {
                self::ROLE_SELLER => $this->generateCustomSellerInvoice($entityId, $periodStart, $periodEnd),
                self::ROLE_CONFIRMATION => $this->generateCustomConfirmationInvoice($entityId, $periodStart, $periodEnd),
                self::ROLE_DELIVERY => $this->generateCustomDeliveryInvoice($entityId, $periodStart, $periodEnd),
                default => abort(422, 'Unsupported billing role.'),
            };
        });

        return $this->getAdminDashboard($filters);
    }

    private function generateCustomSellerInvoice(int $vendorId, Carbon $periodStart, Carbon $periodEnd): void
    {
        abort_unless($this->sellerBillingTablesExist(), 503, 'Seller billing tables are not available.');

        $vendor = Vendor::query()->where('is_active', true)->findOrFail($vendorId);
        $billing = SellerBilling::firstOrCreate(
            [
                'vendor_id' => $vendor->id,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
            ],
            [
                'billing_frequency' => 'custom',
            ]
        );

        abort_if($billing->paid_at, 422, 'This invoice period has already been paid.');

        $this->recalculateSellerBilling($billing, $vendor, true);
    }

    private function generateCustomConfirmationInvoice(int $userId, Carbon $periodStart, Carbon $periodEnd): void
    {
        $agent = User::with('role')->findOrFail($userId);
        abort_unless($agent->isConfirmationAgent(), 422, 'Selected user is not a confirmation agent.');

        $billing = ConfirmationAgentBilling::firstOrCreate([
            'user_id' => $agent->id,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ]);

        abort_if($billing->paid_at, 422, 'This invoice period has already been paid.');

        $this->recalculateConfirmationBilling($billing, $agent, true);
    }

    private function generateCustomDeliveryInvoice(int $userId, Carbon $periodStart, Carbon $periodEnd): void
    {
        abort_unless($this->deliveryBillingTablesExist(), 503, 'Delivery billing tables are not available.');

        $person = User::with('role')->findOrFail($userId);
        abort_unless($person->isDeliveryPerson(), 422, 'Selected user is not a delivery person.');

        $deliveredOrders = $this->getEligibleOrdersForRole(self::ROLE_DELIVERY, $userId, $periodStart, $periodEnd);
        abort_if($deliveredOrders->isEmpty(), 422, 'No eligible delivered orders found for this period.');

        $billing = DeliveryPersonBilling::firstOrCreate([
            'delivery_person_id' => $person->id,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ]);

        abort_if($billing->paid_at, 422, 'This invoice period has already been paid.');

        $this->syncDeliveryBillingTotals($billing, $deliveredOrders, true);
    }

    private function resolveCustomPeriodFilters(array $filters): array
    {
        $role = $filters['role'] ?? null;
        abort_unless(in_array($role, [self::ROLE_SELLER, self::ROLE_CONFIRMATION, self::ROLE_DELIVERY], true), 422, 'A billing role is required.');

        $entityId = (int) ($filters['entity_id'] ?? 0);
        abort_unless($entityId > 0, 422, 'A user or seller must be selected.');

        $periodStart = Carbon::parse($filters['period_start'])->startOfDay();
        $periodEnd = Carbon::parse($filters['period_end'])->endOfDay();
        abort_if($periodEnd->lt($periodStart), 422, 'The end date must be after the start date.');

        return [$role, $entityId, $periodStart, $periodEnd];
    }

    private function getEligibleOrdersForRole(string $role, int $entityId, Carbon $periodStart, Carbon $periodEnd): EloquentCollection
    {
        $query = Order::query()
            ->with(['client', 'items.product', 'confirmationAgent'])
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$periodStart, $periodEnd]);

        return match ($role) {
            self::ROLE_SELLER => $query
                ->where('vendor_id', $entityId)
                ->where('seller_invoice_status', Order::INVOICE_NOT_INVOICED)
                ->get(),
            self::ROLE_CONFIRMATION => $query
                ->where('confirmation_agent_id', $entityId)
                ->where('confirmation_invoice_status', Order::INVOICE_NOT_INVOICED)
                ->get(),
            self::ROLE_DELIVERY => $query
                ->where('delivery_person_id', $entityId)
                ->where('delivery_invoice_status', Order::INVOICE_NOT_INVOICED)
                ->get(),
            default => new EloquentCollection(),
        };
    }

    private function mapPreviewOrder(Order $order, string $role): array
    {
        $commissionPerOrder = match ($role) {
            self::ROLE_CONFIRMATION => (float) ($order->confirmationAgent?->effective_commission_per_order ?? 0),
            self::ROLE_DELIVERY => (float) ($order->delivery_person_commission ?? 0),
            default => (float) ($order->commission_amount ?? 0),
        };

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'client_name' => Utf8Text::clean($order->client?->name ?? 'N/A'),
            'city' => Utf8Text::clean($order->city ?? $order->delivery_city ?? 'N/A'),
            'products' => $order->items->map(fn ($item) => [
                'name' => Utf8Text::clean($item->product_name ?? 'Product'),
                'quantity' => (int) ($item->quantity ?? 1),
                'unit_price' => (float) ($item->price ?? 0),
                'total_amount' => (float) ($item->subtotal ?? 0),
            ])->values(),
            'order_amount' => (float) ($order->total ?? 0),
            'commission' => $commissionPerOrder,
            'seller_invoice_status' => $order->seller_invoice_status,
            'confirmation_invoice_status' => $order->confirmation_invoice_status,
            'delivery_invoice_status' => $order->delivery_invoice_status,
        ];
    }

    private function buildPreviewSummary(EloquentCollection $orders, string $role): array
    {
        if ($role === self::ROLE_SELLER) {
            $fulfillmentCost = (float) Setting::get('order_fulfillment_cost', 10);
            $totalSales = 0.0;
            $totalProductCost = 0.0;
            $totalDeliveryCost = 0.0;
            $totalCodFees = 0.0;

            foreach ($orders as $order) {
                $orderTotal = (float) ($order->total ?? 0);
                $commission = (float) ($order->commission_amount ?? 0);
                $productCost = (float) $order->items->sum(function ($item) {
                    return (float) ($item->product?->getOrderCostAmount() ?? 0) * (float) ($item->quantity ?? 0);
                });
                $deliveryCost = (float) ($order->shipping_cost ?? 0) + $fulfillmentCost;
                $platformCodFee = max(0.0, $commission - $productCost - $deliveryCost);

                $totalSales += $orderTotal;
                $totalProductCost += $productCost;
                $totalDeliveryCost += $deliveryCost;
                $totalCodFees += $platformCodFee;
            }

            $totalDeductions = $totalProductCost + $totalDeliveryCost + $totalCodFees;
            $finalAmount = max(0, $totalSales - $totalDeductions);

            return [
                'total_orders' => $orders->count(),
                'total_sales' => $totalSales,
                'total_product_cost' => $totalProductCost,
                'total_delivery_cost' => $totalDeliveryCost,
                'total_cod_fees' => $totalCodFees,
                'total_earnings' => $finalAmount,
                'total_fees' => $totalDeductions,
                'final_amount' => $finalAmount,
            ];
        }

        if ($role === self::ROLE_CONFIRMATION) {
            $commissionPerOrder = $orders->isEmpty()
                ? 0.0
                : (float) ($orders->first()->confirmationAgent?->effective_commission_per_order ?? 0);

            return [
                'total_orders' => $orders->count(),
                'total_sales' => (float) $orders->sum(fn (Order $order) => (float) ($order->total ?? 0)),
                'total_earnings' => $orders->count() * $commissionPerOrder,
                'total_fees' => 0.0,
                'final_amount' => $orders->count() * $commissionPerOrder,
            ];
        }

        return [
            'total_orders' => $orders->count(),
            'total_sales' => (float) $orders->sum(fn (Order $order) => (float) ($order->collected_amount ?? $order->total ?? 0)),
            'total_earnings' => (float) $orders->sum(fn (Order $order) => (float) ($order->delivery_person_commission ?? 0)),
            'total_fees' => (float) $orders->sum(fn (Order $order) => (float) ($order->delivery_person_commission ?? 0)),
            'final_amount' => (float) $orders->sum(fn (Order $order) => (float) ($order->amount_due_to_admin ?? 0)),
        ];
    }

    private function finalizeInvoiceGeneration(string $role, SellerBilling|ConfirmationAgentBilling|DeliveryPersonBilling $billing, EloquentCollection|Collection $orders): void
    {
        if (!$billing->invoice_number) {
            $prefix = match ($role) {
                self::ROLE_SELLER => 'SLR',
                self::ROLE_CONFIRMATION => 'CNF',
                self::ROLE_DELIVERY => 'DLV',
                default => 'INV',
            };
            $billing->invoice_number = $this->invoicePdfService->generateInvoiceNumber($prefix);
        }

        $statusColumn = match ($role) {
            self::ROLE_SELLER => 'seller_invoice_status',
            self::ROLE_CONFIRMATION => 'confirmation_invoice_status',
            self::ROLE_DELIVERY => 'delivery_invoice_status',
            default => null,
        };

        if ($statusColumn && $orders->isNotEmpty()) {
            Order::whereIn('id', $orders->pluck('id'))->update([$statusColumn => Order::INVOICE_INVOICED]);
        }

        $billing->save();

        $pdfPath = $this->invoicePdfService->generateForBilling($role, $billing->id);
        $billing->update(['pdf_path' => $pdfPath]);
    }

    private function findBillingRecord(string $role, int $billingId): SellerBilling|ConfirmationAgentBilling|DeliveryPersonBilling
    {
        return match ($role) {
            self::ROLE_SELLER => SellerBilling::findOrFail($billingId),
            self::ROLE_CONFIRMATION => ConfirmationAgentBilling::findOrFail($billingId),
            self::ROLE_DELIVERY => DeliveryPersonBilling::findOrFail($billingId),
            default => abort(422, 'Unsupported billing role.'),
        };
    }
}
