<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeliveryPersonWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_delivery_person_only_sees_assigned_orders(): void
    {
        [$deliveryRole, $firstDeliveryPerson, $secondDeliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();

        $assignedToFirst = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $firstDeliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 120,
        ]);

        Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $secondDeliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 90,
            'total' => 90,
        ]);

        Sanctum::actingAs($firstDeliveryPerson);

        $response = $this->getJson('/api/orders');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $assignedToFirst->id);
    }

    public function test_delivery_person_orders_show_unpaid_first_and_paid_last(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();
        $oldCreatedAt = now()->subDays(2);
        $paidCreatedAt = now()->subDay();
        $newestCreatedAt = now();

        $oldUnpaidOrder = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 80,
            'total' => 80,
        ]);
        $oldUnpaidOrder->forceFill(['created_at' => $oldCreatedAt, 'updated_at' => $oldCreatedAt])->saveQuietly();

        $newPaidOrder = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 120,
            'collected_amount' => 120,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 100,
        ]);
        $newPaidOrder->forceFill(['created_at' => $paidCreatedAt, 'updated_at' => $paidCreatedAt])->saveQuietly();

        $newestUnpaidOrder = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'out_for_delivery',
            'source' => 'manual',
            'subtotal' => 95,
            'total' => 95,
        ]);
        $newestUnpaidOrder->forceFill(['created_at' => $newestCreatedAt, 'updated_at' => $newestCreatedAt])->saveQuietly();

        $billing = DeliveryPersonBilling::create([
            'delivery_person_id' => $deliveryPerson->id,
            'period_start' => now()->toDateString(),
            'period_end' => now()->toDateString(),
            'total_orders' => 1,
            'total_collected' => 120,
            'total_commission' => 20,
            'total_due_to_admin' => 100,
            'paid_at' => now(),
        ]);

        $billing->orders()->attach($newPaidOrder->id);

        Sanctum::actingAs($deliveryPerson);

        $response = $this->getJson('/api/orders');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
        $this->assertSame(
            [$newestUnpaidOrder->id, $oldUnpaidOrder->id, $newPaidOrder->id],
            collect($response->json('data'))->pluck('id')->all()
        );
    }

    public function test_delivery_person_cannot_update_locked_order(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();
        $order = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 150,
            'total' => 150,
            'collected_amount' => 150,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 130,
            'delivered_at' => now(),
        ]);

        $billing = DeliveryPersonBilling::create([
            'delivery_person_id' => $deliveryPerson->id,
            'period_start' => now()->toDateString(),
            'period_end' => now()->toDateString(),
            'total_orders' => 1,
            'total_collected' => 150,
            'total_commission' => 20,
            'total_due_to_admin' => 130,
            'paid_at' => now(),
        ]);

        $billing->orders()->attach($order->id);

        Sanctum::actingAs($deliveryPerson);

        $response = $this->patchJson("/api/orders/{$order->id}/delivery-workflow", [
            'status' => 'returned',
            'delivery_status_note' => 'Customer rejected after settlement.',
        ]);

        $response->assertForbidden();
    }

    public function test_delivery_person_must_add_motif_for_refused_status(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();
        $order = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 80,
            'total' => 80,
        ]);

        Sanctum::actingAs($deliveryPerson);

        $response = $this->patchJson("/api/orders/{$order->id}/delivery-workflow", [
            'status' => 'refused',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['delivery_status_note']);
    }

    public function test_delivery_person_can_schedule_callback_and_order_reappears_when_due(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();
        $order = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 110,
            'total' => 110,
        ]);

        Sanctum::actingAs($deliveryPerson);

        $tomorrow = Carbon::tomorrow()->toDateString();

        $response = $this->patchJson("/api/orders/{$order->id}/delivery-workflow", [
            'callback_date' => $tomorrow,
            'delivery_status_note' => 'Client asked to be called back tomorrow morning.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('callback_date', Carbon::parse($tomorrow)->startOfDay()->toJSON());
        $response->assertJsonPath('delivery_status_note', 'Client asked to be called back tomorrow morning.');

        $this->getJson('/api/orders?callback_due=today')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->travelTo(Carbon::parse($tomorrow)->setTime(9, 0));

        $this->getJson('/api/orders?callback_due=today')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.delivery_status_note', 'Client asked to be called back tomorrow morning.');
    }

    public function test_delivery_person_can_send_order_back_to_confirmation(): void
    {
        [, $deliveryPerson, $secondDeliveryPerson] = $this->createDeliveryPeople();
        $agent = $this->createConfirmationAgent();
        $client = $this->createClient();

        $order = Order::create([
            'client_id' => $client->id,
            'confirmation_agent_id' => $agent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'source' => 'manual',
            'subtotal' => 110,
            'total' => 110,
        ]);

        Sanctum::actingAs($deliveryPerson);

        $response = $this->patchJson("/api/orders/{$order->id}/delivery-workflow", [
            'return_to_confirmation' => true,
            'return_status' => 'returned',
            'delivery_status_note' => 'Client asked to change the delivery slot.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'returned');
        $response->assertJsonPath('delivery_person_id', null);
        $response->assertJsonPath('confirmation_agent_id', $agent->id);
        $response->assertJsonPath('delivery_status_note', 'Client asked to change the delivery slot.');
        $this->assertNotNull($order->fresh()->returned_to_confirmation_at);
        $this->assertNull($order->fresh()->confirmed_at);

        Sanctum::actingAs($agent);

        $confirmResponse = $this->patchJson("/api/orders/{$order->id}/confirmation-workflow", [
            'status' => 'confirmed',
            'delivery_person_id' => $secondDeliveryPerson->id,
            'upsell_items' => [],
        ]);

        $confirmResponse->assertOk();
        $confirmResponse->assertJsonPath('status', 'confirmed');
        $confirmResponse->assertJsonPath('delivery_person_id', $secondDeliveryPerson->id);
    }

    public function test_delivery_invoice_response_includes_delivered_orders(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $deliveredAt = Carbon::yesterday()->setTime(16, 0);

        $order = Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 150,
            'total' => 150,
            'collected_amount' => 150,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 130,
            'delivery_status_note' => 'Delivered after confirming client location.',
            'delivered_at' => $deliveredAt,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/delivery-billings/generate', [
            'date' => $deliveredAt->toDateString(),
            'delivery_person_id' => $deliveryPerson->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('0.total_orders', 1);
        $response->assertJsonPath('0.orders.0.id', $order->id);
        $response->assertJsonPath('0.orders.0.order_number', $order->order_number);
        $response->assertJsonPath('0.orders.0.client.name', $client->name);
        $response->assertJsonPath('0.orders.0.delivery_status_note', 'Delivered after confirming client location.');
        $response->assertJsonPath('0.orders.0.amount_due_to_admin', '130.00');
    }

    public function test_orders_index_still_works_when_blacklist_table_is_missing(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();

        Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'confirmed',
            'source' => 'manual',
            'subtotal' => 95,
            'total' => 95,
        ]);

        Schema::dropIfExists('blacklist_entries');

        Sanctum::actingAs($deliveryPerson);

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_blacklisted', false)
            ->assertJsonPath('data.0.blacklist_badge', null);
    }

    public function test_monthly_delivery_generation_only_creates_rows_for_days_with_delivered_orders(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $admin = $this->createAdmin();
        $client = $this->createClient();

        Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 120,
            'total' => 120,
            'collected_amount' => 120,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 100,
            'delivered_at' => '2026-03-02 10:00:00',
        ]);

        Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 200,
            'total' => 200,
            'collected_amount' => 200,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 180,
            'delivered_at' => '2026-03-06 16:00:00',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/delivery-billings/generate', [
            'month' => '2026-03-01',
            'delivery_person_id' => $deliveryPerson->id,
        ]);

        $response->assertOk();
        $response->assertJsonCount(2);
        $this->assertSame(
            ['2026-03-06', '2026-03-02'],
            collect($response->json())
                ->pluck('period_start')
                ->map(fn (string $value) => substr($value, 0, 10))
                ->all()
        );
        $this->assertDatabaseCount('delivery_person_billings', 2);
    }

    public function test_delivery_billing_index_hides_empty_rows_and_keeps_real_unpaid_amounts(): void
    {
        [, $deliveryPerson] = $this->createDeliveryPeople();
        $client = $this->createClient();
        $admin = $this->createAdmin();

        Order::create([
            'client_id' => $client->id,
            'delivery_person_id' => $deliveryPerson->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 200,
            'total' => 200,
            'collected_amount' => 200,
            'delivery_person_commission' => 10,
            'amount_due_to_admin' => 190,
            'delivered_at' => '2026-03-10 12:00:00',
        ]);

        DeliveryPersonBilling::create([
            'delivery_person_id' => $deliveryPerson->id,
            'period_start' => '2026-03-09',
            'period_end' => '2026-03-09',
            'total_orders' => 0,
            'total_collected' => 0,
            'total_commission' => 0,
            'total_due_to_admin' => 0,
        ]);

        Sanctum::actingAs($admin);
        $this->postJson('/api/delivery-billings/generate', [
            'date' => '2026-03-10',
            'delivery_person_id' => $deliveryPerson->id,
        ])->assertOk();

        Sanctum::actingAs($deliveryPerson);

        $response = $this->getJson('/api/delivery-billings?month=2026-03-01');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.total_orders', 1);
        $response->assertJsonPath('0.total_due_to_admin', '190.00');
        $response->assertJsonPath('0.paid_at', null);
    }

    private function createDeliveryPeople(): array
    {
        $deliveryRole = Role::firstOrCreate(
            ['slug' => 'delivery_person'],
            [
                'name' => 'Delivery Person',
                'permissions' => ['view_assigned_orders', 'update_delivery_status'],
            ]
        );

        $first = User::factory()->create([
            'role_id' => $deliveryRole->id,
            'is_active' => true,
            'commission_per_order' => 20,
        ]);

        $second = User::factory()->create([
            'role_id' => $deliveryRole->id,
            'is_active' => true,
            'commission_per_order' => 15,
        ]);

        return [$deliveryRole, $first, $second];
    }

    private function createClient(): Client
    {
        return Client::create([
            'name' => 'Test Client',
            'phone' => '0612345678',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);
    }

    private function createAdmin(): User
    {
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['manage_orders', 'view_dashboard'],
            ]
        );

        return User::factory()->create([
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);
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
}
