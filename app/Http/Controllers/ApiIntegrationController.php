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
                'message' => 'Sync completed',
                'log' => $log,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sync failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function logs(ApiIntegration $apiIntegration)
    {
        $logs = $apiIntegration->importLogs()->latest()->paginate(20);
        return response()->json($logs);
    }
}
