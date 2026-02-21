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
        $integrations = ApiIntegration::with(['importLogs' => function ($query) {
            $query->latest()->limit(5);
        }])->get();

        return response()->json($integrations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:shopify,delivery',
            'provider' => 'nullable|in:shopify,tawsilex,bmdelivery',
            'is_active' => 'boolean',
            'credentials' => 'required|array',
            'settings' => 'nullable|array',
        ]);

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
            'type' => 'in:shopify,delivery',
            'provider' => 'nullable|in:shopify,tawsilex,bmdelivery',
            'is_active' => 'boolean',
            'credentials' => 'array',
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
}
