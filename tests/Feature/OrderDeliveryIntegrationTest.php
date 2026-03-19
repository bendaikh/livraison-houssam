<?php

namespace Tests\Feature;

use App\Models\ApiIntegration;
use App\Models\Client;
use App\Models\City;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderDeliveryIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_order_to_confirmed_with_delivery_company_saves_tracking_code_returned_as_code(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        Http::fake([
            'https://bmdelivery.ma/api/*' => Http::response([
                'code' => 'BMD-123456',
            ], 200),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'vendor_id' => null,
            'delivery_agent_id' => null,
            'delivery_integration_id' => $integration->id,
            'delivery_person_id' => null,
            'confirmation_agent_id' => null,
            'delivery_city' => 'Casablanca',
            'status' => 'confirmed',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 120,
            ]],
            'shipping_cost' => 25,
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Rue Hassan II',
            'city' => 'Casablanca',
            'notes' => 'Send with BMDelivery',
            'whatsapp' => '0611111111',
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'confirmed');
        $response->assertJsonPath('delivery_tracking_code', 'BMD-123456');

        $order->refresh();

        $this->assertSame('confirmed', $order->status);
        $this->assertSame($integration->id, $order->delivery_integration_id);
        $this->assertSame('Casablanca', $order->delivery_city);
        $this->assertSame('BMD-123456', $order->delivery_tracking_code);
        $this->assertSame('sent', $order->delivery_status);
        $this->assertNotNull($order->sent_to_delivery_at);
        Http::assertSentCount(1);
    }

    public function test_creating_order_as_confirmed_with_delivery_company_persists_status_and_tracking_code(): void
    {
        $admin = $this->createAdmin();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();

        Http::fake([
            'https://bmdelivery.ma/api/*' => Http::response([
                'code' => 'BMD-654321',
            ], 200),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/orders', [
            'client_name' => 'Client Confirmed',
            'client_phone' => '0622222222',
            'delivery_integration_id' => $integration->id,
            'delivery_city' => 'Casablanca',
            'status' => 'confirmed',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 140,
            ]],
            'shipping_cost' => 25,
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Bd Mohammed V',
            'city' => 'Casablanca',
            'notes' => 'Create confirmed order',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'confirmed');
        $response->assertJsonPath('delivery_tracking_code', 'BMD-654321');

        $order = Order::firstOrFail();

        $this->assertSame('confirmed', $order->status);
        $this->assertSame($integration->id, $order->delivery_integration_id);
        $this->assertSame('Casablanca', $order->delivery_city);
        $this->assertSame('BMD-654321', $order->delivery_tracking_code);
        Http::assertSentCount(1);
    }

    public function test_bmdelivery_city_endpoint_falls_back_to_saved_cities_when_provider_connection_fails(): void
    {
        $admin = $this->createAdmin();
        $integration = $this->createDeliveryIntegration();

        City::create([
            'name' => 'Kenitra',
            'delivery_cost' => 35,
            'is_active' => true,
        ]);

        City::create([
            'name' => 'Casablanca',
            'delivery_cost' => 25,
            'is_active' => true,
        ]);

        Http::fake([
            'https://bmdelivery.ma/api/*' => function () {
                throw new ConnectionException('cURL error 35: TLS connect error');
            },
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/orders/delivery-companies/{$integration->id}/cities");

        $response->assertOk();
        $response->assertHeader('X-Delivery-Cities-Source', 'fallback');
        $response->assertHeader('X-Delivery-Cities-Warning', 'Live BMDelivery city lookup is unavailable from this server right now. Showing the saved city list instead.');
        $response->assertJsonFragment(['name' => 'Kenitra']);
        $response->assertJsonFragment(['name' => 'Casablanca']);
    }

    public function test_confirming_order_keeps_order_saved_and_returns_clear_tls_error_message(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        Http::fake([
            'https://bmdelivery.ma/api/*' => function () {
                throw new ConnectionException('cURL error 35: TLS connect error');
            },
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'vendor_id' => null,
            'delivery_agent_id' => null,
            'delivery_integration_id' => $integration->id,
            'delivery_person_id' => null,
            'confirmation_agent_id' => null,
            'delivery_city' => 'Kenitra',
            'status' => 'confirmed',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 120,
            ]],
            'shipping_cost' => 35,
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Avenue Med V',
            'city' => 'Kenitra',
            'notes' => 'TLS failure test',
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'confirmed');
        $response->assertJsonPath('delivery_tracking_code', null);
        $this->assertStringContainsString('TLS/SSL handshake error', (string) $response->json('delivery_error'));
        $this->assertStringContainsString('BMDelivery', (string) $response->json('delivery_error'));

        $order->refresh();
        $this->assertSame('confirmed', $order->status);
        $this->assertNull($order->delivery_tracking_code);
    }

    public function test_bmdelivery_confirmation_normalizes_phone_to_local_06_format(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        $client->update(['phone' => '+212 6 12 34 56 78']);
        $order->update(['phone' => '+212 6 12 34 56 78']);

        Http::fake([
            'https://bmdelivery.ma/api/*' => Http::response([
                'code' => 'BMD-777888',
            ], 200),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'vendor_id' => null,
            'delivery_agent_id' => null,
            'delivery_integration_id' => $integration->id,
            'delivery_person_id' => null,
            'confirmation_agent_id' => null,
            'delivery_city' => 'Casablanca',
            'status' => 'confirmed',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 120,
            ]],
            'shipping_cost' => 25,
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Rue Hassan II',
            'city' => 'Casablanca',
            'notes' => 'Normalize BMDelivery phone',
        ]);

        $response->assertOk();
        $response->assertJsonPath('delivery_tracking_code', 'BMD-777888');

        Http::assertSent(function (HttpRequest $request) {
            return str_contains($request->url(), '/client/post/colis/add-colis/')
                && $request['phone'] === '0612345678';
        });
    }

    public function test_manual_bmdelivery_sync_uses_latest_event_date_when_updating_status(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        $order->update([
            'status' => 'confirmed',
            'delivery_integration_id' => $integration->id,
            'delivery_tracking_code' => 'BMD-TRACK-1',
            'delivery_status' => 'Expédié',
        ]);

        Http::fake([
            'https://bmdelivery.ma/api/*' => Http::response([
                'data' => [
                    ['status' => 'En cours de livraison', 'Date_Evenement' => 100],
                    ['status' => 'Livré', 'Date_Evenement' => 300],
                    ['status' => 'Prêt pour expédition', 'Date_Evenement' => 50],
                ],
            ], 200),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/orders/{$order->id}/sync-delivery-status");

        $response->assertOk();
        $response->assertJsonPath('result.new_delivery_status', 'Livré');
        $response->assertJsonPath('result.new_order_status', 'delivered');
        $response->assertJsonPath('order.status', 'delivered');

        $order->refresh();
        $this->assertSame('Livré', $order->delivery_status);
        $this->assertSame('delivered', $order->status);
    }

    public function test_bmdelivery_reporte_status_maps_to_reported_order_status(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        $order->update([
            'status' => 'confirmed',
            'delivery_integration_id' => $integration->id,
            'delivery_tracking_code' => 'BMD-TRACK-REPORTE',
            'delivery_status' => 'Expédié',
        ]);

        Http::fake([
            'https://bmdelivery.ma/api/*' => Http::response([
                'data' => [
                    ['status' => 'En cours de livraison', 'Date_Evenement' => 100],
                    ['status' => 'Reporté', 'Date_Evenement' => 600],
                ],
            ], 200),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/orders/{$order->id}/sync-delivery-status");

        $response->assertOk();
        $response->assertJsonPath('result.new_delivery_status', 'Reporté');
        $response->assertJsonPath('result.new_order_status', 'reported');
        $response->assertJsonPath('order.status', 'reported');

        $order->refresh();
        $this->assertSame('Reporté', $order->delivery_status);
        $this->assertSame('reported', $order->status);
    }

    public function test_bmdelivery_webhook_accepts_nested_status_payloads(): void
    {
        $client = $this->createClient();
        $product = $this->createProduct();
        $integration = $this->createDeliveryIntegration();
        $order = $this->createPendingOrder($client, $product);

        $order->update([
            'status' => 'shipped',
            'delivery_integration_id' => $integration->id,
            'delivery_tracking_code' => 'BMD-TRACK-2',
            'delivery_status' => 'Expédié',
        ]);

        $response = $this->postJson('/api/webhooks/bmdelivery/status-update', [
            'tracking_code' => 'BMD-TRACK-2',
            'data' => [
                ['status' => 'Livré', 'Date_Evenement' => 500],
                ['status' => 'En cours de livraison', 'Date_Evenement' => 400],
            ],
        ]);

        $response->assertOk();

        $order->refresh();
        $this->assertSame('Livré', $order->delivery_status);
        $this->assertSame('delivered', $order->status);
    }

    public function test_show_order_response_includes_shipping_price_resolution_metadata(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();

        City::create([
            'name' => 'Meknes',
            'delivery_cost' => 42,
            'is_active' => true,
        ]);

        $order = Order::create([
            'client_id' => $client->id,
            'status' => 'pending',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 162,
            'shipping_cost' => 42,
            'shipping_address' => 'Meknes address',
            'city' => 'Meknes',
            'phone' => $client->phone,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 1,
            'price' => 120,
            'subtotal' => 120,
            'is_upsell' => false,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/orders/{$order->id}");

        $response->assertOk();
        $response->assertJsonPath('shipping_cost', '42.00');
        $response->assertJsonPath('resolved_shipping_cost', 42);
        $response->assertJsonPath('effective_shipping_cost', 42);
        $response->assertJsonPath('shipping_cost_resolution.source', 'city_table');
    }

    public function test_creating_order_in_auto_mode_resolves_shipping_cost_from_city(): void
    {
        $admin = $this->createAdmin();
        $product = $this->createProduct();

        City::create([
            'name' => 'Rabat',
            'delivery_cost' => 30,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/orders', [
            'client_name' => 'Client Auto',
            'client_phone' => '0633333333',
            'status' => 'pending',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 140,
            ]],
            'shipping_cost' => null,
            'shipping_cost_source' => 'auto',
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Rabat address',
            'city' => 'Rabat',
            'notes' => 'Auto shipping resolution',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('shipping_cost', '30.00');
        $response->assertJsonPath('effective_shipping_cost', 30);

        $order = Order::firstOrFail();
        $this->assertSame('30.00', $order->shipping_cost);
    }

    public function test_updating_order_in_auto_mode_recalculates_shipping_cost_when_city_changes(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();

        City::create([
            'name' => 'Casablanca',
            'delivery_cost' => 25,
            'is_active' => true,
        ]);

        City::create([
            'name' => 'Kenitra',
            'delivery_cost' => 40,
            'is_active' => true,
        ]);

        $order = $this->createPendingOrder($client, $product);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'vendor_id' => null,
            'delivery_agent_id' => null,
            'delivery_integration_id' => null,
            'delivery_person_id' => null,
            'confirmation_agent_id' => null,
            'status' => 'pending',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 120,
            ]],
            'shipping_cost' => 25,
            'shipping_cost_source' => 'auto',
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Avenue Med V',
            'city' => 'Kenitra',
            'notes' => 'City changed',
        ]);

        $response->assertOk();
        $response->assertJsonPath('shipping_cost', '40.00');
        $response->assertJsonPath('effective_shipping_cost', 40);

        $order->refresh();
        $this->assertSame('Kenitra', $order->city);
        $this->assertSame('40.00', $order->shipping_cost);
    }

    public function test_updating_order_in_auto_mode_preserves_saved_shipping_cost_when_city_is_unchanged(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $product = $this->createProduct();

        City::create([
            'name' => 'Casablanca',
            'delivery_cost' => 25,
            'is_active' => true,
        ]);

        $order = $this->createPendingOrder($client, $product);
        $order->update([
            'shipping_cost' => 60,
            'total' => 180,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $client->id,
            'client_name' => $client->name,
            'client_phone' => $client->phone,
            'vendor_id' => null,
            'delivery_agent_id' => null,
            'delivery_integration_id' => null,
            'delivery_person_id' => null,
            'confirmation_agent_id' => null,
            'status' => 'pending',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 120,
            ]],
            'shipping_cost' => 25,
            'shipping_cost_source' => 'auto',
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Rue Hassan II',
            'city' => 'Casablanca',
            'notes' => 'Keep saved shipping',
        ]);

        $response->assertOk();
        $response->assertJsonPath('shipping_cost', '60.00');
        $response->assertJsonPath('effective_shipping_cost', 60);

        $order->refresh();
        $this->assertSame('60.00', $order->shipping_cost);
    }

    private function createAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['view_orders', 'update_order_status', 'manage_orders'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createClient(): Client
    {
        return Client::create([
            'name' => 'Client Test',
            'phone' => '0611111111',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);
    }

    private function createProduct(): Product
    {
        return Product::create([
            'name' => 'Test Product',
            'sku' => 'SKU-TEST-1',
            'price' => 120,
            'company_price' => 80,
            'stock_quantity' => 20,
            'is_active' => true,
        ]);
    }

    private function createDeliveryIntegration(): ApiIntegration
    {
        return ApiIntegration::create([
            'name' => 'BMDelivery',
            'type' => 'delivery',
            'provider' => 'bmdelivery',
            'is_active' => true,
            'credentials' => [
                'api_token' => 'test-token',
            ],
        ]);
    }

    private function createPendingOrder(Client $client, Product $product): Order
    {
        $order = Order::create([
            'client_id' => $client->id,
            'status' => 'pending',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 145,
            'shipping_cost' => 25,
            'shipping_address' => 'Rue Hassan II',
            'city' => 'Casablanca',
            'phone' => $client->phone,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 1,
            'price' => 120,
            'subtotal' => 120,
            'is_upsell' => false,
        ]);

        return $order;
    }
}
