#!/usr/bin/env php
<?php

/**
 * Shopify Integration Troubleshooting Script
 * 
 * Run this script to diagnose issues with your Shopify integration
 * Usage: php troubleshoot_shopify.php
 */

define('LARAVEL_START', microtime(true));

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "\n";
echo "========================================\n";
echo "Shopify Integration Troubleshooting\n";
echo "========================================\n\n";

// Get all Shopify integrations
$integrations = \App\Models\ApiIntegration::where('type', 'shopify')->get();

if ($integrations->isEmpty()) {
    echo "❌ ERROR: No Shopify integrations found!\n";
    echo "   Please create a Shopify integration first.\n\n";
    exit(1);
}

echo "Found " . $integrations->count() . " Shopify integration(s)\n\n";

foreach ($integrations as $integration) {
    echo "─────────────────────────────────────────\n";
    echo "Integration ID: {$integration->id}\n";
    echo "Name: {$integration->name}\n";
    echo "Type: {$integration->type}\n";
    echo "Provider: " . ($integration->provider ?: 'Not set') . "\n";
    echo "Active: " . ($integration->is_active ? '✅ YES' : '❌ NO') . "\n";
    echo "Last Sync: " . ($integration->last_sync_at ? $integration->last_sync_at->format('Y-m-d H:i:s') : 'Never') . "\n";
    echo "\n";

    // Check credentials
    $credentials = $integration->credentials;
    echo "Credentials Check:\n";
    
    if (empty($credentials)) {
        echo "  ❌ No credentials configured\n";
        continue;
    }

    $shopUrl = $credentials['shop_url'] ?? '';
    $accessToken = $credentials['access_token'] ?? '';

    echo "  Shop URL: " . ($shopUrl ? "✅ Set ({$shopUrl})" : "❌ Not set") . "\n";
    echo "  Access Token: " . ($accessToken ? "✅ Set (length: " . strlen($accessToken) . ")" : "❌ Not set") . "\n";

    if (!$shopUrl || !$accessToken) {
        echo "\n  ⚠️  WARNING: Missing credentials. Skipping connection test.\n";
        continue;
    }

    // Validate shop URL format
    echo "\n  Shop URL Validation:\n";
    if (!str_contains($shopUrl, 'myshopify.com') && !str_contains($shopUrl, 'http')) {
        echo "    ❌ Invalid format (should be: yourstore.myshopify.com)\n";
    } else {
        echo "    ✅ Format looks good\n";
    }

    // Test connection
    echo "\n  Testing Shopify API Connection...\n";
    try {
        $shopifyService = new \App\Services\ShopifyService();
        $shopifyService->setCredentials($shopUrl, $accessToken);
        
        echo "    Fetching shop info...\n";
        $shopInfo = $shopifyService->getShopInfo();
        
        if (isset($shopInfo['shop'])) {
            echo "    ✅ Connection successful!\n";
            echo "    Shop Name: " . ($shopInfo['shop']['name'] ?? 'N/A') . "\n";
            echo "    Shop Domain: " . ($shopInfo['shop']['domain'] ?? 'N/A') . "\n";
            echo "    Shop Email: " . ($shopInfo['shop']['email'] ?? 'N/A') . "\n";
        } else {
            echo "    ⚠️  Connected but unexpected response format\n";
        }

        // Try to fetch orders
        echo "\n    Fetching recent orders (limit 5)...\n";
        $ordersResponse = $shopifyService->fetchOrders(['limit' => 5]);
        
        if (isset($ordersResponse['orders'])) {
            $orderCount = count($ordersResponse['orders']);
            echo "    ✅ Successfully fetched {$orderCount} orders\n";
            
            if ($orderCount > 0) {
                echo "    Sample Order IDs: ";
                $sampleIds = array_slice(array_column($ordersResponse['orders'], 'id'), 0, 3);
                echo implode(', ', $sampleIds) . "\n";
            } else {
                echo "    ℹ️  No orders found in your Shopify store\n";
            }
        } else {
            echo "    ⚠️  Unexpected orders response format\n";
        }

    } catch (\Exception $e) {
        echo "    ❌ Connection FAILED\n";
        echo "    Error: " . $e->getMessage() . "\n";
        echo "\n    Possible issues:\n";
        echo "    1. Invalid access token\n";
        echo "    2. Incorrect shop URL\n";
        echo "    3. Access token doesn't have 'read_orders' permission\n";
        echo "    4. Network/firewall blocking requests to Shopify\n";
        echo "    5. API rate limit exceeded\n";
    }

    echo "\n";
}

echo "─────────────────────────────────────────\n";
echo "\nTroubleshooting Summary:\n";
echo "✅ = Working correctly\n";
echo "❌ = Problem found\n";
echo "⚠️  = Warning\n";
echo "ℹ️  = Information\n";
echo "\n";

// Check database tables
echo "Database Check:\n";
try {
    $orderCount = \App\Models\Order::where('source', 'shopify')->count();
    echo "  Shopify orders in database: {$orderCount}\n";
    
    $importLogs = \App\Models\ApiImportLog::whereHas('apiIntegration', function($q) {
        $q->where('type', 'shopify');
    })->latest()->limit(5)->get();
    
    if ($importLogs->isNotEmpty()) {
        echo "\n  Recent import logs:\n";
        foreach ($importLogs as $log) {
            echo "    - {$log->created_at->format('Y-m-d H:i')}: ";
            echo "{$log->status} (Success: {$log->successful_records}, Failed: {$log->failed_records})\n";
            if ($log->message) {
                echo "      Message: {$log->message}\n";
            }
        }
    }
} catch (\Exception $e) {
    echo "  ❌ Database check failed: " . $e->getMessage() . "\n";
}

echo "\n";
echo "========================================\n";
echo "Troubleshooting Complete\n";
echo "========================================\n\n";

echo "If you see errors above, common solutions:\n\n";
echo "1. Invalid credentials:\n";
echo "   - Go to API Integrations page\n";
echo "   - Edit your Shopify integration\n";
echo "   - Verify Shop URL format: yourstore.myshopify.com\n";
echo "   - Generate new Access Token from Shopify Admin\n\n";

echo "2. Connection refused:\n";
echo "   - Check if your server can reach Shopify (firewall/network)\n";
echo "   - Verify SSL certificates are up to date\n";
echo "   - Check if Shopify is accessible from your server\n\n";

echo "3. Permission errors:\n";
echo "   - Ensure Access Token has 'read_orders' scope\n";
echo "   - May need 'write_orders' for order updates\n\n";

echo "For more help, check the logs at: storage/logs/laravel.log\n\n";
