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
                'total_amount' => $parsedData['total'],
                'status' => 'pending',
                'payment_status' => $parsedData['financial_status'],
                'source' => 'shopify',
                'shipping_address' => $parsedData['customer']['address'],
                'city' => $parsedData['customer']['city'],
                'phone' => $parsedData['customer']['phone'],
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
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity'],
                    'sku' => $item['sku'],
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
}
