<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderStockStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_is_not_deducted_on_confirmation_but_is_deducted_on_pickup(): void
    {
        $product = $this->createProduct(stockQuantity: 10);
        $order = $this->createOrderWithItem($product, quantity: 2, status: 'pending');
        $orderService = app(OrderService::class);

        $orderService->updateOrderStatus($order->id, 'confirmed');

        $this->assertSame(10, $product->fresh()->stock_quantity);
        $this->assertDatabaseMissing('stock_movements', [
            'order_id' => $order->id,
            'type' => 'out',
        ]);

        $orderService->updateOrderStatus($order->id, 'picked_up');

        $this->assertSame(8, $product->fresh()->stock_quantity);
        $this->assertDatabaseHas('stock_movements', [
            'order_id' => $order->id,
            'product_id' => $product->id,
            'type' => 'out',
            'quantity' => 2,
        ]);
    }

    public function test_returned_order_restores_stock_only_once(): void
    {
        $product = $this->createProduct(stockQuantity: 10);
        $order = $this->createOrderWithItem($product, quantity: 3, status: 'pending');
        $orderService = app(OrderService::class);

        $orderService->updateOrderStatus($order->id, 'picked_up');
        $orderService->updateOrderStatus($order->id, 'returned');
        $orderService->updateOrderStatus($order->id, 'cancelled');

        $this->assertSame(10, $product->fresh()->stock_quantity);
        $this->assertSame(
            1,
            StockMovement::query()
                ->where('order_id', $order->id)
                ->where('type', 'in')
                ->count()
        );
    }

    public function test_order_update_endpoint_restores_stock_when_status_changes_to_returned(): void
    {
        $admin = $this->createAdmin();
        $product = $this->createProduct(stockQuantity: 10);
        $order = $this->createOrderWithItem($product, quantity: 2, status: 'pending');
        $client = $order->client;
        $orderService = app(OrderService::class);

        $orderService->updateOrderStatus($order->id, 'picked_up');

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'status' => 'returned',
            'source' => 'manual',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => 50,
                ],
            ],
            'shipping_cost' => 0,
            'tax' => 0,
            'discount' => 0,
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'returned');
        $this->assertSame(10, $product->fresh()->stock_quantity);
        $this->assertSame(
            1,
            StockMovement::query()
                ->where('order_id', $order->id)
                ->where('type', 'in')
                ->count()
        );
    }

    private function createAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['view_orders', 'update_order_status', 'manage_stock'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createOrderWithItem(Product $product, int $quantity, string $status): Order
    {
        $client = Client::create([
            'name' => 'Client Stock',
            'phone' => '0600000000',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);

        $order = Order::create([
            'client_id' => $client->id,
            'status' => $status,
            'source' => 'manual',
            'subtotal' => 50 * $quantity,
            'total' => 50 * $quantity,
            'phone' => $client->phone,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => $quantity,
            'price' => 50,
            'subtotal' => 50 * $quantity,
            'is_upsell' => false,
        ]);

        return $order->fresh(['client', 'items.product']);
    }

    private function createProduct(int $stockQuantity): Product
    {
        return Product::create([
            'name' => 'Stock Product',
            'sku' => 'SKU-' . uniqid(),
            'price' => 50,
            'company_price' => 50,
            'vendor_price' => 25,
            'stock_quantity' => $stockQuantity,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);
    }
}
