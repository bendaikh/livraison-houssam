<?php

namespace App\Http\Controllers;

use App\Models\ApiIntegration;
use App\Models\Vendor;
use App\Services\ApiIntegrationService;
use Illuminate\Http\Request;

class ApiIntegrationController extends Controller
{
    public function __construct(
        private ApiIntegrationService $apiIntegrationService
    ) {}

    public function index()
    {
        $user = auth()->user();
        
        $query = ApiIntegration::with(['importLogs' => function ($query) {
            $query->latest()->limit(5);
        }]);
        
        // If user is a vendor, only show Shopify / Google Sheet / Custom API integrations linked to them
        if ($user && $user->role && $user->role->slug === 'vendor') {
            $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
            
            if ($vendor) {
                // Vendors see their own integrations only.
                // Superadmin custom_api (vendor_id null) must stay separate from seller custom_api.
                $query->whereIn('type', ['shopify', 'google_sheet', 'custom_api'])
                      ->where(function ($q) use ($vendor) {
                          $q->where('vendor_id', $vendor->id)
                            ->orWhere(function ($shared) {
                                // Legacy shared shopify/sheets may be null-owned; never share custom_api
                                $shared->whereNull('vendor_id')
                                    ->whereIn('type', ['shopify', 'google_sheet']);
                            });
                      });
            } else {
                // If vendor profile not found, show only Shopify/Google Sheet/Custom API types
                $query->whereIn('type', ['shopify', 'google_sheet', 'custom_api'])
                      ->whereRaw('1 = 0');
            }
        }
        
        $integrations = $query->get();

        return response()->json($integrations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:shopify,delivery,google_sheet,custom_api',
            'provider' => 'nullable|in:shopify,tawsilex,bmdelivery,google_sheet,custom_api',
            'vendor_id' => 'nullable|exists:vendors,id',
            'is_active' => 'boolean',
            'credentials' => 'nullable|array',
            'settings' => 'nullable|array',
        ]);

        if (($validated['type'] ?? null) !== 'google_sheet' && ($validated['type'] ?? null) !== 'custom_api' && empty($validated['credentials'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'credentials' => ['The credentials field is required.'],
            ]);
        }

        $validated['credentials'] = $validated['credentials'] ?? [];

        $user = auth()->user();
        $isCustomApi = ($validated['type'] ?? null) === 'custom_api'
            || ($validated['provider'] ?? null) === 'custom_api';

        if ($isCustomApi) {
            // Superadmin custom API is system-owned (vendor_id null).
            // Seller custom API is always scoped to that seller.
            if ($user && $user->role?->slug === 'vendor') {
                $vendor = Vendor::where('user_id', $user->id)->first();
                if (!$vendor) {
                    return response()->json(['message' => 'Vendor profile not found'], 403);
                }
                $validated['vendor_id'] = $vendor->id;
            } else {
                $validated['vendor_id'] = null;
            }

            $existingQuery = ApiIntegration::where('provider', 'custom_api');
            if (!empty($validated['vendor_id'])) {
                $existingQuery->where('vendor_id', $validated['vendor_id']);
            } else {
                $existingQuery->whereNull('vendor_id');
            }

            if ($existingQuery->exists()) {
                return response()->json([
                    'message' => 'A Custom API integration already exists for this account.',
                ], 422);
            }
        } elseif (empty($validated['vendor_id'])) {
            if ($user && $user->role?->slug === 'vendor') {
                $vendor = Vendor::where('user_id', $user->id)->first();
                if ($vendor) {
                    $validated['vendor_id'] = $vendor->id;
                }
            }
        }

        $integration = ApiIntegration::create($validated);

