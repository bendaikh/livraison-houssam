<?php

namespace App\Http\Controllers;

use App\Models\ApiIntegration;
use App\Models\Order;
use App\Models\Client;
use App\Models\Product;
use App\Services\ShopifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Handle Shopify order creation webhook
     */
    public function handleShopifyOrderCreate(Request $request)
    {
        try {
            // Get the Shopify integration
            $integration = ApiIntegration::where('provider', 'shopify')
                ->where('is_active', true)
                ->first();

            if (!$integration) {
                Log::warning('Shopify webhook received but no active integration found');
                return response()->json(['message' => 'No active Shopify integration found'], 404);
            }

            // Verify webhook authenticity
            $webhookSecret = $integration->credentials['webhook_secret'] ?? null;
            
            if ($webhookSecret && !$this->verifyShopifyWebhook($request, $webhookSecret)) {
                Log::warning('Shopify webhook verification failed', [
                    'headers' => $request->headers->all(),
                ]);
                return response()->json(['message' => 'Webhook verification failed'], 401);
            }

            // Get the order data from webhook
            $shopifyOrder = $request->all();
            
            Log::info('Shopify webhook received', [
                'order_id' => $shopifyOrder['id'] ?? 'unknown',
                'order_number' => $shopifyOrder['name'] ?? 'unknown',
            ]);

            // Check if order already exists
            $existingOrder = Order::where('external_order_id', $shopifyOrder['id'])->first();
            
            if ($existingOrder) {
                Log::info('Order already exists, skipping', [
                    'external_order_id' => $shopifyOrder['id'],
                    'internal_order_id' => $existingOrder->id,
                ]);
                return response()->json(['message' => 'Order already processed'], 200);
            }

            // Parse the order data using ShopifyService
            $shopifyService = new ShopifyService();
            $parsedData = $shopifyService->parseOrderData($shopifyOrder);

            // Create or find the client
            $client = $this->getOrCreateClient($parsedData['customer']);

            // Create the order
            $order = Order::create([
                'order_number' => $this->generateOrderNumber(),
                'external_order_id' => $parsedData['external_order_id'],
                'client_id' => $client->id,
                'subtotal' => $parsedData['subtotal'],
                'shipping_cost' => $parsedData['total_shipping'],
                'tax' => $parsedData['total_tax'],
                'discount' => $parsedData['total_discounts'],
                'total' => $parsedData['total'],
                'status' => 'pending',
                'source' => 'shopify',
                'shipping_address' => $parsedData['customer']['address'] ?? null,
                'notes' => $parsedData['note'],
            ]);

            // Create order items
            foreach ($parsedData['line_items'] as $item) {
                // Try to find matching product by external ID or SKU
                $product = null;
                if (!empty($item['sku'])) {
                    $product = Product::where('sku', $item['sku'])->first();
                }
                
                $order->items()->create([
                    'product_id' => $product?->id,
                    'product_name' => $item['name'],
                    'sku' => $item['sku'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                ]);
            }

            Log::info('Order created from Shopify webhook', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'external_order_id' => $parsedData['external_order_id'],
            ]);

            return response()->json([
                'message' => 'Order created successfully',
                'order_id' => $order->id,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to process Shopify webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to process webhook',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify Shopify webhook signature
     */
    private function verifyShopifyWebhook(Request $request, string $webhookSecret): bool
    {
        $hmacHeader = $request->header('X-Shopify-Hmac-SHA256');
        
        if (!$hmacHeader) {
            return false;
        }

        $data = $request->getContent();
        $calculatedHmac = base64_encode(hash_hmac('sha256', $data, $webhookSecret, true));

        return hash_equals($calculatedHmac, $hmacHeader);
    }

    /**
     * Get or create client from customer data
     */
    private function getOrCreateClient(array $customerData): Client
    {
        // Try to find existing client by phone or email
        $client = null;
        
        if (!empty($customerData['phone'])) {
            $client = Client::where('phone', $customerData['phone'])->first();
        }
        
        if (!$client && !empty($customerData['email'])) {
            $client = Client::where('email', $customerData['email'])->first();
        }

        if ($client) {
            // Update client info if needed
            $client->update([
                'name' => $customerData['name'] ?? $client->name,
                'email' => $customerData['email'] ?? $client->email,
                'address' => $customerData['address'] ?? $client->address,
                'city' => $customerData['city'] ?? $client->city,
            ]);
            return $client;
        }

        // Create new client
        return Client::create([
            'name' => $customerData['name'] ?? 'Guest Customer',
            'phone' => $customerData['phone'],
            'email' => $customerData['email'],
            'address' => $customerData['address'],
            'city' => $customerData['city'],
        ]);
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'ORD';
        $date = now()->format('Ymd');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$date}-{$random}";
    }

    /**
     * Test webhook endpoint
     */
    public function testWebhook(Request $request)
    {
        Log::info('Test webhook received', [
            'headers' => $request->headers->all(),
            'body' => $request->all(),
        ]);

        return response()->json([
            'message' => 'Webhook endpoint is working',
            'received_at' => now()->toISOString(),
        ], 200);
    }

    /**
     * Handle BMDelivery webhook for order status updates
     */
    public function handleBMDeliveryWebhook(Request $request)
    {
        try {
            Log::info('BMDelivery webhook received', [
                'data' => $request->all(),
            ]);

            $webhookData = $request->all();
            
            // Get tracking code and status from webhook
            $trackingCode = $webhookData['code'] ?? $webhookData['tracking_code'] ?? null;
            $newStatus = $webhookData['status'] ?? null;
            
            if (!$trackingCode) {
                Log::warning('BMDelivery webhook missing tracking code');
                return response()->json(['message' => 'Missing tracking code'], 400);
            }

            // Find order by tracking code
            $order = Order::where('delivery_tracking_code', $trackingCode)->first();
            
            if (!$order) {
                Log::warning('Order not found for tracking code', ['tracking_code' => $trackingCode]);
                return response()->json(['message' => 'Order not found'], 404);
            }

            // Update delivery status
            $order->update([
                'delivery_status' => $newStatus,
            ]);

            // Map delivery company status to order status
            $orderStatus = $this->mapDeliveryStatusToOrderStatus($newStatus);
            
            if ($orderStatus && $orderStatus !== $order->status) {
                $orderService = app(\App\Services\OrderService::class);
                $orderService->updateOrderStatus(
                    $order->id,
                    $orderStatus,
                    "Status updated from BMDelivery: {$newStatus}"
                );
            }

            Log::info('Order updated from BMDelivery webhook', [
                'order_id' => $order->id,
                'delivery_status' => $newStatus,
                'order_status' => $orderStatus,
            ]);

            return response()->json(['message' => 'Webhook processed successfully'], 200);

        } catch (\Exception $e) {
            Log::error('Failed to process BMDelivery webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to process webhook',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Tawsilex webhook for order status updates
     */
    public function handleTawsilexWebhook(Request $request)
    {
        try {
            Log::info('Tawsilex webhook received', [
                'data' => $request->all(),
            ]);

            $webhookData = $request->all();
            
            // Get tracking code and status from webhook
            $trackingCode = $webhookData['code'] ?? $webhookData['tracking_code'] ?? null;
            $newStatus = $webhookData['status'] ?? null;
            
            if (!$trackingCode) {
                Log::warning('Tawsilex webhook missing tracking code');
                return response()->json(['message' => 'Missing tracking code'], 400);
            }

            // Find order by tracking code
            $order = Order::where('delivery_tracking_code', $trackingCode)->first();
            
            if (!$order) {
                Log::warning('Order not found for tracking code', ['tracking_code' => $trackingCode]);
                return response()->json(['message' => 'Order not found'], 404);
            }

            // Update delivery status
            $order->update([
                'delivery_status' => $newStatus,
            ]);

            // Map delivery company status to order status
            $orderStatus = $this->mapDeliveryStatusToOrderStatus($newStatus);
            
            if ($orderStatus && $orderStatus !== $order->status) {
                $orderService = app(\App\Services\OrderService::class);
                $orderService->updateOrderStatus(
                    $order->id,
                    $orderStatus,
                    "Status updated from Tawsilex: {$newStatus}"
                );
            }

            Log::info('Order updated from Tawsilex webhook', [
                'order_id' => $order->id,
                'delivery_status' => $newStatus,
                'order_status' => $orderStatus,
            ]);

            return response()->json(['message' => 'Webhook processed successfully'], 200);

        } catch (\Exception $e) {
            Log::error('Failed to process Tawsilex webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to process webhook',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Map delivery company status to internal order status
     */
    private function mapDeliveryStatusToOrderStatus(?string $deliveryStatus): ?string
    {
        if (!$deliveryStatus) {
            return null;
        }

        $statusMap = [
            // Common delivery statuses
            'pending' => 'pending',
            'confirmed' => 'confirmed',
            'picked_up' => 'picked_up',
            'in_transit' => 'shipped',
            'out_for_delivery' => 'out_for_delivery',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            'returned' => 'returned',
            'failed' => 'cancelled',
            'refused' => 'refused',
            
            // BMDelivery French statuses (from actual API response)
            'en attente de ramassage' => 'confirmed',
            'ramassé' => 'picked_up',
            'ramasse' => 'picked_up',
            'prêt pour expédition' => 'ready_for_shipping',
            'pret pour expedition' => 'ready_for_shipping',
            'expédié' => 'shipped',
            'expedie' => 'shipped',
            'en cours de livraison' => 'out_for_delivery',
            'en livraison' => 'out_for_delivery',
            'livré' => 'delivered',
            'livre' => 'delivered',
            'refusé' => 'refused',
            'refuse' => 'refused',
            'retourné' => 'returned',
            'retourne' => 'returned',
            'annulé' => 'cancelled',
            'annule' => 'cancelled',
            'demande de retour' => 'return_requested',
            'demande_de_retour' => 'return_requested',
            'injoignable' => 'cancelled',
            'injoignable client' => 'cancelled',
            'hors zone' => 'cancelled',
            'adresse incomplète' => 'cancelled',
            'adresse incomplete' => 'cancelled',
            'reporté' => 'confirmed',
            'reporte' => 'confirmed',
            'en cours de préparation' => 'ready_for_shipping',
            'en cours de preparation' => 'ready_for_shipping',
            
            // BMDelivery statuses (English/normalized versions)
            'ramassage' => 'picked_up',
            'en attente' => 'confirmed',
            'en_attente' => 'confirmed',
            'interesse' => 'confirmed',
            'intéressé' => 'confirmed',
            'en cours' => 'shipped',
            'en_cours' => 'shipped',
            'en route' => 'out_for_delivery',
            'en_route' => 'out_for_delivery',
            'execute' => 'delivered',
            'exécuté' => 'delivered',
            'retour' => 'returned',
            
            // Tawsilex specific
            'preparation' => 'confirmed',
            'expedie' => 'shipped',
            'livraison' => 'out_for_delivery',
        ];

        return $statusMap[strtolower($deliveryStatus)] ?? null;
    }
}
