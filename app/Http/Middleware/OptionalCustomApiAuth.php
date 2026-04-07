<?php

namespace App\Http\Middleware;

use App\Models\ApiIntegration;
use App\Models\Vendor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalCustomApiAuth
{
    /**
     * Handle an incoming request.
     * 
     * This middleware checks if the request has a custom API key (capi_*).
     * If yes, it authenticates using the custom API key.
     * If no, it lets the request continue (Sanctum will handle it).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);

        // Only intercept if it's a custom API key
        if ($token && str_starts_with($token, 'capi_')) {
            return $this->authenticateCustomApi($request, $token, $next);
        }

        // Otherwise, let it pass through (Sanctum will handle it)
        return $next($request);
    }

    /**
     * Authenticate using custom API key.
     */
    private function authenticateCustomApi(Request $request, string $token, Closure $next): Response
    {
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
        $request->attributes->set('auth_method', 'custom_api');
        $request->attributes->set('custom_api_authenticated', true);

        // If the integration is linked to a vendor, authenticate as that vendor's user
        // Otherwise, we'll need to set a dummy authenticated state for Sanctum
        if ($integration->vendor_id) {
            $vendor = Vendor::with('user')->find($integration->vendor_id);
            if ($vendor && $vendor->user) {
                // Set the authenticated user for all guards
                Auth::guard('sanctum')->setUser($vendor->user);
                Auth::setUser($vendor->user);
                $request->setUserResolver(function () use ($vendor) {
                    return $vendor->user;
                });
            }
        } else {
            // For integrations not linked to a vendor, we need to find a system user
            // or create a way for Sanctum to see this as authenticated
            // Let's find the first admin user as a fallback
            $adminUser = \App\Models\User::whereHas('role', function ($query) {
                $query->where('slug', 'admin');
            })->first();
            
            if ($adminUser) {
                Auth::guard('sanctum')->setUser($adminUser);
                Auth::setUser($adminUser);
                $request->setUserResolver(function () use ($adminUser) {
                    return $adminUser;
                });
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
