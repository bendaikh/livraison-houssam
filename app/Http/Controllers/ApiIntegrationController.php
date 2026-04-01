<?php

namespace App\Http\Controllers;

use App\Models\ApiIntegration;
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
                // Show only e-commerce style integrations linked to this vendor or general ones
                $query->whereIn('type', ['shopify', 'google_sheet', 'custom_api'])
                      ->where(function ($q) use ($vendor) {
                          $q->where('vendor_id', $vendor->id)
                            ->orWhereNull('vendor_id');
                      });
            } else {
                // If vendor profile not found, show only Shopify/Google Sheet/Custom API types
                $query->whereIn('type', ['shopify', 'google_sheet', 'custom_api']);
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

        $apiIntegration->update($validated);

        return response()->json($apiIntegration);
    }

    public function destroy(ApiIntegration $apiIntegration)
    {
        $apiIntegration->delete();
        return response()->json(['message' => 'Integration deleted successfully']);
    }

    public function sync(ApiIntegration $apiIntegration)
    {
        try {
            $log = match($apiIntegration->type) {
                'shopify' => $this->apiIntegrationService->syncShopifyOrders($apiIntegration->id),
                'google_sheet' => $this->apiIntegrationService->syncGoogleSheetOrders($apiIntegration->id),
                'delivery' => $this->apiIntegrationService->syncDeliveryCompanyOrders($apiIntegration->id),
                default => throw new \Exception('Invalid integration type')
            };

            return response()->json([
                'success' => true,
                'message' => 'Sync completed',
                'log' => $log,
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

    public function generateCustomApiKey(Request $request)
    {
        $validated = $request->validate([
            'integration_id' => 'nullable|exists:api_integrations,id',
        ]);

        try {
            $user = auth()->user();
            
            // If integration_id is provided, find it, otherwise create new one
            if (!empty($validated['integration_id'])) {
                $integration = ApiIntegration::findOrFail($validated['integration_id']);
                
                // Check if user has permission to access this integration
                if ($integration->vendor_id && $user->role->slug === 'vendor') {
                    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
                    if (!$vendor || $integration->vendor_id !== $vendor->id) {
                        return response()->json([
                            'message' => 'Unauthorized to access this integration',
                        ], 403);
                    }
                }
            } else {
                // Find existing custom_api integration or create new one
                $query = ApiIntegration::where('provider', 'custom_api');
                
                if ($user->role->slug === 'vendor') {
                    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
                    if ($vendor) {
                        $query->where('vendor_id', $vendor->id);
                    }
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
