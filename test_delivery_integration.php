<?php

/**
 * Quick Test Script for Delivery Integration
 * 
 * This script tests the delivery integration functionality
 * Run with: php test_delivery_integration.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Artisan;
use App\Models\Order;
use App\Models\ApiIntegration;
use App\Services\OrderService;

echo "=== Delivery Integration Test Suite ===\n\n";

// Test 1: Check if migration ran successfully
echo "Test 1: Checking database schema...\n";
try {
    $order = Order::first();
    if ($order) {
        $hasNewFields = property_exists($order, 'delivery_integration_id') ||
                       array_key_exists('delivery_integration_id', $order->getAttributes());
        echo $hasNewFields ? "✓ New fields exist in orders table\n" : "✗ New fields missing\n";
    } else {
        echo "⚠ No orders found in database\n";
    }
} catch (\Exception $e) {
    echo "✗ Database check failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: Check if delivery integrations exist
echo "Test 2: Checking delivery integrations...\n";
try {
    $integrations = ApiIntegration::where('type', 'delivery')
        ->where('is_active', true)
        ->get();
    
    echo "Found " . $integrations->count() . " active delivery integration(s)\n";
    
    foreach ($integrations as $integration) {
        echo "  - " . $integration->name . " (" . $integration->provider . ")\n";
    }
    
    if ($integrations->count() === 0) {
        echo "⚠ No active delivery integrations found. Please add one in the admin panel.\n";
    } else {
        echo "✓ Delivery integrations configured\n";
    }
} catch (\Exception $e) {
    echo "✗ Integration check failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Check routes
echo "Test 3: Checking API routes...\n";
$requiredRoutes = [
    'api/orders/delivery-companies/available',
    'api/webhooks/bmdelivery/status-update',
    'api/webhooks/tawsilex/status-update',
];

foreach ($requiredRoutes as $route) {
    $exists = \Route::has($route);
    echo ($exists ? "✓" : "✗") . " Route: $route\n";
}

echo "\n";

// Test 4: Check OrderService method
echo "Test 4: Checking OrderService...\n";
try {
    $orderService = app(OrderService::class);
    $hasMethod = method_exists($orderService, 'updateOrderStatus');
    echo ($hasMethod ? "✓" : "✗") . " OrderService has updateOrderStatus method\n";
} catch (\Exception $e) {
    echo "✗ OrderService check failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 5: Check frontend build
echo "Test 5: Checking frontend build...\n";
$manifestPath = public_path('build/manifest.json');
if (file_exists($manifestPath)) {
    echo "✓ Frontend assets built successfully\n";
    
    $componentPath = resource_path('js/components/DeliveryCompanyModal.jsx');
    if (file_exists($componentPath)) {
        echo "✓ DeliveryCompanyModal component exists\n";
    } else {
        echo "✗ DeliveryCompanyModal component not found\n";
    }
} else {
    echo "✗ Frontend build not found. Run: npm run build\n";
}

echo "\n";

// Test Summary
echo "=== Test Summary ===\n";
echo "All basic checks completed.\n";
echo "If any tests failed, please review the implementation.\n\n";

echo "Next Steps:\n";
echo "1. Configure delivery integrations in the admin panel\n";
echo "2. Test the feature by confirming an order\n";
echo "3. Configure webhooks in delivery company dashboards\n";
echo "4. Test webhook reception with test data\n\n";

echo "For detailed documentation, see:\n";
echo "- IMPLEMENTATION_SUMMARY.md\n";
echo "- DELIVERY_INTEGRATION_GUIDE.md\n";
echo "- UI_CHANGES_GUIDE.md\n";
