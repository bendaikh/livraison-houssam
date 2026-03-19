<?php

namespace App\Http\Controllers;

use App\Services\BillingService;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(
        private BillingService $billingService
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'month' => 'nullable|date',
            'role' => 'nullable|in:seller,confirmation,delivery',
            'entity_id' => 'nullable|integer',
        ]);

        return response()->json(
            $this->billingService->getAdminDashboard(
                $this->scopeFiltersForViewer($request, $validated)
            )
        );
    }

    public function generate(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'month' => 'nullable|date',
            'role' => 'nullable|in:seller,confirmation,delivery',
            'entity_id' => 'nullable|integer',
        ]);

        return response()->json(
            $this->billingService->generate($validated)
        );
    }

    public function markPaid(Request $request, string $role, int $billingId)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        return response()->json(
            $this->billingService->markPaid($role, $billingId, $request->user(), $validated['notes'] ?? null)
        );
    }

    private function authorizeAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403, 'Only administrators can perform this action.');
        }
    }

    private function scopeFiltersForViewer(Request $request, array $filters): array
    {
        $user = $request->user();

        if ($user?->isAdmin()) {
            return $filters;
        }

        if ($user?->isDeliveryPerson()) {
            return [
                'month' => $filters['month'] ?? null,
                'role' => BillingService::ROLE_DELIVERY,
                'entity_id' => $user->id,
            ];
        }

        if ($user?->isConfirmationAgent()) {
            return [
                'month' => $filters['month'] ?? null,
                'role' => BillingService::ROLE_CONFIRMATION,
                'entity_id' => $user->id,
            ];
        }

        if ($user?->isVendor()) {
            return [
                'month' => $filters['month'] ?? null,
                'role' => BillingService::ROLE_SELLER,
                'entity_id' => $user->vendor?->id ?? -1,
            ];
        }

        abort(403, 'You do not have access to billing.');
    }
}
