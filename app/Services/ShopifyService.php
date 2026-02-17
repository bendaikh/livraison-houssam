<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Client;
use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ShopifyService
{
    private string $shopUrl;
    private string $accessToken;
    private string $apiVersion = '2024-01';

    public function __construct(?string $shopUrl = null, ?string $accessToken = null)
    {
        $this->shopUrl = $shopUrl ?? '';
        $this->accessToken = $accessToken ?? '';
    }

    /**
     * Set Shopify credentials
     */
    public function setCredentials(string $shopUrl, string $accessToken): self
    {
        $this->shopUrl = rtrim($shopUrl, '/');
        $this->accessToken = $accessToken;
        return $this;
    }

    /**
     * Set API version
     */
    public function setApiVersion(string $version): self
    {
        $this->apiVersion = $version;
        return $this;
    }

    /**
     * Fetch orders from Shopify
     * 
     * @param array $params Query parameters
     * @return array Orders data
     * @throws \Exception
     */
    public function fetchOrders(array $params = []): array
    {
        $this->validateCredentials();

        $defaultParams = [
            'status' => 'any',
            'limit' => 250,
        ];

        $params = array_merge($defaultParams, $params);

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->get("{$this->shopUrl}/admin/api/{$this->apiVersion}/orders.json", $params);

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch orders from Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify fetchOrders error', [
                'error' => $e->getMessage(),
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * Fetch a single order by ID
     * 
     * @param string $orderId Shopify order ID
     * @return array Order data
     * @throws \Exception
     */
    public function fetchOrder(string $orderId): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->get("{$this->shopUrl}/admin/api/{$this->apiVersion}/orders/{$orderId}.json");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch order from Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify fetchOrder error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
            ]);
            throw $e;
        }
    }

    /**
     * Update order status in Shopify
     * 
     * @param string $orderId Shopify order ID
     * @param array $data Update data
     * @return array Updated order data
     * @throws \Exception
     */
    public function updateOrder(string $orderId, array $data): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->put("{$this->shopUrl}/admin/api/{$this->apiVersion}/orders/{$orderId}.json", [
                'order' => $data,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Failed to update order in Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify updateOrder error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
                'data' => $data,
            ]);
            throw $e;
        }
    }

    /**
     * Create a fulfillment for an order
     * 
     * @param string $orderId Shopify order ID
     * @param array $data Fulfillment data
     * @return array Fulfillment data
     * @throws \Exception
     */
    public function createFulfillment(string $orderId, array $data): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("{$this->shopUrl}/admin/api/{$this->apiVersion}/orders/{$orderId}/fulfillments.json", [
                'fulfillment' => $data,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Failed to create fulfillment in Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify createFulfillment error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
                'data' => $data,
            ]);
            throw $e;
        }
    }

    /**
     * Update fulfillment tracking
     * 
     * @param string $orderId Shopify order ID
     * @param string $fulfillmentId Fulfillment ID
     * @param array $trackingInfo Tracking information
     * @return array Updated fulfillment data
     * @throws \Exception
     */
    public function updateFulfillmentTracking(string $orderId, string $fulfillmentId, array $trackingInfo): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->put("{$this->shopUrl}/admin/api/{$this->apiVersion}/orders/{$orderId}/fulfillments/{$fulfillmentId}.json", [
                'fulfillment' => $trackingInfo,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Failed to update fulfillment tracking in Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify updateFulfillmentTracking error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
                'fulfillment_id' => $fulfillmentId,
                'tracking_info' => $trackingInfo,
            ]);
            throw $e;
        }
    }

    /**
     * Fetch products from Shopify
     * 
     * @param array $params Query parameters
     * @return array Products data
     * @throws \Exception
     */
    public function fetchProducts(array $params = []): array
    {
        $this->validateCredentials();

        $defaultParams = [
            'limit' => 250,
        ];

        $params = array_merge($defaultParams, $params);

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->get("{$this->shopUrl}/admin/api/{$this->apiVersion}/products.json", $params);

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch products from Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify fetchProducts error', [
                'error' => $e->getMessage(),
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * Update product inventory
     * 
     * @param string $inventoryItemId Inventory item ID
     * @param string $locationId Location ID
     * @param int $available Available quantity
     * @return array Updated inventory data
     * @throws \Exception
     */
    public function updateInventory(string $inventoryItemId, string $locationId, int $available): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("{$this->shopUrl}/admin/api/{$this->apiVersion}/inventory_levels/set.json", [
                'location_id' => $locationId,
                'inventory_item_id' => $inventoryItemId,
                'available' => $available,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Failed to update inventory in Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify updateInventory error', [
                'error' => $e->getMessage(),
                'inventory_item_id' => $inventoryItemId,
                'location_id' => $locationId,
                'available' => $available,
            ]);
            throw $e;
        }
    }

    /**
     * Get shop information
     * 
     * @return array Shop data
     * @throws \Exception
     */
    public function getShopInfo(): array
    {
        $this->validateCredentials();

        try {
            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->get("{$this->shopUrl}/admin/api/{$this->apiVersion}/shop.json");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shop info from Shopify: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Shopify getShopInfo error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Validate credentials are set
     * 
     * @throws \Exception
     */
    private function validateCredentials(): void
    {
        if (empty($this->shopUrl) || empty($this->accessToken)) {
            throw new \Exception('Shopify credentials are not set');
        }
    }

    /**
     * Test the API connection
     * 
     * @return bool True if connection is successful
     */
    public function testConnection(): bool
    {
        try {
            $this->getShopInfo();
            return true;
        } catch (\Exception $e) {
            Log::error('Shopify connection test failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Parse Shopify order to internal order format
     * 
     * @param array $shopifyOrder Shopify order data
     * @return array Parsed order data
     */
    public function parseOrderData(array $shopifyOrder): array
    {
        $customer = $shopifyOrder['customer'] ?? [];
        $shippingAddress = $shopifyOrder['shipping_address'] ?? [];
        
        return [
            'external_order_id' => $shopifyOrder['id'],
            'order_number' => $shopifyOrder['name'] ?? $shopifyOrder['order_number'] ?? null,
            'customer' => [
                'name' => trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')),
                'email' => $customer['email'] ?? null,
                'phone' => $customer['phone'] ?? $shopifyOrder['phone'] ?? null,
                'address' => $shippingAddress['address1'] ?? null,
                'city' => $shippingAddress['city'] ?? null,
                'state' => $shippingAddress['province'] ?? null,
                'postal_code' => $shippingAddress['zip'] ?? null,
                'country' => $shippingAddress['country'] ?? null,
            ],
            'line_items' => array_map(function ($item) {
                return [
                    'product_id' => $item['product_id'] ?? null,
                    'variant_id' => $item['variant_id'] ?? null,
                    'sku' => $item['sku'] ?? null,
                    'name' => $item['name'] ?? $item['title'] ?? null,
                    'quantity' => $item['quantity'] ?? 1,
                    'price' => $item['price'] ?? 0,
                ];
            }, $shopifyOrder['line_items'] ?? []),
            'financial_status' => $shopifyOrder['financial_status'] ?? 'pending',
            'fulfillment_status' => $shopifyOrder['fulfillment_status'] ?? null,
            'subtotal' => $shopifyOrder['subtotal_price'] ?? 0,
            'total_tax' => $shopifyOrder['total_tax'] ?? 0,
            'total_discounts' => $shopifyOrder['total_discounts'] ?? 0,
            'total_shipping' => $shopifyOrder['total_shipping_price_set']['shop_money']['amount'] ?? 0,
            'total' => $shopifyOrder['total_price'] ?? 0,
            'currency' => $shopifyOrder['currency'] ?? 'USD',
            'note' => $shopifyOrder['note'] ?? null,
            'created_at' => $shopifyOrder['created_at'] ?? null,
            'updated_at' => $shopifyOrder['updated_at'] ?? null,
        ];
    }
}
