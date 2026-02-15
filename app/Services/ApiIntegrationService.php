<?php

namespace App\Services;

use App\Models\ApiIntegration;
use App\Models\ApiImportLog;
use App\Models\Order;
use App\Models\Client;
use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ApiIntegrationService
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function syncShopifyOrders(int $integrationId)
    {
        $integration = ApiIntegration::findOrFail($integrationId);
        
        if (!$integration->is_active) {
            throw new \Exception('Integration is not active');
        }

        $log = ApiImportLog::create([
            'api_integration_id' => $integrationId,
            'status' => 'failed',
            'total_records' => 0,
            'successful_records' => 0,
            'failed_records' => 0,
        ]);

        try {
            $credentials = $integration->credentials;
            $shopUrl = $credentials['shop_url'] ?? '';
            $accessToken = $credentials['access_token'] ?? '';

            if (!$shopUrl || !$accessToken) {
                throw new \Exception('Missing Shopify credentials');
            }

            // Fetch orders from Shopify API
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $accessToken,
            ])->get("{$shopUrl}/admin/api/2024-01/orders.json", [
                'status' => 'any',
                'limit' => 250,
                'updated_at_min' => $integration->last_sync_at ?? now()->subDays(7),
            ]);

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch orders from Shopify: ' . $response->body());
            }

            $shopifyOrders = $response->json()['orders'] ?? [];
            $log->update(['total_records' => count($shopifyOrders)]);

            $errors = [];
            $successful = 0;
            $failed = 0;

            foreach ($shopifyOrders as $shopifyOrder) {
                try {
                    $this->importShopifyOrder($shopifyOrder);
                    $successful++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = [
                        'order_id' => $shopifyOrder['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ];
                    Log::error('Failed to import Shopify order', [
                        'order' => $shopifyOrder,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $log->update([
                'status' => $failed === 0 ? 'success' : ($successful > 0 ? 'partial' : 'failed'),
                'successful_records' => $successful,
                'failed_records' => $failed,
                'errors' => $errors,
                'message' => "Imported {$successful} orders, {$failed} failed",
            ]);

            $integration->update(['last_sync_at' => now()]);

            return $log;
        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function importShopifyOrder(array $shopifyOrder)
    {
        // Check if order already exists
        $existingOrder = Order::where('external_order_id', $shopifyOrder['id'])
            ->where('source', 'shopify')
            ->first();

        if ($existingOrder) {
            return $existingOrder;
        }

        // Get or create client
        $customer = $shopifyOrder['customer'] ?? [];
        $client = $this->getOrCreateClient([
            'name' => ($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? ''),
            'email' => $customer['email'] ?? null,
            'phone' => $customer['phone'] ?? $shopifyOrder['phone'] ?? null,
            'address' => $shopifyOrder['shipping_address']['address1'] ?? null,
            'city' => $shopifyOrder['shipping_address']['city'] ?? null,
            'state' => $shopifyOrder['shipping_address']['province'] ?? null,
            'postal_code' => $shopifyOrder['shipping_address']['zip'] ?? null,
        ]);

        // Prepare order items
        $items = [];
        foreach ($shopifyOrder['line_items'] ?? [] as $lineItem) {
            $product = $this->getOrCreateProduct($lineItem);
            
            $items[] = [
                'product_id' => $product->id,
                'quantity' => $lineItem['quantity'],
                'price' => $lineItem['price'],
            ];
        }

        // Map Shopify status to our status
        $status = match($shopifyOrder['financial_status'] ?? 'pending') {
            'paid' => 'confirmed',
            'refunded' => 'cancelled',
            'pending' => 'pending',
            default => 'pending'
        };

        // Create order
        return $this->orderService->createOrder([
            'client_id' => $client->id,
            'source' => 'shopify',
            'external_order_id' => $shopifyOrder['id'],
            'status' => $status,
            'items' => $items,
            'shipping_cost' => $shopifyOrder['total_shipping_price_set']['shop_money']['amount'] ?? 0,
            'tax' => $shopifyOrder['total_tax'] ?? 0,
            'discount' => $shopifyOrder['total_discounts'] ?? 0,
            'shipping_address' => json_encode($shopifyOrder['shipping_address'] ?? []),
            'notes' => $shopifyOrder['note'] ?? null,
        ]);
    }

    public function syncDeliveryCompanyOrders(int $integrationId)
    {
        $integration = ApiIntegration::findOrFail($integrationId);
        
        if (!$integration->is_active) {
            throw new \Exception('Integration is not active');
        }

        $log = ApiImportLog::create([
            'api_integration_id' => $integrationId,
            'status' => 'failed',
            'total_records' => 0,
            'successful_records' => 0,
            'failed_records' => 0,
        ]);

        try {
            $credentials = $integration->credentials;
            $apiUrl = $credentials['api_url'] ?? '';
            $apiKey = $credentials['api_key'] ?? '';

            if (!$apiUrl || !$apiKey) {
                throw new \Exception('Missing delivery company credentials');
            }

            // This is a placeholder - each delivery company will have different API
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
            ])->get("{$apiUrl}/orders");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch orders from delivery company');
            }

            $orders = $response->json()['data'] ?? [];
            $log->update(['total_records' => count($orders)]);

            $errors = [];
            $successful = 0;
            $failed = 0;

            foreach ($orders as $deliveryOrder) {
                try {
                    $this->importDeliveryCompanyOrder($deliveryOrder);
                    $successful++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = [
                        'order_id' => $deliveryOrder['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ];
                }
            }

            $log->update([
                'status' => $failed === 0 ? 'success' : ($successful > 0 ? 'partial' : 'failed'),
                'successful_records' => $successful,
                'failed_records' => $failed,
                'errors' => $errors,
                'message' => "Imported {$successful} orders, {$failed} failed",
            ]);

            $integration->update(['last_sync_at' => now()]);

            return $log;
        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function importDeliveryCompanyOrder(array $deliveryOrder)
    {
        // Check if order already exists
        $existingOrder = Order::where('external_order_id', $deliveryOrder['id'])
            ->where('source', 'delivery_company')
            ->first();

        if ($existingOrder) {
            return $existingOrder;
        }

        // Implementation depends on delivery company API structure
        // This is a placeholder
        $client = $this->getOrCreateClient([
            'name' => $deliveryOrder['customer_name'],
            'phone' => $deliveryOrder['customer_phone'],
            'address' => $deliveryOrder['delivery_address'],
        ]);

        return $this->orderService->createOrder([
            'client_id' => $client->id,
            'source' => 'delivery_company',
            'external_order_id' => $deliveryOrder['id'],
            'status' => 'pending',
            'items' => [], // Parse from delivery order
            'shipping_address' => $deliveryOrder['delivery_address'] ?? null,
        ]);
    }

    private function getOrCreateClient(array $data)
    {
        // Try to find existing client by phone or email
        $client = Client::where('phone', $data['phone'])
            ->orWhere('email', $data['email'])
            ->first();

        if (!$client) {
            $client = Client::create($data);
        }

        return $client;
    }

    private function getOrCreateProduct(array $lineItem)
    {
        // Try to find product by SKU or create a new one
        $sku = $lineItem['sku'] ?? 'SHOP-' . $lineItem['product_id'];
        
        $product = Product::where('sku', $sku)->first();

        if (!$product) {
            $product = Product::create([
                'name' => $lineItem['name'],
                'sku' => $sku,
                'price' => $lineItem['price'],
                'stock_quantity' => 0,
                'is_active' => true,
            ]);
        }

        return $product;
    }
}
