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
        private OrderService $orderService,
        private ShopifyService $shopifyService,
        private TawsilexService $tawsilexService,
        private BMDeliveryService $bmDeliveryService
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
            
            // Check if this is a webhook-only integration
            $shopUrl = $credentials['shop_url'] ?? '';
            $accessToken = $credentials['access_token'] ?? '';
            $webhookSecret = $credentials['webhook_secret'] ?? '';
            
            // If only webhook is configured (no API credentials), explain this
            if (!$shopUrl && !$accessToken && $webhookSecret) {
                throw new \Exception('This integration uses webhooks only. Orders are automatically imported when created in Shopify. To manually sync orders, you need to add Shop URL and Admin API Access Token in the integration settings.');
            }

            if (!$shopUrl || !$accessToken) {
                throw new \Exception('Missing Shopify credentials. Please add Shop URL and Admin API Access Token to enable manual sync.');
            }

            // Configure Shopify service
            $this->shopifyService->setCredentials($shopUrl, $accessToken);

            // Fetch orders from Shopify API
            $params = [
                'status' => 'any',
                'limit' => 250,
            ];

            if ($integration->last_sync_at) {
                $params['updated_at_min'] = $integration->last_sync_at->toIso8601String();
            }

            $response = $this->shopifyService->fetchOrders($params);
            $shopifyOrders = $response['orders'] ?? [];
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
            $sku = $lineItem['sku'] ?? null;
            $productName = $lineItem['name'] ?? 'Unknown Product';
            
            // Try to find existing product by SKU
            $product = null;
            if ($sku) {
                $product = Product::where('sku', $sku)->first();
            }
            
            $items[] = [
                'product_id' => $product?->id, // Will be null if product not found
                'product_name' => $productName,
                'sku' => $sku,
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
            'client_phone' => $client->phone,
            'source' => 'shopify',
            'external_order_id' => $shopifyOrder['id'],
            'status' => $status,
            'items' => $items,
            'shipping_cost' => $shopifyOrder['total_shipping_price_set']['shop_money']['amount'] ?? 0,
            'tax' => $shopifyOrder['total_tax'] ?? 0,
            'discount' => $shopifyOrder['total_discounts'] ?? 0,
            'shipping_address' => json_encode($shopifyOrder['shipping_address'] ?? []),
            'city' => $shopifyOrder['shipping_address']['city'] ?? $client->city,
            'notes' => $shopifyOrder['note'] ?? null,
        ]);
    }

    public function syncDeliveryCompanyOrders(int $integrationId)
    {
        $integration = ApiIntegration::findOrFail($integrationId);
        
        if (!$integration->is_active) {
            throw new \Exception('Integration is not active');
        }

        // Determine which delivery service to use
        $deliveryService = $this->getDeliveryService($integration);

        $log = ApiImportLog::create([
            'api_integration_id' => $integrationId,
            'status' => 'failed',
            'total_records' => 0,
            'successful_records' => 0,
            'failed_records' => 0,
        ]);

        try {
            // Fetch shipments from delivery company
            $shipments = $deliveryService->listShipments();
            $log->update(['total_records' => count($shipments)]);

            $errors = [];
            $successful = 0;
            $failed = 0;

            foreach ($shipments as $shipment) {
                try {
                    $this->syncDeliveryShipmentStatus($shipment, $integration->name);
                    $successful++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = [
                        'shipment_id' => $shipment['code'] ?? $shipment['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ];
                }
            }

            $log->update([
                'status' => $failed === 0 ? 'success' : ($successful > 0 ? 'partial' : 'failed'),
                'successful_records' => $successful,
                'failed_records' => $failed,
                'errors' => $errors,
                'message' => "Synced {$successful} shipments, {$failed} failed",
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

    /**
     * Sync delivery shipment status with local order
     */
    private function syncDeliveryShipmentStatus(array $shipment, string $provider)
    {
        // Find order by internal_id or external tracking code
        $trackingCode = $shipment['code'] ?? $shipment['tracking_code'] ?? null;
        $internalId = $shipment['internal_id'] ?? null;

        if (!$trackingCode && !$internalId) {
            return;
        }

        $order = Order::where(function ($query) use ($trackingCode, $internalId) {
            if ($internalId) {
                $query->where('order_number', $internalId);
            }
            if ($trackingCode) {
                $query->orWhere('external_order_id', $trackingCode);
            }
        })->first();

        if (!$order) {
            return;
        }

        // Map delivery status to our status
        $deliveryStatus = $shipment['status'] ?? $shipment['state'] ?? '';
        $mappedStatus = $this->mapDeliveryStatus($deliveryStatus, $provider);

        if ($mappedStatus && $order->status !== $mappedStatus) {
            $this->orderService->updateOrderStatus(
                $order->id,
                $mappedStatus,
                "Status updated from {$provider}: {$deliveryStatus}"
            );
        }
    }

    /**
     * Map delivery company status to internal status
     */
    private function mapDeliveryStatus(string $deliveryStatus, string $provider): ?string
    {
        $statusMap = [
            'tawsilex' => [
                'en_attente' => 'pending',
                'ramassage' => 'confirmed',
                'en_cours' => 'shipped',
                'sent' => 'shipped',
                'livre' => 'delivered',
                'livré' => 'delivered',
                'livree' => 'delivered',
                'livrée' => 'delivered',
                'annule' => 'cancelled',
                'retour' => 'cancelled',
            ],
            'bmdelivery' => [
                'pending' => 'pending',
                'picked_up' => 'confirmed',
                'in_transit' => 'shipped',
                'delivered' => 'delivered',
                'cancelled' => 'cancelled',
                'returned' => 'cancelled',
            ],
        ];

        $providerKey = strtolower(str_replace(' ', '', $provider));
        $map = $statusMap[$providerKey] ?? [];

        return $map[strtolower($deliveryStatus)] ?? null;
    }

    /**
     * Get the appropriate delivery service based on integration
     */
    private function getDeliveryService(ApiIntegration $integration)
    {
        $credentials = $integration->credentials;
        $apiToken = $credentials['api_token'] ?? '';

        if (!$apiToken) {
            throw new \Exception('Missing API token for delivery service');
        }

        // Use provider field if available, otherwise fall back to name matching
        $provider = $integration->provider ?? strtolower($integration->name);

        if (str_contains($provider, 'tawsilex')) {
            return $this->tawsilexService->setApiToken($apiToken);
        } elseif (str_contains($provider, 'bmd') || str_contains($provider, 'bmdelivery')) {
            return $this->bmDeliveryService->setApiToken($apiToken);
        }

        throw new \Exception('Unknown delivery provider: ' . $provider);
    }

    /**
     * Create shipment in delivery company from order
     */
    public function createDeliveryShipment(int $orderId, int $integrationId): array
    {
        $order = Order::with(['client', 'items.product'])->findOrFail($orderId);
        $integration = ApiIntegration::findOrFail($integrationId);

        if (!$integration->is_active) {
            throw new \Exception('Integration is not active');
        }

        $deliveryService = $this->getDeliveryService($integration);

        try {
            $result = $deliveryService->createShipmentFromOrder($order);

            // Update order with tracking information
            if (isset($result['code']) || isset($result['tracking_code'])) {
                $trackingCode = $result['code'] ?? $result['tracking_code'];
                $order->update([
                    'external_order_id' => $trackingCode,
                    'notes' => ($order->notes ? $order->notes . "\n" : '') . 
                               "Shipment created in {$integration->name}: {$trackingCode}",
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to create delivery shipment', [
                'order_id' => $orderId,
                'integration_id' => $integrationId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Track shipment in delivery company
     */
    public function trackDeliveryShipment(string $trackingCode, int $integrationId): array
    {
        $integration = ApiIntegration::findOrFail($integrationId);

        if (!$integration->is_active) {
            throw new \Exception('Integration is not active');
        }

        $deliveryService = $this->getDeliveryService($integration);

        try {
            return $deliveryService->trackShipment($trackingCode);
        } catch (\Exception $e) {
            Log::error('Failed to track delivery shipment', [
                'tracking_code' => $trackingCode,
                'integration_id' => $integrationId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function getOrCreateClient(array $data)
    {
        // Try to find existing client by phone or email
        $data['phone'] = $this->normalizeMoroccanPhone($data['phone'] ?? null);

        $client = Client::where('phone', $data['phone'])
            ->orWhere('email', $data['email'])
            ->first();

        if (!$client) {
            $client = Client::create($data);
        }

        return $client;
    }

    private function normalizeMoroccanPhone(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (empty($digits)) {
            return null;
        }

        // Remove leading international prefix
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '212')) {
            $digits = '0' . substr($digits, 3);
        }

        // Ensure we keep the leading zero when possible
        if (!str_starts_with($digits, '0')) {
            if (strlen($digits) === 9) {
                $digits = '0' . $digits;
            } elseif (strlen($digits) > 0) {
                $digits = '0' . $digits;
            }
        }

        return $digits;
    }

    /**
     * Test API connection
     */
    public function testConnection(int $integrationId): bool
    {
        $integration = ApiIntegration::findOrFail($integrationId);

        try {
            if ($integration->type === 'shopify') {
                $credentials = $integration->credentials;
                $this->shopifyService->setCredentials(
                    $credentials['shop_url'] ?? '',
                    $credentials['access_token'] ?? ''
                );
                return $this->shopifyService->testConnection();
            } elseif ($integration->type === 'delivery') {
                $deliveryService = $this->getDeliveryService($integration);
                return $deliveryService->testConnection();
            }

            return false;
        } catch (\Exception $e) {
            Log::error('API connection test failed', [
                'integration_id' => $integrationId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get delivery cities
     */
    public function getDeliveryCities(int $integrationId): array
    {
        $integration = ApiIntegration::findOrFail($integrationId);

        if ($integration->type !== 'delivery') {
            throw new \Exception('This integration does not support city listing');
        }

        $deliveryService = $this->getDeliveryService($integration);

        // BMDelivery has cities endpoint, Tawsilex doesn't
        if (method_exists($deliveryService, 'listCities')) {
            return $deliveryService->listCities();
        }

        throw new \Exception('City listing not supported for this provider');
    }

    /**
     * Get delivery statuses
     */
    public function getDeliveryStatuses(int $integrationId): array
    {
        $integration = ApiIntegration::findOrFail($integrationId);

        if ($integration->type !== 'delivery') {
            throw new \Exception('This integration does not support status listing');
        }

        $deliveryService = $this->getDeliveryService($integration);

        // Tawsilex has statuses endpoint
        if (method_exists($deliveryService, 'listStatuses')) {
            return $deliveryService->listStatuses();
        }

        throw new \Exception('Status listing not supported for this provider');
    }
}
