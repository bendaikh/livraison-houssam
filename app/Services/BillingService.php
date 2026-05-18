<?php

namespace App\Services;

use App\Models\ConfirmationAgentBilling;
use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\SellerBilling;
use App\Models\User;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BillingService
{
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

    public function generate(array $filters = []): array
    {
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
            ->whereDoesntHave('sellerBillings', function ($query) use ($billing) {
                $query->whereNotNull('seller_billings.paid_at')
                    ->where('seller_billings.id', '!=', $billing->id);
            })
            ->get(['id', 'total', 'commission_amount']);

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

        return $billing->fresh(['vendor', 'paidBy']);
    }

    private function recalculateConfirmationBilling(ConfirmationAgentBilling $billing, User $agent, bool $touchGeneratedAt): ConfirmationAgentBilling
    {
        $periodStart = Carbon::parse($billing->period_start)->startOfDay();
        $periodEnd = Carbon::parse($billing->period_end)->endOfDay();

        $deliveredOrderIds = Order::where('confirmation_agent_id', $agent->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$periodStart, $periodEnd])
            ->whereDoesntHave('confirmationBillings', function ($query) use ($billing) {
                $query->whereNotNull('confirmation_agent_billings.paid_at')
                    ->where('confirmation_agent_billings.id', '!=', $billing->id);
            })
            ->pluck('id');

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
            ->whereDoesntHave('deliveryPersonBillings', function ($query) use ($currentBillingId) {
                $query->whereNotNull('delivery_person_billings.paid_at');

                if ($currentBillingId) {
                    $query->where('delivery_person_billings.id', '!=', $currentBillingId);
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
}
