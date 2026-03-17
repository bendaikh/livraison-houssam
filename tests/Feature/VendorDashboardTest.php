<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VendorDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendor_dashboard_returns_seller_scoped_metrics_and_billing(): void
    {
        $vendorRole = Role::firstOrCreate(
            ['slug' => 'vendor'],
            [
                'name' => 'Vendor',
                'permissions' => ['view_own_orders'],
            ]
        );

        $primaryUser = User::factory()->create([
            'role_id' => $vendorRole->id,
            'is_active' => true,
        ]);
        $otherUser = User::factory()->create([
            'role_id' => $vendorRole->id,
            'is_active' => true,
        ]);

        $primaryVendor = Vendor::create([
            'user_id' => $primaryUser->id,
            'name' => 'Primary Seller',
            'email' => 'primary@example.com',
            'commission_rate' => 10,
            'billing_frequency' => 'weekly',
            'is_active' => true,
        ]);
        $otherVendor = Vendor::create([
            'user_id' => $otherUser->id,
            'name' => 'Other Seller',
            'email' => 'other@example.com',
            'commission_rate' => 10,
            'billing_frequency' => 'weekly',
            'is_active' => true,
        ]);

        $client = Client::create([
            'name' => 'Client Test',
            'phone' => '0612345678',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);

        $primaryProduct = Product::create([
            'name' => 'Primary Product',
            'sku' => 'PRIMARY-1',
            'price' => 200,
            'company_price' => 50,
            'vendor_price' => 50,
            'cost_price' => 50,
            'stock_quantity' => 10,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);
        $inactiveProduct = Product::create([
            'name' => 'Inactive Product',
            'sku' => 'PRIMARY-2',
            'price' => 120,
            'company_price' => 40,
            'vendor_price' => 40,
            'cost_price' => 40,
            'stock_quantity' => 10,
            'min_stock_quantity' => 1,
            'is_active' => false,
        ]);

        DB::table('marketplace_products')->insert([
            [
                'product_id' => $primaryProduct->id,
                'vendor_id' => $primaryVendor->id,
                'is_active' => true,
                'commission_rate' => 10,
                'assigned_quantity' => 10,
                'activated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'product_id' => $inactiveProduct->id,
                'vendor_id' => $primaryVendor->id,
                'is_active' => true,
                'commission_rate' => 10,
                'assigned_quantity' => 10,
                'activated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $deliveredOrder = Order::create([
            'client_id' => $client->id,
            'vendor_id' => $primaryVendor->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 200,
            'shipping_cost' => 25,
            'discount' => 0,
            'total' => 200,
            'commission_amount' => 20,
            'delivered_at' => now(),
        ]);
        OrderItem::create([
            'order_id' => $deliveredOrder->id,
            'product_id' => $primaryProduct->id,
            'product_name' => $primaryProduct->name,
            'sku' => $primaryProduct->sku,
            'quantity' => 1,
            'price' => 200,
            'subtotal' => 200,
            'is_upsell' => false,
        ]);

        $pendingOrder = Order::create([
            'client_id' => $client->id,
            'vendor_id' => $primaryVendor->id,
            'status' => 'pending',
            'source' => 'manual',
            'subtotal' => 150,
            'shipping_cost' => 20,
            'discount' => 0,
            'total' => 150,
        ]);
        OrderItem::create([
            'order_id' => $pendingOrder->id,
            'product_id' => $primaryProduct->id,
            'product_name' => $primaryProduct->name,
            'sku' => $primaryProduct->sku,
            'quantity' => 1,
            'price' => 150,
            'subtotal' => 150,
            'is_upsell' => false,
        ]);

        Order::create([
            'client_id' => $client->id,
            'vendor_id' => $otherVendor->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 999,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 999,
            'commission_amount' => 99,
            'delivered_at' => now(),
        ]);

        Sanctum::actingAs($primaryUser);

        $response = $this->getJson('/api/dashboard?period=daily');

        $response->assertOk();
        $response->assertJsonPath('seller_overview.orders.total', 2);
        $response->assertJsonPath('seller_overview.orders.pending', 1);
        $response->assertJsonPath('seller_overview.orders.delivered', 1);
        $response->assertJsonPath('seller_overview.total_revenue', 350);
        $response->assertJsonPath('seller_overview.total_profit', 205);
        $response->assertJsonPath('seller_billing.unpaid_orders_count', 1);
        $response->assertJsonPath('seller_billing.gross_sales', 200);
        $response->assertJsonPath('seller_billing.commission_amount', 20);
        $response->assertJsonPath('seller_billing.estimated_payout', 180);
        $response->assertJsonPath('products.total', 2);
        $response->assertJsonPath('products.active', 1);
    }
}
