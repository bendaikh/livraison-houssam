<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderHistory;
use App\Models\Notification;
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
                'status' => $data['status'] ?? 'pending',
                'source' => $data['source'] ?? 'manual',
                'external_order_id' => $data['external_order_id'] ?? null,
                'subtotal' => $subtotal,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'total' => $total,
                'commission_amount' => $commissionAmount,
                'shipping_address' => $data['shipping_address'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Create order items
            foreach ($data['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
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

    public function updateOrderStatus(int $orderId, string $status, ?string $note = null)
    {
        return DB::transaction(function () use ($orderId, $status, $note) {
            $order = Order::findOrFail($orderId);
            $oldStatus = $order->status;

            $order->update(['status' => $status]);

            // Update timestamp fields
            match($status) {
                'confirmed' => $order->update(['confirmed_at' => now()]),
                'shipped' => $order->update(['shipped_at' => now()]),
                'delivered' => $order->update(['delivered_at' => now()]),
                'cancelled' => $order->update(['cancelled_at' => now()]),
                default => null
            };

            // Deduct stock when order is confirmed
            if ($status === 'confirmed' && $oldStatus !== 'confirmed') {
                $this->stockService->deductStockForOrder($orderId);
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

            return $order->fresh(['items.product', 'client', 'history']);
        });
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

    public function assignDeliveryAgent(int $orderId, int $deliveryAgentId)
    {
        $order = Order::findOrFail($orderId);
        $order->update(['delivery_agent_id' => $deliveryAgentId]);

        $this->addHistory($orderId, $order->status, "Delivery agent assigned");

        return $order;
    }
}
