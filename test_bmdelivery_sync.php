#!/usr/bin/env php
<?php

/**
 * Test BMDelivery Status Sync
 * 
 * This script tests the BMDelivery status synchronization functionality.
 * 
 * Usage:
 *   php test_bmdelivery_sync.php [order_id]
 */

require __DIR__.'/vendor/autoload.php';

use Illuminate\Support\Facades\Artisan;

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "\n=== BMDelivery Status Sync Test ===\n\n";

// Get order ID from command line or use latest order
$orderId = $argv[1] ?? null;

if (!$orderId) {
    echo "Finding latest order with delivery tracking...\n";
    $order = \App\Models\Order::whereNotNull('delivery_tracking_code')
        ->whereNotNull('delivery_integration_id')
        ->latest()
        ->first();
    
    if (!$order) {
        echo "❌ No orders found with delivery tracking.\n";
        echo "   Please create an order and send it to BMDelivery first.\n";
        exit(1);
    }
    
    $orderId = $order->id;
} else {
    $order = \App\Models\Order::find($orderId);
    
    if (!$order) {
        echo "❌ Order #{$orderId} not found.\n";
        exit(1);
    }
}

echo "Testing order #{$order->order_number} (ID: {$order->id})\n\n";

// Display current order info
echo "Current Order Status:\n";
echo "  - Order Status: {$order->status}\n";
echo "  - Delivery Status: " . ($order->delivery_status ?? 'N/A') . "\n";
echo "  - Tracking Code: " . ($order->delivery_tracking_code ?? 'N/A') . "\n";
echo "  - Delivery Company: " . ($order->deliveryIntegration?->name ?? 'N/A') . "\n";
echo "\n";

if (!$order->delivery_tracking_code) {
    echo "❌ Order does not have a tracking code.\n";
    echo "   Send the order to a delivery company first.\n";
    exit(1);
}

if (!$order->delivery_integration_id) {
    echo "❌ Order is not assigned to a delivery company.\n";
    exit(1);
}

$integration = $order->deliveryIntegration;

if (!$integration->is_active) {
    echo "❌ Delivery integration '{$integration->name}' is not active.\n";
    exit(1);
}

$apiToken = $integration->credentials['api_token'] 
    ?? $integration->credentials['apiToken'] 
    ?? $integration->credentials['token'] 
    ?? null;

if (!$apiToken) {
    echo "❌ No API token configured for '{$integration->name}'.\n";
    exit(1);
}

echo "🔄 Syncing status from {$integration->name}...\n\n";

try {
    // Test the sync
    if ($integration->provider === 'bmdelivery') {
        $bmService = new \App\Services\BMDeliveryService();
        $bmService->setApiToken($apiToken);
        
        echo "Fetching status from BMDelivery API...\n";
        $result = $bmService->syncOrderStatus($order);
        
        echo "✅ Sync completed successfully!\n\n";
        echo "Results:\n";
        echo "  - Status Changed: " . ($result['status_changed'] ? 'Yes' : 'No') . "\n";
        echo "  - Old Delivery Status: " . ($result['old_delivery_status'] ?? 'N/A') . "\n";
        echo "  - New Delivery Status: " . ($result['new_delivery_status']) . "\n";
        
        if ($result['status_changed']) {
            echo "\n";
            echo "📦 Delivery status updated! Checking if order status needs updating...\n";
            
            // Map delivery status to order status
            $orderService = app(\App\Services\OrderService::class);
            $statusMap = [
                'pending' => 'pending',
                'confirmed' => 'confirmed',
                'picked_up' => 'shipped',
                'in_transit' => 'shipped',
                'out_for_delivery' => 'shipped',
                'delivered' => 'delivered',
                'cancelled' => 'cancelled',
                'returned' => 'cancelled',
                'failed' => 'cancelled',
                'ramassage' => 'confirmed',
                'en attente' => 'confirmed',
                'en_attente' => 'confirmed',
                'en cours' => 'shipped',
                'en_cours' => 'shipped',
                'en route' => 'shipped',
                'en_route' => 'shipped',
                'livre' => 'delivered',
                'livré' => 'delivered',
                'execute' => 'delivered',
                'exécuté' => 'delivered',
                'annule' => 'cancelled',
                'annulé' => 'cancelled',
                'retour' => 'cancelled',
                'demande de retour' => 'cancelled',
                'demande_de_retour' => 'cancelled',
                'interesse' => 'confirmed',
                'intéressé' => 'confirmed',
            ];
            
            $newOrderStatus = $statusMap[strtolower($result['new_delivery_status'])] ?? null;
            
            if ($newOrderStatus && $newOrderStatus !== $order->status) {
                echo "  - Order Status: {$order->status} → {$newOrderStatus}\n";
                echo "\n";
                echo "🔄 Updating order status...\n";
                
                $orderService->updateOrderStatus(
                    $order->id,
                    $newOrderStatus,
                    "Status auto-synced from {$integration->name}: {$result['new_delivery_status']}"
                );
                
                echo "✅ Order status updated!\n";
            } else {
                echo "  - Order Status: {$order->status} (no change needed)\n";
            }
        }
        
        echo "\n";
        echo "Full API Response:\n";
        echo json_encode($result['shipment_details'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        echo "\n";
        
    } else {
        echo "⚠️  Provider '{$integration->provider}' is not BMDelivery.\n";
        echo "   This test script only supports BMDelivery.\n";
        exit(1);
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString();
    echo "\n";
    exit(1);
}

echo "\n=== Test Complete ===\n\n";

echo "Next steps:\n";
echo "1. Configure BMDelivery webhook (see BMDELIVERY_STATUS_SYNC_GUIDE.md)\n";
echo "2. Test the webhook with curl or Postman\n";
echo "3. Enable scheduled sync by setting up cron job\n";
echo "\n";
