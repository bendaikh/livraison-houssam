<?php

namespace App\Http\Middleware;

use App\Models\ApiIntegration;
use App\Models\Vendor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiOrSanctum
{
    /**
     * Handle an incoming request.
     * 
     * This middleware supports TWO authentication methods:
     * 1. Custom API keys (capi_*) for external integrations
     * 2. Laravel Sanctum tokens for internal app users
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);

        \Log::info('AuthenticateApiOrSanctum: Processing request', [
            'has_token' => !empty($token),
            'token_prefix' => $token ? substr($token, 0, 10) . '...' : null,
            'is_capi' => $token && str_starts_with($token, 'capi_'),
        ]);

        if (!$token) {
            return response()->json([
                'message' => 'Unauthenticated. Bearer token is required.',
            ], 401);
        }

        // Check if it's a custom API key
        if (str_starts_with($token, 'capi_')) {
            \Log::info('AuthenticateApiOrSanctum: Using custom API authentication');
            return $this->authenticateCustomApi($request, $token, $next);
        }

        // Otherwise, authenticate with Sanctum
        \Log::info('AuthenticateApiOrSanctum: Using Sanctum authentication');
        return $this->authenticateSanctum($request, $token, $next);
    }

    /**
     * Authenticate using custom API key.
     */
    private function authenticateCustomApi(Request $request, string $token, Closure $next): Response
    {
        \Log::info('Searching for custom API integration', ['token_prefix' => substr($token, 0, 15) . '...']);
        
        // Find the integration with this API key
        $integration = ApiIntegration::where('provider', 'custom_api')
            ->where('is_active', true)
            ->get()
            ->first(function ($integration) use ($token) {
                $credentials = $integration->credentials;
                return isset($credentials['api_key']) && $credentials['api_key'] === $token;
            });

        if (!$integration) {
            \Log::warning('Custom API key not found or inactive');
            return response()->json([
                'message' => 'Invalid or inactive API key.',
            ], 401);
        }

        \Log::info('Custom API integration found', [
            'integration_id' => $integration->id,
            'vendor_id' => $integration->vendor_id,
        ]);

        // Store integration info in request
        $request->attributes->set('api_integration', $integration);
        $request->attributes->set('api_integration_id', $integration->id);
        $request->attributes->set('api_vendor_id', $integration->vendor_id);
        $request->attributes->set('auth_method', 'custom_api');

        // If linked to a vendor, authenticate as that vendor's user
        if ($integration->vendor_id) {
            $vendor = Vendor::with('user')->find($integration->vendor_id);
            if ($vendor && $vendor->user) {
                \Log::info('Authenticating as vendor user', ['user_id' => $vendor->user->id]);
                Auth::setUser($vendor->user);
                $request->setUserResolver(fn() => $vendor->user);
            }
        } else {
            // For non-vendor integrations, use the first admin user
            $adminUser = \App\Models\User::whereHas('role', function ($query) {
                $query->where('slug', 'admin');
            })->orWhereHas('role', function ($query) {
                $query->where('slug', 'superadmin');
            })->first();
            
            if ($adminUser) {
                \Log::info('Authenticating as admin user', ['user_id' => $adminUser->id]);
                Auth::setUser($adminUser);
                $request->setUserResolver(fn() => $adminUser);
            } else {
                \Log::error('No admin user found for non-vendor integration');
            }
        }

        return $next($request);
    }

    /**
     * Authenticate using Sanctum token.
     */
    private function authenticateSanctum(Request $request, string $token, Closure $next): Response
    {
        // Find the Sanctum token
        $accessToken = PersonalAccessToken::findToken($token);

        if (!$accessToken) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Set the authenticated user
        $user = $accessToken->tokenable;
        Auth::setUser($user);
        $request->setUserResolver(fn() => $user);
        $request->attributes->set('auth_method', 'sanctum');

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
