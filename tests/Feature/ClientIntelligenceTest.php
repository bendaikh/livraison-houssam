<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ClientIntelligenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_aggregates_orders_by_phone_across_sellers(): void
    {
        $phone = '0611223344';
        $vendorA = $this->createVendor('Shop A');
        $vendorB = $this->createVendor('Shop B');
        $product = $this->createProduct();

        $this->createOrder($phone, 'Ali', $vendorA, 'delivered', 100, $product);
        $this->createOrder($phone, 'Ali', $vendorA, 'cancelled', 80, $product);
        $this->createOrder($phone, 'Ali Ben', $vendorB, 'returned', 60, $product);
        $this->createOrder($phone, 'Ali', $vendorB, 'delivered', 120, $product);

        $profile = app(ClientIntelligenceService::class)->profile('212611223344');

        $this->assertSame('0611223344', $profile['phone']);
        $this->assertSame(4, $profile['total_orders']);
        $this->assertSame(2, $profile['delivered_orders']);
        $this->assertSame(1, $profile['cancelled_orders']);
        $this->assertSame(1, $profile['returned_orders']);
        $this->assertEquals(220.0, $profile['total_spent']);
        $this->assertSame(2, $profile['sellers_count']);
        $this->assertTrue($profile['indicators']['multi_seller']);
        $this->assertCount(4, $profile['timeline']);
        $this->assertNotEmpty($profile['products']);
        $this->assertCount(2, $profile['sellers']);
        $this->assertNotNull($profile['first_order_at']);
        $this->assertNotNull($profile['latest_order_at']);
    }

    public function test_high_cancel_rate_sets_warning_reliability(): void
    {
        $phone = '0699887766';
        $vendor = $this->createVendor('Cancel Shop');
        $product = $this->createProduct();

        $this->createOrder($phone, 'Sara', $vendor, 'cancelled', 50, $product);
        $this->createOrder($phone, 'Sara', $vendor, 'refused', 50, $product);
        $this->createOrder($phone, 'Sara', $vendor, 'delivered', 50, $product);

        $summary = app(ClientIntelligenceService::class)->profile($phone);

        $this->assertTrue($summary['indicators']['high_cancel_rate']);
        $this->assertSame('warning', $summary['reliability']);
        $this->assertFalse($summary['indicators']['trusted']);
    }

    public function test_trusted_indicator_for_good_delivery_history(): void
    {
        $phone = '0655443322';
        $vendor = $this->createVendor('Trusted Shop');
        $product = $this->createProduct();

        foreach (range(1, 4) as $i) {
            $this->createOrder($phone, 'Omar', $vendor, 'delivered', 90 + $i, $product);
        }

        $summary = app(ClientIntelligenceService::class)->profile($phone);

        $this->assertTrue($summary['indicators']['trusted']);
        $this->assertSame('trusted', $summary['reliability']);
        $this->assertFalse($summary['indicators']['high_cancel_rate']);
        $this->assertFalse($summary['indicators']['high_return_rate']);
    }

    public function test_intelligence_endpoint_and_order_list_include_summary(): void
    {
        $admin = $this->createAdmin();
        $phone = '0677001122';
        $vendor = $this->createVendor('API Shop');
        $product = $this->createProduct();
        $order = $this->createOrder($phone, 'Nadia', $vendor, 'delivered', 150, $product);

        $token = $admin->createToken('test')->plainTextToken;

        $profileResponse = $this->withToken($token)
            ->getJson('/api/client-intelligence?phone=' . urlencode($phone));
        $profileResponse->assertOk()
            ->assertJsonPath('phone', '0677001122')
            ->assertJsonPath('total_orders', 1)
            ->assertJsonPath('delivered_orders', 1);

        $showResponse = $this->withToken($token)
            ->getJson('/api/orders/' . $order->id);
        $showResponse->assertOk()
            ->assertJsonPath('client_intelligence.phone', '0677001122')
            ->assertJsonPath('client_intelligence.total_orders', 1)
            ->assertJsonPath('client_intelligence.reliability', 'normal');

        $listResponse = $this->withToken($token)
            ->getJson('/api/orders?list_scope=all&search=' . urlencode($phone));
        $listResponse->assertOk();

        $matched = collect($listResponse->json('data') ?? [])->firstWhere('id', $order->id);
        $this->assertNotNull($matched);
        $this->assertSame('0677001122', $matched['client_intelligence']['phone'] ?? null);
        $this->assertSame(1, $matched['client_intelligence']['total_orders'] ?? null);
    }

    private function createAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['view_orders', 'view_clients'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createVendor(string $name): Vendor
    {
        return Vendor::create([
            'name' => $name,
            'company_name' => $name,
            'email' => strtolower(str_replace(' ', '', $name)) . uniqid() . '@example.com',
            'phone' => '0600' . random_int(100000, 999999),
            'is_active' => true,
            'commission_rate' => 10,
        ]);
    }

    private function createProduct(): Product
    {
        return Product::create([
            'name' => 'Intel Product ' . uniqid(),
            'sku' => 'SKU-' . uniqid(),
            'price' => 100,
            'company_price' => 100,
            'vendor_price' => 50,
            'stock_quantity' => 50,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);
    }

    private function createOrder(
        string $phone,
        string $clientName,
        Vendor $vendor,
        string $status,
        float $total,
        Product $product,
    ): Order {
        $client = Client::firstOrCreate(
            ['phone' => $phone, 'name' => $clientName],
            [
                'address' => 'Casablanca',
                'is_active' => true,
            ]
        );

        $order = Order::create([
            'order_number' => 'ORD-' . uniqid(),
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'status' => $status,
            'source' => 'manual',
            'subtotal' => $total,
            'total' => $total,
            'phone' => $phone,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => $total,
            'subtotal' => $total,
            'is_upsell' => false,
        ]);

        return $order->fresh(['client', 'vendor', 'items']);
    }
}