        return response()->json($integration, 201);
    }

    public function show(ApiIntegration $apiIntegration)
    {
        return response()->json($apiIntegration->load('importLogs'));
    }

    public function update(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'type' => 'in:shopify,delivery,google_sheet,custom_api',
            'provider' => 'nullable|in:shopify,tawsilex,bmdelivery,google_sheet,custom_api',
            'vendor_id' => 'nullable|exists:vendors,id',
            'is_active' => 'boolean',
            'credentials' => 'nullable|array',
            'settings' => 'nullable|array',
        ]);

        $user = auth()->user();
        $isCustomApi = $apiIntegration->provider === 'custom_api'
            || ($validated['provider'] ?? null) === 'custom_api';

        if ($isCustomApi) {
            if ($user && $user->role?->slug === 'vendor') {
                $vendor = Vendor::where('user_id', $user->id)->first();
                if (!$vendor || (int) $apiIntegration->vendor_id !== (int) $vendor->id) {
                    return response()->json(['message' => 'Unauthorized to update this integration'], 403);
                }
                // Sellers cannot reassign ownership of their custom API
                $validated['vendor_id'] = $vendor->id;
            } else {
                // Superadmin/admin custom API stays system-owned (separate from sellers)
                if ($apiIntegration->vendor_id === null) {
                    $validated['vendor_id'] = null;
                }
            }
        } elseif (empty($validated['vendor_id'])) {
            if ($user && $user->role?->slug === 'vendor') {
                $vendor = Vendor::where('user_id', $user->id)->first();
                if ($vendor) {
                    $validated['vendor_id'] = $vendor->id;
                }
            }
        }

        $apiIntegration->update($validated);

        return response()->json($apiIntegration);
    }

    public function destroy(ApiIntegration $apiIntegration)
    {
        $user = auth()->user();

        if ($apiIntegration->provider === 'custom_api' && $user?->role?->slug === 'vendor') {
            $vendor = Vendor::where('user_id', $user->id)->first();
            if (!$vendor || (int) $apiIntegration->vendor_id !== (int) $vendor->id) {
                return response()->json(['message' => 'Unauthorized to delete this integration'], 403);
            }
        }

        $apiIntegration->delete();
        return response()->json(['message' => 'Integration deleted successfully']);
    }

    public function sync(Request $request, ApiIntegration $apiIntegration)
    {
        try {
            $connectionKey = $request->input('connection_key');

            $log = match($apiIntegration->type) {
                'shopify' => $this->apiIntegrationService->syncShopifyOrders($apiIntegration->id),
                'google_sheet' => $this->apiIntegrationService->syncGoogleSheetOrders(
                    $apiIntegration->id,
                    $connectionKey
                ),
                'delivery' => $this->apiIntegrationService->syncDeliveryCompanyOrders($apiIntegration->id),
                default => throw new \Exception('Invalid integration type')
            };

            return response()->json([
                'success' => true,
                'message' => 'Sync completed',
                'log' => $log,
                'connected_sheets' => $apiIntegration->type === 'google_sheet'
                    ? $this->apiIntegrationService->getConnectedGoogleSheets($apiIntegration->fresh())
                    : null,
            ]);
        } catch (\Exception $e) {
            \Log::error('Sync failed in ApiIntegrationController', [
                'integration_id' => $apiIntegration->id,
                'integration_type' => $apiIntegration->type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
            ], 500);
        }
    }

    public function logs(ApiIntegration $apiIntegration)
    {
        $logs = $apiIntegration->importLogs()->latest()->paginate(20);
        return response()->json($logs);
    }

    public function testConnection(ApiIntegration $apiIntegration)
    {
        try {
            \Log::info('Testing connection for integration', [
                'integration_id' => $apiIntegration->id,
                'type' => $apiIntegration->type,
                'is_active' => $apiIntegration->is_active,
            ]);

            $result = $this->apiIntegrationService->testConnection($apiIntegration->id);
            
            return response()->json([
                'success' => $result,
                'message' => $result ? 'Connection successful' : 'Connection failed',
            ]);
        } catch (\Exception $e) {
            \Log::error('Connection test failed', [
                'integration_id' => $apiIntegration->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
                'error_details' => $e->getMessage(),
            ], 500);
        }
    }

    public function getIntegrationDetails(ApiIntegration $apiIntegration)
    {
        // Return integration details for debugging (without sensitive data)
        $credentials = $apiIntegration->credentials;
        
        return response()->json([
            'id' => $apiIntegration->id,
            'name' => $apiIntegration->name,
            'type' => $apiIntegration->type,
            'provider' => $apiIntegration->provider,
            'is_active' => $apiIntegration->is_active,
            'last_sync_at' => $apiIntegration->last_sync_at,
            'credentials_present' => [
                'shop_url' => !empty($credentials['shop_url'] ?? ''),
                'access_token' => !empty($credentials['access_token'] ?? ''),
                'shop_url_value' => $credentials['shop_url'] ?? 'NOT SET',
            ],
        ]);
    }

    public function createShipment(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        try {
            $result = $this->apiIntegrationService->createDeliveryShipment(
                $validated['order_id'],
                $apiIntegration->id
            );

            return response()->json([
                'message' => 'Shipment created successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create shipment: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function trackShipment(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'tracking_code' => 'required|string',
        ]);

        try {
            $result = $this->apiIntegrationService->trackDeliveryShipment(
                $validated['tracking_code'],
                $apiIntegration->id
            );

            return response()->json([
                'message' => 'Tracking information retrieved',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to track shipment: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getCities(ApiIntegration $apiIntegration)
    {
        try {
            $result = $this->apiIntegrationService->getDeliveryCities($apiIntegration->id);

            return response()->json([
                'message' => 'Cities retrieved successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to get cities: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getStatuses(ApiIntegration $apiIntegration)
    {
        try {
            $result = $this->apiIntegrationService->getDeliveryStatuses($apiIntegration->id);

            return response()->json([
                'message' => 'Statuses retrieved successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to get statuses: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function listGoogleSheetTabs(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'sheet_url' => 'required|string',
        ]);

        try {
            $tabs = $this->apiIntegrationService->listGoogleSheetTabs($apiIntegration->id, $validated['sheet_url']);
            return response()->json([
                'message' => 'Tabs loaded',
                'data' => $tabs,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to load tabs: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function previewGoogleSheet(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'sheet_url' => 'required|string',
            'tab' => 'required|string',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        try {
            $preview = $this->apiIntegrationService->previewGoogleSheet(
                $apiIntegration->id,
                $validated['sheet_url'],
                $validated['tab'],
                $validated['limit'] ?? 100
            );
            return response()->json([
                'message' => 'Preview loaded',
                'data' => $preview,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to preview sheet: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function listGoogleSheetConnections(ApiIntegration $apiIntegration)
    {
        $token = $this->apiIntegrationService->ensureGoogleSheetSyncToken($apiIntegration->fresh());

        return response()->json([
            'data' => $this->apiIntegrationService->getConnectedGoogleSheets($apiIntegration->fresh()),
            'auto_sync' => (bool) (($apiIntegration->fresh()->settings['auto_sync'] ?? true)),
            'sync_token' => $token,
            'sync_webhook_url' => url('/api/webhooks/google-sheet/sync?token=' . urlencode($token)),
        ]);
    }

    public function storeGoogleSheetConnection(Request $request, ApiIntegration $apiIntegration)
    {
        $validated = $request->validate([
            'sheet_id' => 'required|string',
            'tab' => 'required|string',
            'sheet_name' => 'nullable|string',
            'sheet_url' => 'nullable|string',
        ]);

        try {
            $connection = $this->apiIntegrationService->addConnectedGoogleSheet($apiIntegration, $validated);

            return response()->json([
                'message' => 'Spreadsheet connected',
                'connection' => $connection,
                'connected_sheets' => $this->apiIntegrationService->getConnectedGoogleSheets($apiIntegration->fresh()),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroyGoogleSheetConnection(ApiIntegration $apiIntegration, string $connectionKey)
    {
        try {
            $decodedKey = urldecode($connectionKey);
            $this->apiIntegrationService->removeConnectedGoogleSheet($apiIntegration, $decodedKey);

            return response()->json([
                'message' => 'Spreadsheet disconnected',
                'connected_sheets' => $this->apiIntegrationService->getConnectedGoogleSheets($apiIntegration->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function generateCustomApiKey(Request $request)
    {
        $validated = $request->validate([
            'integration_id' => 'nullable|exists:api_integrations,id',
        ]);

        try {
            $user = auth()->user();
            $roleSlug = $user?->role?->slug;
            $isVendor = $roleSlug === 'vendor';
            $isAdmin = in_array($roleSlug, ['admin', 'superadmin'], true);
            
            // If integration_id is provided, find it, otherwise create new one
            if (!empty($validated['integration_id'])) {
                $integration = ApiIntegration::findOrFail($validated['integration_id']);

                if ($integration->provider !== 'custom_api') {
                    return response()->json([
                        'message' => 'Integration is not a Custom API integration',
                    ], 400);
                }
                
                // Vendors may only regenerate their own seller custom API key
                if ($isVendor) {
                    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
                    if (!$vendor || (int) $integration->vendor_id !== (int) $vendor->id) {
                        return response()->json([
                            'message' => 'Unauthorized to access this integration',
                        ], 403);
                    }
                }

                // Admins regenerating from the Custom API page should only touch the system key
                if ($isAdmin && $integration->vendor_id !== null) {
                    return response()->json([
                        'message' => 'Unauthorized to access this seller Custom API integration',
                    ], 403);
                }
            } else {
                // Find the caller's own custom_api integration (admin = null vendor_id, seller = their vendor_id)
                $query = ApiIntegration::where('provider', 'custom_api');
                
                if ($isVendor) {
                    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
                    if (!$vendor) {
                        return response()->json([
                            'message' => 'Vendor profile not found',
                        ], 403);
                    }
                    $query->where('vendor_id', $vendor->id);
                } else {
                    $query->whereNull('vendor_id');
                }
                
                $integration = $query->first();
                
                if (!$integration) {
                    return response()->json([
                        'message' => 'Please create a Custom API integration first',
                    ], 400);
                }
            }

            // Generate a secure random API key
            $apiKey = 'capi_' . bin2hex(random_bytes(32));

            // Update integration credentials with new API key
            $credentials = $integration->credentials ?? [];
            $credentials['api_key'] = $apiKey;
            $integration->credentials = $credentials;
            $integration->save();

            return response()->json($integration);
        } catch (\Exception $e) {
            \Log::error('Failed to generate API key', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to generate API key: ' . $e->getMessage(),
            ], 500);
        }
    }
}
