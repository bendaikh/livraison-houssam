<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderHistory;
use App\Models\Notification;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function __construct(
        private StockService $stockService
    ) {}

    public function createOrder(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Calculate totals
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $subtotal += $item['price'] * $item['quantity'];
            }

            $total = $subtotal + ($data['shipping_cost'] ?? 0) + ($data['tax'] ?? 0) - ($data['discount'] ?? 0);

            // Calculate commission if vendor order
            $commissionAmount = 0;
            if (isset($data['vendor_id']) && $data['vendor_id']) {
                $vendor = \App\Models\Vendor::find($data['vendor_id']);
                if ($vendor) {
                    $commissionAmount = ($total * $vendor->commission_rate) / 100;
                }
            }

            // Create order
            $order = Order::create([
                'client_id' => $data['client_id'],
                'vendor_id' => $data['vendor_id'] ?? null,
                'delivery_agent_id' => $data['delivery_agent_id'] ?? null,
                'delivery_integration_id' => $data['delivery_integration_id'] ?? null,
                'delivery_person_id' => $data['delivery_person_id'] ?? null,
                'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'source' => $data['source'] ?? 'manual',
                'external_order_id' => $data['external_order_id'] ?? null,
                'shopify_name' => $data['shopify_name'] ?? null,
                'subtotal' => $subtotal,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'total' => $total,
                'commission_amount' => $commissionAmount,
                'shipping_address' => $data['shipping_address'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['client_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'whatsapp' => $data['whatsapp'] ?? null,
            ]);

            // Create order items
            foreach ($data['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'] ?? null,
                    'sku' => $item['sku'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                ]);
            }

            // Create history entry
            $this->addHistory($order->id, $order->status, 'Order created');

            // Update client stats
            $this->updateClientStats($order->client_id);

            return $order->load(['items.product', 'client']);
        });
    }

    public function updateOrder(int $orderId, array $data)
    {
        return DB::transaction(function () use ($orderId, $data) {
            $order = Order::findOrFail($orderId);
            
            // Calculate totals
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $subtotal += $item['price'] * $item['quantity'];
            }

            $total = $subtotal + ($data['shipping_cost'] ?? 0) + ($data['tax'] ?? 0) - ($data['discount'] ?? 0);

            // Calculate commission if vendor order
            $commissionAmount = 0;
            if (isset($data['vendor_id']) && $data['vendor_id']) {
                $vendor = \App\Models\Vendor::find($data['vendor_id']);
                if ($vendor) {
                    $commissionAmount = ($total * $vendor->commission_rate) / 100;
                }
            }

            // Update order (but don't update status here - let updateOrderStatus handle that)
            $updateData = [
                'client_id' => $data['client_id'],
                'vendor_id' => $data['vendor_id'] ?? null,
                'delivery_agent_id' => $data['delivery_agent_id'] ?? null,
                'delivery_integration_id' => $data['delivery_integration_id'] ?? null,
                'delivery_person_id' => $data['delivery_person_id'] ?? null,
                'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
                'source' => $data['source'] ?? 'manual',
                'shopify_name' => $data['shopify_name'] ?? null,
                'subtotal' => $subtotal,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'total' => $total,
                'commission_amount' => $commissionAmount,
                'shipping_address' => $data['shipping_address'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['client_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'whatsapp' => $data['whatsapp'] ?? null,
            ];
            
            // Only update status if it's explicitly provided and different from current
            if (isset($data['status']) && $data['status'] !== $order->status) {
                $updateData['status'] = $data['status'];
            }
            
            $order->update($updateData);

            // Delete existing items
            $order->items()->delete();

            // Create new order items
            foreach ($data['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'] ?? null,
                    'sku' => $item['sku'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                ]);
            }

            // Create history entry
            $this->addHistory($order->id, $order->status, 'Order updated');

            return $order->load(['items.product', 'client', 'vendor', 'deliveryAgent', 'deliveryPerson', 'confirmationAgent']);
        });
    }

    public function updateOrderStatus(int $orderId, string $status, ?string $note = null, ?int $deliveryIntegrationId = null, ?string $deliveryCity = null)
    {
        return DB::transaction(function () use ($orderId, $status, $note, $deliveryIntegrationId, $deliveryCity) {
            $order = Order::findOrFail($orderId);
            $oldStatus = $order->status;

            $order->update(['status' => $status]);

            // Update timestamp fields
            match($status) {
                'confirmed' => $order->update(['confirmed_at' => now()]),
                'picked_up' => $order->update(['picked_up_at' => now()]),
                'ready_for_shipping' => $order->update(['ready_for_shipping_at' => now()]),
                'shipped' => $order->update(['shipped_at' => now()]),
                'out_for_delivery' => $order->update(['out_for_delivery_at' => now()]),
                'delivered' => $order->update(['delivered_at' => now()]),
                'cancelled' => $order->update(['cancelled_at' => now()]),
                'refused' => $order->update(['refused_at' => now()]),
                'returned' => $order->update(['returned_at' => now()]),
                'return_requested' => $order->update(['returned_at' => now()]),
                default => null
            };

            // Send to delivery company when confirmed
            $deliveryError = null;
            if ($status === 'confirmed' && $deliveryIntegrationId) {
                try {
                    $this->sendOrderToDeliveryCompany($order, $deliveryIntegrationId, $deliveryCity);
                } catch (\Exception $e) {
                    \Log::error('Failed to send order to delivery company: ' . $e->getMessage(), [
                        'order_id' => $orderId,
                        'delivery_integration_id' => $deliveryIntegrationId,
                        'exception' => $e->getTraceAsString()
                    ]);
                    
                    // Store the error but don't throw - let the order be confirmed anyway
                    $deliveryError = $e->getMessage();
                    
                    // Add history note about the failure
                    $this->addHistory($orderId, $status, "Order confirmed but failed to send to delivery company: " . $deliveryError);
                }
            }

            // Deduct stock when order moves to confirmed (first time only)
            $hasStockDeduction = StockMovement::where('order_id', $orderId)->where('type', 'out')->exists();
            if ($status === 'confirmed' && !$hasStockDeduction) {
                try {
                    $this->stockService->deductStockForOrder($orderId);
                } catch (\Exception $e) {
                    \Log::error('Failed to deduct stock for order: ' . $e->getMessage(), [
                        'order_id' => $orderId,
                        'exception' => $e
                    ]);
                    // Continue with the order status update even if stock deduction fails
                }
            }

            // Restore stock when order is cancelled and stock had been deducted
            if ($status === 'cancelled' && $oldStatus !== 'cancelled' && $hasStockDeduction) {
                try {
                    $this->stockService->restoreStockForOrder($orderId);
                } catch (\Exception $e) {
                    \Log::error('Failed to restore stock for cancelled order: ' . $e->getMessage(), [
                        'order_id' => $orderId,
                        'exception' => $e
                    ]);
                    // Continue with the order status update even if stock restoration fails
                }
            }

            // Update vendor stats if delivered
            if ($status === 'delivered' && $order->vendor_id) {
                $this->updateVendorStats($order->vendor_id, $order->total, $order->commission_amount);
            }

            // Update client stats if delivered
            if ($status === 'delivered') {
                $this->updateClientStats($order->client_id);
            }

            // Add history
            $this->addHistory($orderId, $status, $note ?? "Order status changed from {$oldStatus} to {$status}");

            // Create notification
            $this->createOrderNotification($order, $status);

            $freshOrder = $order->fresh(['items.product', 'client', 'history', 'deliveryIntegration']);
            
            // If there was a delivery error, add it to the response
            if ($deliveryError) {
                $freshOrder->delivery_error = $deliveryError;
            }
            
            return $freshOrder;
        });
    }

    private function sendOrderToDeliveryCompany(Order $order, int $deliveryIntegrationId, ?string $deliveryCity = null)
    {
        $integration = \App\Models\ApiIntegration::findOrFail($deliveryIntegrationId);
        
        \Log::info('Attempting to send order to delivery company', [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'integration_id' => $deliveryIntegrationId,
            'integration_name' => $integration->name,
            'provider' => $integration->provider,
            'is_active' => $integration->is_active,
            'delivery_city' => $deliveryCity,
        ]);
        
        if (!$integration->is_active) {
            throw new \Exception('Selected delivery integration is not active');
        }

        // Get API token - check different possible keys
        $apiToken = $integration->credentials['api_token'] 
            ?? $integration->credentials['apiToken'] 
            ?? $integration->credentials['token'] 
            ?? null;
        
        if (!$apiToken) {
            \Log::error('No API token found in integration credentials', [
                'integration_id' => $deliveryIntegrationId,
                'credentials_keys' => array_keys($integration->credentials ?? []),
            ]);
            throw new \Exception('API token not found in integration credentials');
        }

        \Log::info('API token found, proceeding with delivery request', [
            'token_length' => strlen($apiToken),
            'token_preview' => substr($apiToken, 0, 10) . '...',
        ]);

        $response = null;
        $tawsilexService = null;

        // Send to the appropriate delivery service
        if ($integration->provider === 'bmdelivery') {
            $bmService = new BMDeliveryService();
            $bmService->setApiToken($apiToken);
            
            \Log::info('Sending order to BMDelivery', [
                'order_id' => $order->id,
                'client_name' => $order->client->name ?? 'N/A',
                'client_phone' => $order->client->phone ?? 'N/A',
                'client_city' => $order->client->city ?? 'N/A',
                'selected_city' => $deliveryCity,
                'total' => $order->total,
            ]);
            
            $response = $bmService->createShipmentFromOrder($order, $deliveryCity);
            
            \Log::info('BMDelivery response received', [
                'response' => $response,
            ]);
        } elseif ($integration->provider === 'tawsilex') {
            $tawsilexService = new TawsilexService();
            $tawsilexService->setApiToken($apiToken);
            
            \Log::info('Sending order to Tawsilex', [
                'order_id' => $order->id,
                'selected_city' => $deliveryCity,
            ]);
            
            $response = $tawsilexService->createShipmentFromOrder($order, $deliveryCity);
            
            \Log::info('Tawsilex response received', [
                'response' => $response,
            ]);
        } else {
            throw new \Exception('Unsupported delivery provider: ' . $integration->provider);
        }

        $trackingCode = $this->extractDeliveryTrackingCode($response);

        if (!$trackingCode) {
            throw new \Exception('Delivery API did not return a tracking code');
        }

        // Extra guard for Tawsilex: verify the shipment exists before marking it as sent locally.
        if ($integration->provider === 'tawsilex' && $tawsilexService) {
            try {
                $tawsilexService->trackShipment($trackingCode);
            } catch (\Exception $e) {
                throw new \Exception("Tawsilex accepted the request but shipment {$trackingCode} is not traceable yet: {$e->getMessage()}");
            }
        }
        
        \Log::info('Updating order with tracking info', [
            'order_id' => $order->id,
            'tracking_code' => $trackingCode,
            'full_response' => $response,
        ]);
        
        $order->update([
            'delivery_integration_id' => $deliveryIntegrationId,
            'city' => $deliveryCity ?: $order->city,
            'delivery_tracking_code' => $trackingCode,
            'sent_to_delivery_at' => now(),
            'delivery_status' => 'sent',
        ]);

        $this->addHistory($order->id, $order->status, "Order sent to {$integration->name}. Tracking code: {$trackingCode}");
    }

    private function extractDeliveryTrackingCode(array $response): ?string
    {
        return $response['code_shippment']
            ?? $response['code_shipment']
            ?? $response['tracking_code']
            ?? $response['data']['code']
            ?? $response['data']['code_shippment']
            ?? null;
    }

    private function addHistory(int $orderId, string $status, ?string $note = null)
    {
        OrderHistory::create([
            'order_id' => $orderId,
            'user_id' => Auth::id(),
            'status' => $status,
            'note' => $note,
        ]);
    }

    private function updateClientStats(int $clientId)
    {
        $client = \App\Models\Client::find($clientId);
        if ($client) {
            $totalSpent = Order::where('client_id', $clientId)
                ->whereIn('status', ['delivered'])
                ->sum('total');
            
            $ordersCount = Order::where('client_id', $clientId)->count();

            $client->update([
                'total_spent' => $totalSpent,
                'orders_count' => $ordersCount,
            ]);
        }
    }

    private function updateVendorStats(int $vendorId, float $sales, float $commission)
    {
        $vendor = \App\Models\Vendor::find($vendorId);
        if ($vendor) {
            $vendor->increment('total_sales', $sales);
            $vendor->increment('total_commission', $commission);
        }
    }

    private function createOrderNotification(Order $order, string $status)
    {
        $messages = [
            'pending' => 'New order received',
            'confirmed' => 'Order confirmed',
            'shipped' => 'Order shipped',
            'delivered' => 'Order delivered',
            'cancelled' => 'Order cancelled',
        ];

        // Notify admin and delivery agent
        $users = \App\Models\User::where('is_active', true)
            ->whereHas('role', function ($query) {
                $query->whereIn('slug', ['admin', 'confirmation_agent']);
            })
            ->get();

        if ($order->delivery_agent_id) {
            $users->push($order->deliveryAgent);
        }

        foreach ($users->unique('id') as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'order_status_change',
                'title' => $messages[$status] ?? 'Order updated',
                'message' => "Order #{$order->order_number} status changed to {$status}",
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $status,
                ],
            ]);
        }
    }

    public function assignDeliveryAgent(int $orderId, array $attributes)
    {
        $order = Order::findOrFail($orderId);
        $updatable = [];

        if (array_key_exists('delivery_agent_id', $attributes)) {
            $updatable['delivery_agent_id'] = $attributes['delivery_agent_id'];
        }
        if (array_key_exists('delivery_person_id', $attributes)) {
            $updatable['delivery_person_id'] = $attributes['delivery_person_id'];
        }
        if (array_key_exists('delivery_integration_id', $attributes)) {
            $updatable['delivery_integration_id'] = $attributes['delivery_integration_id'];
        }
        if (array_key_exists('delivery_city', $attributes)) {
            $updatable['city'] = $attributes['delivery_city'];
        }

        // Keep assignment mutually exclusive:
        // company assignment clears delivery people, person assignment clears company assignment.
        if (array_key_exists('delivery_integration_id', $attributes) && $attributes['delivery_integration_id']) {
            $updatable['delivery_person_id'] = null;
            $updatable['delivery_agent_id'] = null;
        }

        if (array_key_exists('delivery_person_id', $attributes) && $attributes['delivery_person_id']) {
            $updatable['delivery_integration_id'] = null;
        }

        if (!empty($updatable)) {
            $order->update($updatable);
            $this->addHistory($orderId, $order->status, 'Delivery assignment updated');
        }

        return $order->fresh(['deliveryAgent', 'deliveryPerson', 'confirmationAgent', 'deliveryIntegration']);
    }
}
