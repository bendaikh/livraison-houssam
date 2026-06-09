<?php

namespace App\Http\Controllers;

use App\Services\BillingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

    public function preview(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'role' => 'required|in:seller,confirmation,delivery',
            'entity_id' => 'required|integer',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        return response()->json($this->billingService->preview($validated));
    }

    public function generate(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'month' => 'nullable|date',
            'role' => 'nullable|in:seller,confirmation,delivery',
            'entity_id' => 'nullable|integer',
            'period_start' => 'nullable|date|required_with:period_end',
            'period_end' => 'nullable|date|after_or_equal:period_start|required_with:period_start',
        ]);

        return response()->json(
            $this->billingService->generate($validated)
        );
    }

    public function downloadPdf(Request $request, string $role, int $billingId)
    {
        $this->authorizeBillingAccess($request, $role, $billingId);

        $result = $this->billingService->downloadPdf($role, $billingId);
        $absolutePath = Storage::disk('public')->path($result['pdf_path']);

        return response()->download(
            $absolutePath,
            ($result['invoice_number'] ?? 'invoice') . '.pdf',
            ['Content-Type' => 'application/pdf']
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

    private function authorizeBillingAccess(Request $request, string $role, int $billingId): void
    {
        $user = $request->user();

        if ($user?->isAdmin()) {
            return;
        }

        if ($user?->isDeliveryPerson() && $role === BillingService::ROLE_DELIVERY) {
            abort_unless(
                \App\Models\DeliveryPersonBilling::where('id', $billingId)
                    ->where('delivery_person_id', $user->id)
                    ->exists(),
                403
            );

            return;
        }

        if ($user?->isConfirmationAgent() && $role === BillingService::ROLE_CONFIRMATION) {
            abort_unless(
                \App\Models\ConfirmationAgentBilling::where('id', $billingId)
                    ->where('user_id', $user->id)
                    ->exists(),
                403
            );

            return;
        }

        if ($user?->isVendor() && $role === BillingService::ROLE_SELLER) {
            $vendorId = $user->vendor?->id;
            abort_unless(
                $vendorId && \App\Models\SellerBilling::where('id', $billingId)
                    ->where('vendor_id', $vendorId)
                    ->exists(),
                403
            );

            return;
        }

        abort(403, 'You do not have access to this invoice.');
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
