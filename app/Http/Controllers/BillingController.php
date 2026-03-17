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
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'month' => 'nullable|date',
            'role' => 'nullable|in:seller,confirmation,delivery',
            'entity_id' => 'nullable|integer',
        ]);

        return response()->json(
            $this->billingService->getAdminDashboard($validated)
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
}
