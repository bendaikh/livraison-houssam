<?php

namespace Tests\Feature;

use App\Models\BlacklistEntry;
use App\Models\Client;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConfirmationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmation_agent_cannot_confirm_without_delivery_assignment(): void
    {
        $agent = $this->createConfirmationAgent();
        $order = $this->createOrderForConfirmationAgent($agent);

        Sanctum::actingAs($agent);

        $response = $this->patchJson("/api/orders/{$order->id}/confirmation-workflow", [
            'status' => 'confirmed',
            'upsell_items' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['delivery_assignment']);
    }

    public function test_confirmation_agent_cannot_change_status_after_confirming_with_delivery_person(): void
    {
        $agent = $this->createConfirmationAgent();
        $deliveryPerson = $this->createDeliveryPerson();
        $order = $this->createOrderForConfirmationAgent($agent);

        Sanctum::actingAs($agent);

        $confirmResponse = $this->patchJson("/api/orders/{$order->id}/confirmation-workflow", [
            'status' => 'confirmed',
            'delivery_person_id' => $deliveryPerson->id,
            'upsell_items' => [],
        ]);

        $confirmResponse->assertOk();
        $this->assertNotNull($order->fresh()->confirmed_at);

        $changeResponse = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $changeResponse->assertForbidden();
    }

    public function test_confirmation_agent_can_still_change_status_when_delivery_person_is_assigned_but_order_is_pending(): void
    {
        $agent = $this->createConfirmationAgent();
        $deliveryPerson = $this->createDeliveryPerson();
        $order = $this->createOrderForConfirmationAgent($agent);
        $order->update(['delivery_person_id' => $deliveryPerson->id]);

        Sanctum::actingAs($agent);

        $response = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertOk();
        $this->assertSame('cancelled', $order->fresh()->status);
    }

    public function test_status_update_response_includes_delivery_person_relation_after_confirmation(): void
    {
        $agent = $this->createConfirmationAgent();
        $deliveryPerson = $this->createDeliveryPerson();
        $order = $this->createOrderForConfirmationAgent($agent);

        Sanctum::actingAs($agent);

        $response = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'confirmed',
            'delivery_person_id' => $deliveryPerson->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('delivery_person.id', $deliveryPerson->id);
        $response->assertJsonPath('delivery_person.name', $deliveryPerson->name);
    }

    public function test_seller_cannot_change_status_after_confirmation_agent_confirms_order_via_status_endpoint(): void
    {
        $seller = $this->createVendorUser('seller');
        $agent = $this->createConfirmationAgent();
        $order = $this->createConfirmedOrderForVendor($seller->vendor, $agent);

        Sanctum::actingAs($seller);

        $response = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertForbidden();
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_seller_cannot_change_status_after_confirmation_agent_confirms_order_via_edit_endpoint(): void
    {
        $seller = $this->createVendorUser('seller');
        $agent = $this->createConfirmationAgent();
        $order = $this->createConfirmedOrderForVendor($seller->vendor, $agent);
        $product = $this->createProductForVendor($seller->vendor);

        Sanctum::actingAs($seller);

        $response = $this->putJson("/api/orders/{$order->id}", [
            'client_id' => $order->client_id,
            'client_name' => $order->client->name,
            'client_phone' => $order->client->phone,
            'vendor_id' => $seller->vendor->id,
            'delivery_agent_id' => null,
            'delivery_integration_id' => null,
            'delivery_person_id' => null,
            'confirmation_agent_id' => $order->confirmation_agent_id,
            'delivery_city' => 'Rabat',
            'status' => 'cancelled',
            'source' => 'manual',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 140,
            ]],
            'shipping_cost' => 35,
            'shipping_included_in_price' => false,
            'discount' => 0,
            'shipping_address' => 'Rabat',
            'city' => 'Rabat',
            'notes' => 'Seller attempted to change status after delivery handoff.',
        ]);

        $response->assertForbidden();
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_seller_cannot_change_status_for_confirmed_tracked_order_even_without_confirmation_agent(): void
    {
        $seller = $this->createVendorUser('seller');
        $order = $this->createTrackedConfirmedOrderForVendor($seller->vendor);

        Sanctum::actingAs($seller);

        $response = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertForbidden();
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_seller_cannot_change_status_while_delivery_person_is_assigned_or_after_return_to_confirmation(): void
    {
        $seller = $this->createVendorUser('seller');
        $agent = $this->createConfirmationAgent();
        $deliveryPerson = $this->createDeliveryPerson();
        $order = $this->createConfirmedOrderForVendor($seller->vendor, $agent);
        $order->update([
            'delivery_person_id' => $deliveryPerson->id,
        ]);

        Sanctum::actingAs($seller);

        $assignedResponse = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $assignedResponse->assertForbidden();

        $pendingOrder = $this->createOrderForVendor($seller->vendor, $agent);
        $pendingOrder->update([
            'delivery_person_id' => $deliveryPerson->id,
        ]);

        $pendingResponse = $this->patchJson("/api/orders/{$pendingOrder->id}/status", [
            'status' => 'cancelled',
        ]);

        $pendingResponse->assertOk();

        $order->update([
            'delivery_person_id' => null,
            'status' => 'returned',
            'confirmed_at' => null,
            'returned_to_confirmation_at' => now(),
        ]);

        $returnedResponse = $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'pending',
        ]);

        $returnedResponse->assertForbidden();
    }

    public function test_confirmation_workflow_can_update_shipping_address_and_notes(): void
    {
        $agent = $this->createConfirmationAgent();
        $order = $this->createOrderForConfirmationAgent($agent);

        Sanctum::actingAs($agent);

        $response = $this->patchJson("/api/orders/{$order->id}/confirmation-workflow", [
            'shipping_address' => 'Updated street 123, Casablanca',
            'notes' => 'Customer confirmed the new address during the call.',
            'upsell_items' => [],
        ]);

        $response->assertOk();
        $response->assertJsonPath('shipping_address', 'Updated street 123, Casablanca');
        $response->assertJsonPath('notes', 'Customer confirmed the new address during the call.');

        $this->assertSame('Updated street 123, Casablanca', $order->fresh()->shipping_address);
        $this->assertSame('Customer confirmed the new address during the call.', $order->fresh()->notes);
        $this->assertSame('Updated street 123, Casablanca', $order->fresh()->client->address);
    }

    public function test_seller_only_sees_blacklist_badge_while_confirmation_agent_sees_full_blacklist_details(): void
    {
        $agent = $this->createConfirmationAgent();
        $vendorUser = $this->createVendorUser();
        $order = $this->createOrderForVendor($vendorUser->vendor, $agent);

        BlacklistEntry::create([
            'phone_number' => $order->client->phone,
            'reason' => 'Repeated fake cancellations',
            'cancellation_timing' => 'after_confirmation',
        ]);

        Sanctum::actingAs($vendorUser);
        $vendorResponse = $this->getJson('/api/orders');
        $vendorResponse->assertOk();
        $vendorResponse->assertJsonPath('data.0.is_blacklisted', true);
        $vendorResponse->assertJsonPath('data.0.blacklist_badge', 'Banned / Blacklisted');
        $vendorResponse->assertJsonPath('data.0.blacklist_entry', null);

        Sanctum::actingAs($agent);
        $agentResponse = $this->getJson('/api/orders');
        $agentResponse->assertOk();
        $agentResponse->assertJsonPath('data.0.is_blacklisted', true);
        $agentResponse->assertJsonPath('data.0.blacklist_entry.reason', 'Repeated fake cancellations');
        $agentResponse->assertJsonPath('data.0.blacklist_entry.cancellation_timing', 'after_confirmation');
    }

    private function createConfirmationAgent(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'confirmation_agent'],
            [
                'name' => 'Confirmation Agent',
                'permissions' => ['view_orders', 'update_order_status', 'manage_upsells'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createDeliveryPerson(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'delivery_person'],
            [
                'name' => 'Delivery Person',
                'permissions' => ['view_assigned_orders', 'update_delivery_status'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createVendorUser(string $slug = 'vendor'): User
    {
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $slug === 'seller' ? 'Seller Portal' : 'Seller',
                'permissions' => ['view_own_orders'],
            ]
        );

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        Vendor::create([
            'user_id' => $user->id,
            'name' => 'Seller One',
            'email' => 'seller-one@example.com',
            'phone' => '0611111111',
            'is_active' => true,
        ]);

        return $user->fresh('vendor');
    }

    private function createOrderForConfirmationAgent(User $agent): Order
    {
        $client = Client::create([
            'name' => 'Client Test',
            'phone' => '0622222222',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);

        return Order::create([
            'client_id' => $client->id,
            'confirmation_agent_id' => $agent->id,
            'status' => 'pending',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 120,
            'phone' => $client->phone,
        ]);
    }

    private function createOrderForVendor(Vendor $vendor, User $agent): Order
    {
        $client = Client::create([
            'name' => 'Blocked Client',
            'phone' => '0633333333',
            'address' => 'Rabat',
            'is_active' => true,
        ]);

        return Order::create([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $agent->id,
            'status' => 'pending',
            'source' => 'manual',
            'subtotal' => 140,
            'total' => 140,
            'phone' => $client->phone,
        ])->load('client');
    }

    private function createConfirmedOrderForVendor(Vendor $vendor, User $agent): Order
    {
        $client = Client::create([
            'name' => 'Tracked Client',
            'phone' => '0644444444',
            'address' => 'Rabat',
            'is_active' => true,
        ]);

        return Order::create([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $agent->id,
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'source' => 'manual',
            'subtotal' => 140,
            'total' => 140,
            'shipping_address' => 'Rabat',
            'city' => 'Rabat',
            'phone' => $client->phone,
        ])->load('client');
    }

    private function createTrackedConfirmedOrderForVendor(Vendor $vendor): Order
    {
        $client = Client::create([
            'name' => 'Tracked Client',
            'phone' => '0644444444',
            'address' => 'Rabat',
            'is_active' => true,
        ]);

        return Order::create([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'status' => 'confirmed',
            'delivery_tracking_code' => 'TRK-SELLER-001',
            'confirmed_at' => now(),
            'source' => 'manual',
            'subtotal' => 140,
            'total' => 140,
            'shipping_address' => 'Rabat',
            'city' => 'Rabat',
            'phone' => $client->phone,
        ])->load('client');
    }

    private function createProductForVendor(Vendor $vendor): Product
    {
        return Product::create([
            'name' => 'Seller Product',
            'sku' => 'SELLER-PRODUCT-001',
            'vendor_id' => $vendor->id,
            'price' => 140,
            'cost_price' => 70,
            'stock_quantity' => 10,
            'min_stock_quantity' => 1,
            'is_active' => true,
        ]);
    }
}
