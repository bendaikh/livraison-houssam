<?php

namespace App\Http\Middleware;

use App\Models\ApiIntegration;
use App\Models\Vendor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateCustomApi
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);

        if (!$token) {
            return response()->json([
                'message' => 'Unauthenticated. API key is required.',
                'debug' => [
                    'authorization_header' => $request->header('Authorization'),
                    'expected_format' => 'Bearer capi_...',
                ]
            ], 401);
        }

        // Only validate custom API keys (those starting with 'capi_')
        if (!str_starts_with($token, 'capi_')) {
            return response()->json([
                'message' => 'Invalid API key format. Custom API keys must start with "capi_".',
            ], 401);
        }

        // Find the integration with this API key
        $integration = ApiIntegration::where('provider', 'custom_api')
            ->where('is_active', true)
            ->get()
            ->first(function ($integration) use ($token) {
                $credentials = $integration->credentials;
                return isset($credentials['api_key']) && $credentials['api_key'] === $token;
            });

        if (!$integration) {
            return response()->json([
                'message' => 'Invalid or inactive API key.',
            ], 401);
        }

        // Store integration info in request for use in controllers
        $request->attributes->set('api_integration', $integration);
        $request->attributes->set('api_integration_id', $integration->id);
        $request->attributes->set('api_vendor_id', $integration->vendor_id);

        // If the integration is linked to a vendor, authenticate as that vendor's user
        if ($integration->vendor_id) {
            $vendor = Vendor::with('user')->find($integration->vendor_id);
            if ($vendor && $vendor->user) {
                auth()->setUser($vendor->user);
            }
        }

        return $next($request);
    }

    /**
     * Extract the Bearer token from the request.
     */
    private function extractToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');

        if (preg_match('/Bearer\s+(.+)$/i', $header, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }
}
