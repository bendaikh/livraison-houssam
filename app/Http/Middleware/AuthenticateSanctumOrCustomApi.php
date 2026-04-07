<?php

namespace App\Http\Middleware;

use App\Models\ApiIntegration;
use App\Models\Vendor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateSanctumOrCustomApi
{
    /**
     * Handle an incoming request.
     * 
     * This middleware allows authentication via either:
     * 1. Laravel Sanctum tokens (for internal app users)
     * 2. Custom API keys (for external integrations)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);

        // If no token provided at all, reject
        if (!$token) {
            return response()->json([
                'message' => 'Unauthenticated. Bearer token is required.',
            ], 401);
        }

        // Check if it's a custom API key (starts with 'capi_')
        if (str_starts_with($token, 'capi_')) {
            return $this->authenticateCustomApi($request, $token, $next);
        }

        // Otherwise, try Sanctum authentication
        return $this->authenticateSanctum($request, $next);
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
     * Authenticate using Laravel Sanctum.
     */
    private function authenticateSanctum(Request $request, Closure $next): Response
    {
        // Use Laravel's Sanctum authentication middleware
        $sanctumMiddleware = app(\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class);
        
        return $sanctumMiddleware->handle($request, function ($request) use ($next) {
            // Try to authenticate with Sanctum guard
            $user = auth('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            $request->attributes->set('auth_method', 'sanctum');
            return $next($request);
        });
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
