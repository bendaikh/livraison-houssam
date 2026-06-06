<?php

namespace App\Http\Controllers;

use App\Models\ApiIntegration;
use App\Services\GoogleOAuthService;
use Illuminate\Http\Request;

class GoogleOAuthController extends Controller
{
    public function __construct(
        private GoogleOAuthService $googleOAuthService
    ) {}

    public function authorizationUrl(Request $request, ApiIntegration $apiIntegration)
    {
        $this->authorizeIntegration($request, $apiIntegration);

        return response()->json([
            'url' => $this->googleOAuthService->getAuthorizationUrl($apiIntegration->id),
        ]);
    }

    public function callback(Request $request)
    {
        $code = (string) $request->query('code', '');
        $stateRaw = (string) $request->query('state', '');
        $error = (string) $request->query('error', '');

        if ($error !== '') {
            return redirect($this->googleOAuthService->frontendRedirectUrl('error=' . urlencode($error)));
        }

        if ($code === '' || $stateRaw === '') {
            return redirect($this->googleOAuthService->frontendRedirectUrl('error=missing_code'));
        }

        $state = json_decode(base64_decode($stateRaw, true) ?: '', true);
        $integrationId = (int) ($state['integration_id'] ?? 0);

        if ($integrationId <= 0) {
            return redirect($this->googleOAuthService->frontendRedirectUrl('error=invalid_state'));
        }

        try {
            $this->googleOAuthService->handleCallback($code, $integrationId);

            return redirect($this->googleOAuthService->frontendRedirectUrl('connected=1'));
        } catch (\Throwable $e) {
            return redirect($this->googleOAuthService->frontendRedirectUrl('error=' . urlencode($e->getMessage())));
        }
    }

    public function spreadsheets(Request $request, ApiIntegration $apiIntegration)
    {
        $this->authorizeIntegration($request, $apiIntegration);

        return response()->json([
            'connected' => $this->googleOAuthService->isConnected($apiIntegration),
            'spreadsheets' => $this->googleOAuthService->listSpreadsheets($apiIntegration),
        ]);
    }

    public function disconnect(Request $request, ApiIntegration $apiIntegration)
    {
        $this->authorizeIntegration($request, $apiIntegration);

        $integration = $this->googleOAuthService->disconnect($apiIntegration);

        return response()->json([
            'message' => 'Google account disconnected.',
            'integration' => $integration,
        ]);
    }

    private function authorizeIntegration(Request $request, ApiIntegration $apiIntegration): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if ($apiIntegration->type !== 'google_sheet') {
            abort(404);
        }

        if ($user->isVendor()) {
            $vendor = $user->vendor;
            if (!$vendor || ($apiIntegration->vendor_id && (int) $apiIntegration->vendor_id !== (int) $vendor->id)) {
                abort(403);
            }
        }
    }
}
