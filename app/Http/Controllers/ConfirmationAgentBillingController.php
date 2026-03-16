<?php

namespace App\Http\Controllers;

use App\Models\ConfirmationAgentBilling;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConfirmationAgentBillingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user?->isAdmin() && !$user?->isConfirmationAgent()) {
            abort(403, 'You do not have access to confirmation billings.');
        }

        $month = $request->filled('month')
            ? Carbon::parse($request->month)->startOfMonth()
            : null;
        $userId = $user?->isConfirmationAgent()
            ? $user->id
            : ($request->filled('user_id') ? $request->integer('user_id') : null);

        $this->refreshUnpaidBillings($month, $userId);

        $query = ConfirmationAgentBilling::with(['user.role', 'paidBy'])->withCount('orders');

        if ($month) {
            $query->whereDate('period_start', $month->toDateString());
        }

        if ($user?->isConfirmationAgent()) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        return response()->json(
            $query->orderByDesc('period_start')->get()
        );
    }

    public function generate(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'month' => 'nullable|date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $month = isset($validated['month'])
            ? Carbon::parse($validated['month'])->startOfMonth()
            : Carbon::now()->startOfMonth();

        $periodStart = $month->copy()->startOfMonth();
        $periodEnd = $month->copy()->endOfMonth();

        $agents = User::with('role')
            ->where('is_active', true)
            ->when(isset($validated['user_id']), fn ($query) => $query->where('id', $validated['user_id']))
            ->get()
            ->filter(fn (User $agent) => $agent->isConfirmationAgent())
            ->values();

        $billings = DB::transaction(function () use ($agents, $periodStart, $periodEnd) {
            return $agents->map(function (User $agent) use ($periodStart, $periodEnd) {
                $billing = ConfirmationAgentBilling::firstOrCreate(
                    [
                        'user_id' => $agent->id,
                        'period_start' => $periodStart->toDateString(),
                        'period_end' => $periodEnd->toDateString(),
                    ]
                );

                if ($billing->paid_at) {
                    return $billing;
                }

                return $this->recalculateBilling($billing, $agent, true);
            });
        });

        return response()->json(
            ConfirmationAgentBilling::with(['user.role', 'paidBy'])
                ->withCount('orders')
                ->whereIn('id', $billings->pluck('id'))
                ->orderByDesc('period_start')
                ->get()
        );
    }

    public function markPaid(Request $request, ConfirmationAgentBilling $confirmationAgentBilling)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $confirmationAgentBilling->loadMissing('user.role');

        if (!$confirmationAgentBilling->paid_at && $confirmationAgentBilling->user?->isConfirmationAgent()) {
            $this->recalculateBilling($confirmationAgentBilling, $confirmationAgentBilling->user, false);
        }

        $confirmationAgentBilling->update([
            'paid_at' => now(),
            'paid_by_id' => $request->user()->id,
            'notes' => $validated['notes'] ?? $confirmationAgentBilling->notes,
        ]);

        return response()->json(
            $confirmationAgentBilling->fresh(['user.role', 'paidBy'])->loadCount('orders')
        );
    }

    private function authorizeAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403, 'Only administrators can perform this action.');
        }
    }

    private function refreshUnpaidBillings(?Carbon $month = null, ?int $userId = null): void
    {
        ConfirmationAgentBilling::with('user.role')
            ->whereNull('paid_at')
            ->when($month, fn ($query) => $query->whereDate('period_start', $month->toDateString()))
            ->when($userId, fn ($query) => $query->where('user_id', $userId))
            ->get()
            ->each(function (ConfirmationAgentBilling $billing) {
                if (!$billing->user?->isConfirmationAgent()) {
                    return;
                }

                $this->recalculateBilling($billing, $billing->user, false);
            });
    }

    private function recalculateBilling(ConfirmationAgentBilling $billing, User $agent, bool $touchGeneratedAt): ConfirmationAgentBilling
    {
        $deliveredOrderIds = Order::where('confirmation_agent_id', $agent->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$billing->period_start, $billing->period_end])
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
}
