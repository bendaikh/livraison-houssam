<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderHistory;
use App\Models\Notification;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderService
{
    private const IMPORTED_SHOPIFY_SURCHARGE = 1.0;

    public function __construct(
        private StockService $stockService,
        private ShippingPriceService $shippingPriceService,
    ) {}

    public function createOrder(array $data)
    {
        return DB::transaction(function () use ($data) {
            $shippingResolution = $this->shippingPriceService->resolveForOrderData($data);
            $data['shipping_cost'] = $shippingResolution['shipping_cost'];

            // Calculate subtotal and total
            ['subtotal' => $subtotal, 'total' => $total, 'shipping_included_in_price' => $shippingIncludedInPrice] =
                $this->calculateOrderTotals($data['items'], $data);

            // Create order
            $order = Order::create([
                'client_id' => $data['client_id'],
                'vendor_id' => $data['vendor_id'] ?? null,
                'delivery_agent_id' => $data['delivery_agent_id'] ?? null,
                'delivery_integration_id' => $data['delivery_integration_id'] ?? null,
                'delivery_person_id' => $data['delivery_person_id'] ?? null,
                'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
                'confirmation_assigned_at' => !empty($data['confirmation_agent_id']) ? now() : null,
                'created_by_user_id' => $data['created_by_user_id'] ?? null,
                'callback_date' => $data['callback_date'] ?? null,
                'delivery_city' => $data['delivery_city'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'source' => $data['source'] ?? 'manual',
                'source_website' => $data['source_website'] ?? null,
                'external_order_id' => $data['external_order_id'] ?? null,
                'shopify_name' => $data['shopify_name'] ?? null,
                'subtotal' => $subtotal,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'shipping_included_in_price' => $shippingIncludedInPrice,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'total' => $total,
                'commission_amount' => 0,
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
                    'is_upsell' => (bool) ($item['is_upsell'] ?? false),
                ]);
            }

            $this->applySellerFinancials($order);

            // Create history entry
            $this->addHistory($order->id, $order->status, 'Order created');

            // Update client stats
            $this->updateClientStats($order->client_id);

            \Log::info('Order created with resolved shipping cost.', [
                'order_id' => $order->id,
                'city' => $order->city,
                'shipping_cost' => $order->shipping_cost,
                'shipping_cost_decision' => $shippingResolution['decision'],
                'shipping_cost_source' => $shippingResolution['shipping_cost_source'],
                'city_rate_source' => $shippingResolution['source'],
            ]);

            return $order->load(['items.product', 'client', 'vendor']);
        });
    }

    public function updateOrder(int $orderId, array $data)
    {
        return DB::transaction(function () use ($orderId, $data) {
            $order = Order::findOrFail($orderId);
            $shippingResolution = $this->shippingPriceService->resolveForOrderData($data, $order);
            $data['shipping_cost'] = $shippingResolution['shipping_cost'];

            // Calculate subtotal and total
            ['subtotal' => $subtotal, 'total' => $total, 'shipping_included_in_price' => $shippingIncludedInPrice] =
                $this->calculateOrderTotals($data['items'], $data, $order);

            // Update order (but don't update status here - let updateOrderStatus handle that)
            $updateData = [
                'client_id' => $data['client_id'],
                'vendor_id' => $data['vendor_id'] ?? null,
                'delivery_agent_id' => $data['delivery_agent_id'] ?? null,
                'delivery_integration_id' => $data['delivery_integration_id'] ?? null,
                'delivery_person_id' => $data['delivery_person_id'] ?? null,
                'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
                'callback_date' => $data['callback_date'] ?? null,
                'delivery_city' => $data['delivery_city'] ?? $order->delivery_city,
                'source' => $data['source'] ?? 'manual',
                'shopify_name' => $data['shopify_name'] ?? null,
                'subtotal' => $subtotal,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'shipping_included_in_price' => $shippingIncludedInPrice,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'total' => $total,
                'commission_amount' => 0,
                'shipping_address' => $data['shipping_address'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['client_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'whatsapp' => $data['whatsapp'] ?? null,
            ];

            $updateData = array_merge($updateData, $this->prepareConfirmationAssignmentAttributes($order, $data));
            $updateData = array_merge($updateData, $this->prepareDeliveryAssignmentAttributes($order, $data));
            
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
                    'is_upsell' => (bool) ($item['is_upsell'] ?? false),
                ]);
            }

            $this->applySellerFinancials($order);

            // Create history entry
            $this->addHistory($order->id, $order->status, 'Order updated');

            \Log::info('Order updated with resolved shipping cost.', [
                'order_id' => $order->id,
                'city' => $order->city,
                'shipping_cost' => $order->shipping_cost,
                'shipping_cost_decision' => $shippingResolution['decision'],
                'shipping_cost_source' => $shippingResolution['shipping_cost_source'],
                'city_rate_source' => $shippingResolution['source'],
            ]);

            return $order->load(['items.product', 'client', 'vendor', 'deliveryAgent', 'deliveryPerson', 'confirmationAgent']);
        });
    }

    public function updateOrderStatus(int $orderId, string $status, ?string $note = null, ?int $deliveryIntegrationId = null, ?string $deliveryCity = null)
    {
        return DB::transaction(function () use ($orderId, $status, $note, $deliveryIntegrationId, $deliveryCity) {
            $order = Order::findOrFail($orderId);
            $oldStatus = $order->status;
            $deliveryIntegration = $deliveryIntegrationId
                ? \App\Models\ApiIntegration::find($deliveryIntegrationId)
                : null;

            $order->update(['status' => $status]);

            // Update timestamp fields
            match($status) {
                'confirmed' => $order->update(['confirmed_at' => now()]),
                'reported' => null,
                'picked_up' => $order->update(['picked_up_at' => now()]),
                'ready_for_shipping' => $order->update(['ready_for_shipping_at' => now()]),
                'shipped' => $order->update(['shipped_at' => now()]),
                'out_for_delivery' => $order->update(['out_for_delivery_at' => now()]),
                'delivered' => $order->update(['delivered_at' => now()]),
                'cancelled' => $order->update(['cancelled_at' => now()]),
                'refused' => $order->update(['refused_at' => now()]),
                'returned' => $order->update(['returned_at' => now()]),
                'no_response' => $order->update(['no_response_at' => now()]),
                'return_requested' => $order->update(['returned_at' => now()]),
                default => null
            };

            if (in_array($status, ['delivered', 'cancelled', 'refused', 'returned', 'no_response'], true)) {
                $order->update(['callback_date' => null]);
            }

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
                    $deliveryError = $this->formatDeliveryDispatchError($e, $deliveryIntegration?->name);
                    
                    // Add history note about the failure
                    $this->addHistory($orderId, $status, "Order confirmed but failed to send to delivery company: " . $deliveryError);
                }
            }

            // Deduct stock when order is delivered (first time only)
            $hasStockDeduction = StockMovement::where('order_id', $orderId)->where('type', 'out')->exists();
            if ($status === 'delivered' && !$hasStockDeduction) {
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

            $hasStockRestoration = StockMovement::where('order_id', $orderId)->where('type', 'in')->exists();

            // Restore stock when a delivered order is moved to refused or returned.
            if (
                in_array($status, ['refused', 'returned'], true)
                && $oldStatus !== $status
                && $hasStockDeduction
                && !$hasStockRestoration
            ) {
                try {
                    $this->stockService->restoreStockForOrder(
                        $orderId,
                        "Stock restored after delivered order #{$order->order_number} was changed to {$status}"
                    );
                } catch (\Exception $e) {
                    \Log::error('Failed to restore stock for order: ' . $e->getMessage(), [
                        'order_id' => $orderId,
                        'status' => $status,
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

            $freshOrder = $order->fresh([
                'items.product',
                'client',
                'vendor',
                'history.user',
                'deliveryIntegration',
                'deliveryAgent',
                'deliveryPerson',
                'confirmationAgent',
            ]);
            
            // If there was a delivery error, add it to the response
            if ($deliveryError) {
                $freshOrder->delivery_error = $deliveryError;
            }
            
            return $freshOrder;
        });
    }

    private function formatDeliveryDispatchError(\Throwable $e, ?string $integrationName = null): string
    {
        $providerName = $integrationName ?: 'the delivery provider';
        $message = trim($e->getMessage());
        $normalized = strtolower($message);

        if (
            str_contains($normalized, 'curl error 35')
            || str_contains($normalized, 'tls connect error')
            || str_contains($normalized, 'handshake')
            || str_contains($normalized, 'ssl routines')
        ) {
            return "Secure connection to {$providerName} failed from this server (TLS/SSL handshake error). The order was saved, but dispatch did not complete. Provider detail: {$message}";
        }

        if (
            str_contains($normalized, 'curl error')
            || str_contains($normalized, 'could not resolve host')
            || str_contains($normalized, 'operation timed out')
        ) {
            return "Connection to {$providerName} failed from this server. The order was saved, but dispatch did not complete. Provider detail: {$message}";
        }

        return $message;
    }

    public function updateDeliveryWorkflow(int $orderId, User $user, array $data)
    {
        return DB::transaction(function () use ($orderId, $user, $data) {
            $order = Order::lockForUpdate()->findOrFail($orderId);

            if ((int) $order->delivery_person_id !== (int) $user->id) {
                abort(403, 'You are not allowed to manage this order.');
            }

            $motifStatuses = ['refused', 'cancelled', 'no_response', 'returned'];
            $status = $data['status'] ?? null;
            $note = isset($data['delivery_status_note']) ? trim((string) $data['delivery_status_note']) : null;
            $callbackDate = isset($data['callback_date']) && $data['callback_date']
                ? Carbon::parse($data['callback_date'])->startOfDay()
                : null;
            $returnToConfirmation = (bool) ($data['return_to_confirmation'] ?? false);
            $returnStatus = $data['return_status'] ?? 'returned';

            if ($returnToConfirmation) {
                if ($order->delivery_tracking_code) {
                    abort(422, 'Orders handled by a delivery company cannot be returned through the delivery person workflow.');
                }

                if ($order->status === 'delivered') {
                    abort(422, 'Delivered orders cannot be sent back to confirmation.');
                }

                if (!$note) {
                    abort(422, 'A reason is required when sending an order back to confirmation.');
                }

                return $this->returnOrderToConfirmation($order, $user, $note, $returnStatus);
            }

            if ($callbackDate) {
                if ($callbackDate->lte(Carbon::today())) {
                    abort(422, 'Callback date must be in the future.');
                }

                $order->update([
                    'callback_date' => $callbackDate,
                    'delivery_status_note' => $note ?: $order->delivery_status_note,
                ]);

                $this->addHistory(
                    $order->id,
                    $order->status,
                    trim('Delivery callback scheduled for ' . $callbackDate->toDateString() . '. ' . ($note ?: ''))
                );
            }

            if (!$status) {
                return $order->fresh([
                    'client',
                    'vendor',
                    'items.product',
                    'history.user',
                    'confirmationAgent',
                    'deliveryAgent',
                    'deliveryPerson',
                    'deliveryIntegration',
                ]);
            }

            if (in_array($status, $motifStatuses, true) && !$note) {
                abort(422, 'A reason is required for this status.');
            }

            if ($status === 'delivered') {
                $collectedAmount = (float) ($data['collected_amount'] ?? 0);
                $commission = (float) $user->effective_commission_per_order;

                if ($collectedAmount <= 0) {
                    abort(422, 'Collected amount is required for delivered orders.');
                }

                if ($collectedAmount < $commission) {
                    abort(422, 'Collected amount cannot be lower than the delivery person commission.');
                }

                $order->update([
                    'collected_amount' => $collectedAmount,
                    'delivery_person_commission' => $commission,
                    'amount_due_to_admin' => $collectedAmount - $commission,
                    'delivery_status_note' => $note,
                    'callback_date' => null,
                ]);
            } else {
                $order->update([
                    'delivery_status_note' => $note,
                    'callback_date' => in_array($status, $motifStatuses, true) ? null : $order->callback_date,
                ]);
            }

            $historyNote = $note;

            if ($status === 'delivered' && isset($collectedAmount)) {
                $historyNote = trim(collect([
                    $note,
                    'Collected: ' . number_format($collectedAmount, 2, '.', ''),
                    'Commission: ' . number_format((float) $order->delivery_person_commission, 2, '.', ''),
                    'Due to admin: ' . number_format((float) $order->amount_due_to_admin, 2, '.', ''),
                ])->filter()->implode(' | '));
            }

            $order = $this->updateOrderStatus(
                $order->id,
                $status,
                $historyNote ?: 'Delivery workflow updated.'
            );

            return $order->fresh([
                'client',
                'vendor',
                'items.product',
                'history.user',
                'confirmationAgent',
                'deliveryAgent',
                'deliveryPerson',
                'deliveryIntegration',
            ]);
        });
    }

    private function returnOrderToConfirmation(Order $order, User $user, string $note, string $returnStatus): Order
    {
        $order->update([
            'delivery_person_id' => null,
            'callback_date' => null,
            'delivery_status_note' => $note,
            'returned_to_confirmation_at' => now(),
            'confirmed_at' => null,
            'picked_up_at' => null,
            'ready_for_shipping_at' => null,
            'shipped_at' => null,
            'out_for_delivery_at' => null,
            'collected_amount' => null,
            'delivery_person_commission' => null,
            'amount_due_to_admin' => null,
        ]);

        $order = $this->updateOrderStatus(
            $order->id,
            $returnStatus,
            'Order sent back to confirmation by delivery person as ' . $returnStatus . '. Reason: ' . $note
        );

        $this->addHistory(
            $order->id,
            $order->status,
            'Delivery person returned this order to the confirmation workflow.'
        );

        return $order->fresh([
            'client',
            'vendor',
            'items.product',
            'history.user',
            'confirmationAgent',
            'deliveryAgent',
            'deliveryPerson',
            'deliveryIntegration',
        ]);
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
            'delivery_city' => $deliveryCity ?: $order->delivery_city,
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
            ?? $response['code']
            ?? $response['data']['code']
            ?? $response['data']['code_shippment']
            ?? $response['data']['code_shipment']
            ?? $response['data']['tracking_code']
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
            'reported' => 'Order reported',
            'shipped' => 'Order shipped',
            'delivered' => 'Order delivered',
            'cancelled' => 'Order cancelled',
            'no_response' => 'No response recorded',
        ];

        $admins = User::where('is_active', true)
            ->whereHas('role', function ($query) {
                $query->whereIn('slug', ['admin', 'superadmin']);
            })
            ->get();

        $users = collect($admins);

        if ($order->confirmationAgent && $this->shouldNotifyConfirmationAgent($status)) {
            $users->push($order->confirmationAgent);
        }

        if ($order->deliveryAgent && $this->shouldNotifyDeliveryWorkflow($status)) {
            $users->push($order->deliveryAgent);
        }

        if ($order->deliveryPerson && $this->shouldNotifyDeliveryWorkflow($status)) {
            $users->push($order->deliveryPerson);
        }

        foreach ($users->filter()->unique('id') as $user) {
            $notificationContent = $this->buildOrderNotificationContent($user, $order, $status, $messages);

            if (!$notificationContent) {
                continue;
            }

            Notification::create([
                'user_id' => $user->id,
                'type' => 'order_status_change',
                'title' => $notificationContent['title'],
                'message' => $notificationContent['message'],
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $status,
                    'recipient_role' => $user->role?->slug,
                ],
            ]);
        }
    }

    private function shouldNotifyConfirmationAgent(string $status): bool
    {
        return in_array($status, ['pending', 'confirmed', 'reported', 'cancelled', 'no_response'], true);
    }

    private function shouldNotifyDeliveryWorkflow(string $status): bool
    {
        return in_array($status, ['picked_up', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refused', 'returned', 'no_response', 'return_requested'], true);
    }

    private function buildOrderNotificationContent(User $user, Order $order, string $status, array $messages): ?array
    {
        $humanStatus = str_replace('_', ' ', $status);

        if ($user->isAdmin()) {
            return [
                'title' => $messages[$status] ?? 'Order updated',
                'message' => "Order #{$order->order_number} status changed to {$humanStatus}",
            ];
        }

        if ($user->isConfirmationAgent() && $this->shouldNotifyConfirmationAgent($status)) {
            return [
                'title' => 'Confirmation workflow update',
                'message' => "Assigned order #{$order->order_number} moved to {$humanStatus}.",
            ];
        }

        if (($user->isDeliveryPerson() || $user->isManager()) && $this->shouldNotifyDeliveryWorkflow($status)) {
            return [
                'title' => 'Delivery workflow update',
                'message' => "Assigned order #{$order->order_number} moved to {$humanStatus}.",
            ];
        }

        return null;
    }

    public function assignDeliveryAgent(int $orderId, array $attributes)
    {
        $order = Order::findOrFail($orderId);
        $updatable = $this->prepareDeliveryAssignmentAttributes($order, $attributes);

        if (!empty($updatable)) {
            $order->update($updatable);
            $this->addHistory($orderId, $order->status, 'Delivery assignment updated');
        }

        return $order->fresh(['deliveryAgent', 'deliveryPerson', 'confirmationAgent', 'deliveryIntegration']);
    }

    public function assignConfirmationAgentToSelf(int $orderId, User $user)
    {
        return DB::transaction(function () use ($orderId, $user) {
            $order = Order::lockForUpdate()->findOrFail($orderId);

            if ($order->confirmation_agent_id && (int) $order->confirmation_agent_id !== (int) $user->id) {
                abort(422, 'This order is already assigned to another confirmation agent.');
            }

            if (in_array($order->status, ['delivered', 'returned'], true)) {
                abort(422, 'Completed orders cannot be assigned to a confirmation agent.');
            }

            if ((int) $order->confirmation_agent_id !== (int) $user->id) {
                $order->update([
                    'confirmation_agent_id' => $user->id,
                    'confirmation_assigned_at' => now(),
                ]);
                $this->addHistory($order->id, $order->status, 'Order assigned to confirmation agent ' . $user->name);
            }

            return $order->fresh(['client', 'vendor', 'items.product', 'confirmationAgent']);
        });
    }

    public function updateConfirmationAssignment(int $orderId, ?int $confirmationAgentId, bool $resetToPending = false, ?string $note = null)
    {
        return DB::transaction(function () use ($orderId, $confirmationAgentId, $resetToPending, $note) {
            $order = Order::lockForUpdate()->findOrFail($orderId);

            $order->update([
                'confirmation_agent_id' => $confirmationAgentId,
                'confirmation_assigned_at' => $confirmationAgentId ? now() : null,
                'callback_date' => $confirmationAgentId ? $order->callback_date : null,
            ]);

            $historyNote = $note;

            if (!$historyNote) {
                $historyNote = $confirmationAgentId
                    ? 'Confirmation agent assignment updated.'
                    : 'Confirmation agent assignment removed.';
            }

            $this->addHistory($order->id, $order->status, $historyNote);

            if ($resetToPending && $order->status !== 'pending') {
                $order = $this->updateOrderStatus(
                    $order->id,
                    'pending',
                    'Order reset to pending for reassignment.'
                );
            }

            return $order->fresh(['client', 'vendor', 'items.product', 'confirmationAgent']);
        });
    }

    public function updateConfirmationWorkflow(int $orderId, User $user, array $data)
    {
        return DB::transaction(function () use ($orderId, $user, $data) {
            $order = Order::with('items')->lockForUpdate()->findOrFail($orderId);

            if ((int) $order->confirmation_agent_id !== (int) $user->id) {
                abort(403, 'You are not allowed to manage this order.');
            }

            $assignmentPayload = $this->prepareDeliveryAssignmentAttributes($order, $data);
            if (!empty($assignmentPayload)) {
                $order->update($assignmentPayload);
                $this->addHistory($order->id, $order->status, 'Delivery assignment updated by confirmation agent.');
                $order->refresh();
                $order->load('items');
            }

            $baseItems = $order->items->where('is_upsell', false)->values();
            $previousCallbackDate = $order->callback_date;
            $previousShippingAddress = $order->shipping_address;
            $previousNotes = $order->notes;
            $previousDiscount = (float) $order->discount;
            $existingBaseItems = $baseItems
                ->map(fn ($item) => [
                    'product_id' => (int) $item->product_id,
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                ])
                ->values();
            $existingUpsellCount = $order->items->where('is_upsell', true)->count();
            $existingUpsellSubtotal = (float) $order->items->where('is_upsell', true)->sum('subtotal');
            $baseItemsPayload = array_key_exists('items', $data)
                ? collect($data['items'] ?? [])
                    ->filter(fn ($item) => !empty($item['product_id']) && (int) ($item['quantity'] ?? 0) > 0)
                    ->map(function ($item) {
                        $price = (float) ($item['price'] ?? 0);
                        $quantity = (int) $item['quantity'];

                        return [
                            'product_id' => (int) $item['product_id'],
                            'quantity' => $quantity,
                            'price' => $price,
                            'subtotal' => $price * $quantity,
                            'is_upsell' => false,
                        ];
                    })
                    ->values()
                : $baseItems
                    ->map(fn ($item) => [
                        'product_id' => (int) $item->product_id,
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->price,
                        'subtotal' => (float) $item->subtotal,
                        'is_upsell' => false,
                    ])
                    ->values();
            $upsellItems = collect($data['upsell_items'] ?? [])
                ->filter(fn ($item) => !empty($item['product_id']) && (int) ($item['quantity'] ?? 0) > 0)
                ->map(function ($item) {
                    $price = (float) ($item['price'] ?? 0);
                    $quantity = (int) $item['quantity'];

                    return [
                        'product_id' => (int) $item['product_id'],
                        'quantity' => $quantity,
                        'price' => $price,
                        'subtotal' => $price * $quantity,
                        'is_upsell' => true,
                    ];
                })
                ->values();

            $combinedItems = $baseItemsPayload
                ->concat($upsellItems)
                ->values()
                ->all();

            ['subtotal' => $subtotal, 'total' => $total] = $this->calculateOrderTotals($combinedItems, [
                'shipping_cost' => $order->shipping_cost,
                'shipping_included_in_price' => $order->shipping_included_in_price,
                'tax' => $order->tax,
                'discount' => $data['discount'] ?? $order->discount,
            ], $order);

            $callbackDate = $data['callback_date'] ?? null;
            $order->update([
                'callback_date' => $callbackDate ?: null,
                'subtotal' => $subtotal,
                'total' => $total,
                'discount' => array_key_exists('discount', $data)
                    ? (float) ($data['discount'] ?? 0)
                    : $order->discount,
                'shipping_address' => $data['shipping_address'] ?? $order->shipping_address,
                'notes' => $data['notes'] ?? $order->notes,
            ]);

            if (array_key_exists('shipping_address', $data) && $order->client) {
                $order->client->update([
                    'address' => $data['shipping_address'],
                ]);
            }

            $order->items()->delete();

            foreach ($baseItemsPayload->concat($upsellItems) as $item) {
                $product = \App\Models\Product::find($item['product_id']);

                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $product?->name,
                    'sku' => $product?->sku,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                    'is_upsell' => (bool) ($item['is_upsell'] ?? false),
                ]);
            }

            if ($callbackDate) {
                $this->addHistory($order->id, $order->status, 'Callback scheduled for ' . $callbackDate . '.');
            } elseif ($previousCallbackDate) {
                $this->addHistory($order->id, $order->status, 'Callback cleared.');
            }

            if (array_key_exists('shipping_address', $data) && $previousShippingAddress !== $order->shipping_address) {
                $this->addHistory($order->id, $order->status, 'Shipping address updated by confirmation agent.');
            }

            if (array_key_exists('notes', $data) && $previousNotes !== $order->notes) {
                $this->addHistory($order->id, $order->status, 'Workflow notes updated by confirmation agent.');
            }

            if (array_key_exists('discount', $data) && abs($previousDiscount - (float) $order->discount) > 0.001) {
                $this->addHistory($order->id, $order->status, 'Discount updated by confirmation agent.');
            }

            if (
                array_key_exists('items', $data)
                && $existingBaseItems->values()->all() !== $baseItemsPayload
                    ->map(fn ($item) => [
                        'product_id' => (int) $item['product_id'],
                        'quantity' => (int) $item['quantity'],
                        'price' => (float) $item['price'],
                    ])
                    ->values()
                    ->all()
            ) {
                $this->addHistory($order->id, $order->status, 'Base products updated by confirmation agent.');
            }

            if (
                $existingUpsellCount !== $upsellItems->count()
                || abs($existingUpsellSubtotal - (float) $upsellItems->sum('subtotal')) > 0.001
            ) {
                $this->addHistory($order->id, $order->status, 'Upsell products updated by confirmation agent.');
            }

            if (!empty($data['status']) && $data['status'] !== $order->status) {
                $order = $this->updateOrderStatus(
                    $order->id,
                    $data['status'],
                    'Order updated by confirmation agent.'
                );
            }

            return $order->fresh([
                'client',
                'vendor',
                'items.product',
                'history.user',
                'confirmationAgent',
                'deliveryAgent',
                'deliveryPerson',
                'deliveryIntegration',
            ]);
        });
    }

    private function prepareDeliveryAssignmentAttributes(Order $order, array $attributes): array
    {
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
            $updatable['delivery_city'] = $attributes['delivery_city'];
        }

        if (array_key_exists('delivery_integration_id', $attributes) && !empty($attributes['delivery_integration_id'])) {
            $updatable['delivery_person_id'] = null;
            $updatable['delivery_agent_id'] = null;
            $updatable['returned_to_confirmation_at'] = null;
        }

        if (array_key_exists('delivery_person_id', $attributes) && !empty($attributes['delivery_person_id'])) {
            $updatable['delivery_integration_id'] = null;
            $updatable['delivery_tracking_code'] = null;
            $updatable['delivery_status'] = null;
            $updatable['sent_to_delivery_at'] = null;
            $updatable['delivery_city'] = null;
            $updatable['returned_to_confirmation_at'] = null;
        }

        if (array_key_exists('delivery_integration_id', $attributes) && empty($attributes['delivery_integration_id'])) {
            $updatable['delivery_tracking_code'] = null;
            $updatable['delivery_status'] = null;
            $updatable['sent_to_delivery_at'] = null;
            $updatable['delivery_city'] = array_key_exists('delivery_city', $updatable)
                ? $updatable['delivery_city']
                : null;
        }

        $currentValues = collect($updatable)
            ->reject(fn ($value, $key) => $order->{$key} === $value)
            ->all();

        return $currentValues;
    }

    private function prepareConfirmationAssignmentAttributes(Order $order, array $attributes): array
    {
        if (!array_key_exists('confirmation_agent_id', $attributes)) {
            return [];
        }

        $nextAgentId = !empty($attributes['confirmation_agent_id'])
            ? (int) $attributes['confirmation_agent_id']
            : null;
        $currentAgentId = !empty($order->confirmation_agent_id)
            ? (int) $order->confirmation_agent_id
            : null;

        if ($nextAgentId === $currentAgentId) {
            return [];
        }

        return [
            'confirmation_assigned_at' => $nextAgentId ? now() : null,
        ];
    }

    /**
     * Platform fee = product cost + shipping + fulfillment.
     * No extra Frais COD / percentage commission is applied here.
     */
    public function applySellerFinancials(Order $order): Order
    {
        if (!$order->vendor_id) {
            $order->update([
                'seller_net_profit' => 0,
                'commission_amount' => 0,
            ]);

            return $order->fresh(['items.product', 'client', 'vendor']);
        }

        $order->loadMissing('items.product');
        $fulfillmentCost = (float) \App\Models\Setting::get('order_fulfillment_cost', 10.0);
        $sellerNetProfit = $order->calculateProfit($fulfillmentCost);

        $order->update([
            'seller_net_profit' => $sellerNetProfit,
            'commission_amount' => (float) $order->total - $sellerNetProfit,
        ]);

        return $order->fresh(['items.product', 'client', 'vendor']);
    }

    private function calculateOrderTotals(array $items, array $data, ?Order $order = null): array
    {
        $subtotal = collect($items)->sum(function ($item) {
            if (isset($item['subtotal'])) {
                return (float) $item['subtotal'];
            }

            return ((float) ($item['price'] ?? 0)) * ((int) ($item['quantity'] ?? 0));
        });

        $shippingIncludedInPrice = (bool) ($data['shipping_included_in_price'] ?? $order?->shipping_included_in_price ?? false);
        $shippingCost = (float) ($data['shipping_cost'] ?? $order?->shipping_cost ?? 0);
        $tax = (float) ($data['tax'] ?? $order?->tax ?? 0);
        $discount = (float) ($data['discount'] ?? $order?->discount ?? 0);
        $shopifySurcharge = $this->resolveImportedShopifySurcharge($data, $order);

        $total = $subtotal + $tax - $discount + $shopifySurcharge;

        if (!$shippingIncludedInPrice) {
            $total += $shippingCost;
        }

        return [
            'subtotal' => $subtotal,
            'total' => $total,
            'shipping_included_in_price' => $shippingIncludedInPrice,
        ];
    }

    private function resolveImportedShopifySurcharge(array $data, ?Order $order = null): float
    {
        $source = $data['source'] ?? $order?->source;
        $externalOrderId = $data['external_order_id'] ?? $order?->external_order_id;

        if ($source !== 'shopify') {
            return 0.0;
        }

        if (blank($externalOrderId)) {
            return 0.0;
        }

        return self::IMPORTED_SHOPIFY_SURCHARGE;
    }
}
