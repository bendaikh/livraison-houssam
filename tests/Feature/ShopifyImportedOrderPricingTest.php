<?php

namespace Tests\Feature;

use App\Models\ApiIntegration;
use App\Models\Client;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShopifyImportedOrderPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_imported_shopify_orders_get_one_dirham_surcharge(): void
    {
        ApiIntegration::create([
            'name' => 'Shopify',
            'type' => 'shopify',
            'provider' => 'shopify',
            'credentials' => [],
            'is_active' => true,
        ]);

        Product::create([
            'name' => 'Imported Product',
            'sku' => 'SHOPIFY-SKU-1',
            'price' => 100,
            'company_price' => 100,
            'vendor_price' => 70,
            'stock_quantity' => 10,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/webhooks/shopify/orders/create', [
            'id' => 'shopify-order-1001',
            'name' => '#1001',
            'subtotal_price' => 100,
            'total_tax' => 2,
            'total_discounts' => 3,
            'total_shipping_price_set' => [
                'shop_money' => ['amount' => 5],
            ],
            'line_items' => [
                [
                    'sku' => 'SHOPIFY-SKU-1',
                    'name' => 'Imported Product',
                    'quantity' => 1,
                    'price' => 100,
                ],
            ],
            'customer' => [
                'first_name' => 'Fatima',
                'last_name' => 'Shopify',
                'email' => 'fatima@example.com',
                'phone' => '0600000001',
            ],
            'shipping_address' => [
                'address1' => 'Rue Shopify',
                'city' => 'Casablanca',
            ],
        ]);

        $response->assertCreated();

        $order = \App\Models\Order::query()->firstOrFail();

        $this->assertSame('shopify', $order->source);
        $this->assertSame('shopify-order-1001', $order->external_order_id);
        $this->assertSame(105.0, (float) $order->total);
    }

    public function test_manual_orders_marked_as_shopify_do_not_get_the_surcharge(): void
    {
        $admin = $this->createAdmin();
        $client = Client::create([
            'name' => 'Manual Client',
            'phone' => '0600000002',
            'address' => 'Manual Address',
            'city' => 'Casablanca',
            'is_active' => true,
        ]);

        $product = Product::create([
            'name' => 'Manual Product',
            'sku' => 'MANUAL-SKU-1',
            'price' => 100,
            'company_price' => 100,
            'vendor_price' => 70,
            'stock_quantity' => 10,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/orders', [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'status' => 'pending',
            'source' => 'shopify',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'price' => 100,
                ],
            ],
            'shipping_cost' => 5,
            'tax' => 2,
            'discount' => 3,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('source', 'shopify');
        $response->assertJsonPath('external_order_id', null);
        $this->assertSame(104.0, (float) $response->json('total'));
    }

    private function createAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['view_orders', 'create_orders', 'edit_orders'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
