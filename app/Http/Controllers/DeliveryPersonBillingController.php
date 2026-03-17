<?php

namespace App\Http\Controllers;

use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeliveryPersonBillingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user?->isAdmin() && !$user?->isDeliveryPerson()) {
            abort(403, 'You do not have access to delivery billings.');
        }

        if (!$this->deliveryBillingTablesExist()) {
            return response()->json([]);
        }

        $month = $request->filled('month')
            ? Carbon::parse($request->month)->startOfMonth()
            : null;
        $deliveryPersonId = $user?->isDeliveryPerson()
            ? $user->id
            : ($request->filled('delivery_person_id') ? $request->integer('delivery_person_id') : null);

        $this->refreshUnpaidBillings($month, $deliveryPersonId);

        $query = DeliveryPersonBilling::with($this->billingRelations())->withCount('orders');
        $query->where('total_orders', '>', 0);

        if ($month) {
            $query->whereBetween('period_start', [
                $month->copy()->startOfMonth()->toDateString(),
                $month->copy()->endOfMonth()->toDateString(),
            ]);
        }

        if ($user?->isDeliveryPerson()) {
            $query->where('delivery_person_id', $user->id);
        } elseif ($request->filled('delivery_person_id')) {
            $query->where('delivery_person_id', $request->integer('delivery_person_id'));
        }

        return response()->json(
            $query->orderByDesc('period_start')->get()
        );
    }

    public function generate(Request $request)
    {
        $this->authorizeAdmin($request);

        if (!$this->deliveryBillingTablesExist()) {
            return response()->json([
                'message' => 'Delivery billing database tables are not migrated yet.',
            ], 503);
        }

        $validated = $request->validate([
            'date' => 'nullable|date',
            'month' => 'nullable|date',
            'delivery_person_id' => 'nullable|exists:users,id',
        ]);

        $billings = collect();

        if (!empty($validated['month'])) {
            $cursor = Carbon::parse($validated['month'])->startOfMonth();
            $monthEnd = Carbon::parse($validated['month'])->endOfMonth();

            while ($cursor->lte($monthEnd)) {
                $billings = $billings->merge(
                    $this->generateDailyBillings($cursor->copy(), $validated['delivery_person_id'] ?? null, true)
                );
                $cursor->addDay();
            }
        } else {
            $date = isset($validated['date'])
                ? Carbon::parse($validated['date'])->startOfDay()
                : Carbon::yesterday()->startOfDay();

            $billings = $this->generateDailyBillings($date, $validated['delivery_person_id'] ?? null, true);
        }

        return response()->json(
            DeliveryPersonBilling::with($this->billingRelations())
                ->withCount('orders')
                ->whereIn('id', $billings->pluck('id')->unique())
                ->orderByDesc('period_start')
                ->get()
        );
    }

    public function markPaid(Request $request, DeliveryPersonBilling $deliveryPersonBilling)
    {
        $this->authorizeAdmin($request);

        if (!$this->deliveryBillingTablesExist()) {
            return response()->json([
                'message' => 'Delivery billing database tables are not migrated yet.',
            ], 503);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $deliveryPersonBilling->loadMissing('deliveryPerson.role');

        if (!$deliveryPersonBilling->paid_at && $deliveryPersonBilling->deliveryPerson?->isDeliveryPerson()) {
            $deliveryPersonBilling = $this->recalculateBilling($deliveryPersonBilling, $deliveryPersonBilling->deliveryPerson, false);
        }

        if (!$deliveryPersonBilling || (int) $deliveryPersonBilling->total_orders === 0) {
            abort(422, 'Cannot mark an empty delivery invoice as paid.');
        }

        $deliveryPersonBilling->update([
            'paid_at' => now(),
            'paid_by_id' => $request->user()->id,
            'notes' => $validated['notes'] ?? $deliveryPersonBilling->notes,
        ]);

        return response()->json(
            $deliveryPersonBilling->fresh($this->billingRelations())->loadCount('orders')
        );
    }

    public function generateDailyBillings(Carbon $date, ?int $deliveryPersonId = null, bool $touchGeneratedAt = true)
    {
        $periodStart = $date->copy()->startOfDay();
        $periodEnd = $date->copy()->endOfDay();

        $people = User::with('role')
            ->where('is_active', true)
            ->when($deliveryPersonId, fn ($query) => $query->where('id', $deliveryPersonId))
            ->get()
            ->filter(fn (User $person) => $person->isDeliveryPerson())
            ->values();

        return DB::transaction(function () use ($people, $periodStart, $periodEnd, $touchGeneratedAt) {
            return $people
                ->map(function (User $person) use ($periodStart, $periodEnd, $touchGeneratedAt) {
                    $deliveredOrders = $this->getDeliveredOrdersForBilling($person, $periodStart, $periodEnd);
                    $billing = DeliveryPersonBilling::where([
                        'delivery_person_id' => $person->id,
                        'period_start' => $periodStart->toDateString(),
                        'period_end' => $periodEnd->toDateString(),
                    ])->first();

                    if ($billing?->paid_at) {
                        return $this->hasBillingData($billing)
                            ? $billing->fresh($this->billingRelations())
                            : null;
                    }

                    if ($deliveredOrders->isEmpty()) {
                        $this->deleteEmptyBilling($billing);
                        return null;
                    }

                    $billing ??= DeliveryPersonBilling::create([
                        'delivery_person_id' => $person->id,
                        'period_start' => $periodStart->toDateString(),
                        'period_end' => $periodEnd->toDateString(),
                    ]);

                    return $this->syncBillingTotals($billing, $deliveredOrders, $touchGeneratedAt);
                })
                ->filter()
                ->values();
        });
    }

    private function authorizeAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403, 'Only administrators can perform this action.');
        }
    }

    private function deliveryBillingTablesExist(): bool
    {
        return Schema::hasTable('delivery_person_billings')
            && Schema::hasTable('delivery_person_billing_order');
    }

    private function refreshUnpaidBillings(?Carbon $month = null, ?int $deliveryPersonId = null): void
    {
        DeliveryPersonBilling::with('deliveryPerson.role')
            ->whereNull('paid_at')
            ->where(function ($query) {
                $query->where('total_orders', '>', 0)
                    ->orWhere('total_collected', '>', 0)
                    ->orWhere('total_commission', '>', 0)
                    ->orWhere('total_due_to_admin', '>', 0);
            })
            ->when($month, function ($query) use ($month) {
                $query->whereBetween('period_start', [
                    $month->copy()->startOfMonth()->toDateString(),
                    $month->copy()->endOfMonth()->toDateString(),
                ]);
            })
            ->when($deliveryPersonId, fn ($query) => $query->where('delivery_person_id', $deliveryPersonId))
            ->get()
            ->each(function (DeliveryPersonBilling $billing) {
                if (!$billing->deliveryPerson?->isDeliveryPerson()) {
                    return;
                }

                $this->recalculateBilling($billing, $billing->deliveryPerson, false);
            });

        DeliveryPersonBilling::query()
            ->whereNull('paid_at')
            ->where('total_orders', 0)
            ->when($month, function ($query) use ($month) {
                $query->whereBetween('period_start', [
                    $month->copy()->startOfMonth()->toDateString(),
                    $month->copy()->endOfMonth()->toDateString(),
                ]);
            })
            ->when($deliveryPersonId, fn ($query) => $query->where('delivery_person_id', $deliveryPersonId))
            ->get()
            ->each(fn (DeliveryPersonBilling $billing) => $this->deleteEmptyBilling($billing));
    }

    private function recalculateBilling(DeliveryPersonBilling $billing, User $deliveryPerson, bool $touchGeneratedAt): ?DeliveryPersonBilling
    {
        $periodStart = Carbon::parse($billing->period_start)->startOfDay();
        $periodEnd = Carbon::parse($billing->period_end)->endOfDay();
        $deliveredOrders = $this->getDeliveredOrdersForBilling($deliveryPerson, $periodStart, $periodEnd, $billing->id);

        if ($deliveredOrders->isEmpty()) {
            $this->deleteEmptyBilling($billing);
            return null;
        }

        return $this->syncBillingTotals($billing, $deliveredOrders, $touchGeneratedAt);
    }

    private function getDeliveredOrdersForBilling(
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
            ->get([
                'id',
                'collected_amount',
                'delivery_person_commission',
                'amount_due_to_admin',
            ]);
    }

    private function syncBillingTotals(
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

        return $billing->fresh($this->billingRelations());
    }

    private function deleteEmptyBilling(?DeliveryPersonBilling $billing): void
    {
        if (!$billing || $billing->paid_at) {
            return;
        }

        $billing->orders()->sync([]);
        $billing->delete();
    }

    private function hasBillingData(DeliveryPersonBilling $billing): bool
    {
        return (int) $billing->total_orders > 0;
    }

    private function billingRelations(): array
    {
        return [
            'deliveryPerson.role',
            'paidBy',
            'orders' => function ($query) {
                $query
                    ->select([
                        'orders.id',
                        'orders.order_number',
                        'orders.client_id',
                        'orders.confirmation_agent_id',
                        'orders.status',
                        'orders.delivery_status_note',
                        'orders.collected_amount',
                        'orders.delivery_person_commission',
                        'orders.amount_due_to_admin',
                        'orders.delivered_at',
                    ])
                    ->with([
                        'client:id,name,phone',
                        'confirmationAgent:id,name',
                    ])
                    ->orderByDesc('orders.delivered_at');
            },
        ];
    }
}
