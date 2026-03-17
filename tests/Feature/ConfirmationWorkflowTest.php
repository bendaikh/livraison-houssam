<?php

namespace Tests\Feature;

use App\Models\BlacklistEntry;
use App\Models\Client;
use App\Models\Order;
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

    private function createVendorUser(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'vendor'],
            [
                'name' => 'Vendor',
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
}
