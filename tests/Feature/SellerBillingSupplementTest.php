<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Role;
use App\Models\SellerBilling;
use App\Models\User;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SellerBillingSupplementTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_seller_invoice_cannot_be_marked_paid_before_period_ends(): void
    {
        Carbon::setTestNow('2026-06-04 12:00:00');

        $admin = $this->createAdmin();
        [$vendor, $confirmationAgent, $deliveryPerson] = $this->createBillingActors();
        $client = $this->createClient();

        $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 150,
            'commission_amount' => 15,
            'delivered_at' => '2026-06-03 10:00:00',
        ]);

        Sanctum::actingAs($admin);
        $token = $admin->createToken('seller-billing-test')->plainTextToken;

        $this->withToken($token)->postJson('/api/billing/generate', [
            'month' => '2026-06-01',
            'role' => 'seller',
            'entity_id' => $vendor->id,
        ])->assertOk();

        $billing = SellerBilling::where('vendor_id', $vendor->id)->first();
        $this->assertNotNull($billing);
        $this->assertFalse($billing->paid_at !== null);

        $response = $this->withToken($token)->patchJson("/api/billing/seller/{$billing->id}/mark-paid");
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Seller invoices can only be marked as paid after the billing period ends.',
        ]);
    }

    public function test_supplemental_invoice_is_created_for_orders_delivered_after_primary_invoice_was_paid(): void
    {
        Carbon::setTestNow('2026-06-10 12:00:00');

        $admin = $this->createAdmin();
        [$vendor, $confirmationAgent, $deliveryPerson] = $this->createBillingActors();
        $client = $this->createClient();

        $firstOrder = $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 100,
            'commission_amount' => 10,
            'delivered_at' => '2026-06-02 10:00:00',
        ]);

        Sanctum::actingAs($admin);
        $token = $admin->createToken('seller-billing-test')->plainTextToken;

        $this->withToken($token)->postJson('/api/billing/generate', [
            'month' => '2026-06-01',
            'role' => 'seller',
            'entity_id' => $vendor->id,
        ])->assertOk();

        $primaryBilling = SellerBilling::where('vendor_id', $vendor->id)
            ->where('supplement_sequence', 0)
            ->first();

        $this->withToken($token)->patchJson("/api/billing/seller/{$primaryBilling->id}/mark-paid")->assertOk();

        $secondOrder = $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 200,
            'commission_amount' => 20,
            'delivered_at' => '2026-06-05 16:00:00',
        ]);

        $dashboard = $this->withToken($token)->getJson('/api/billing?month=2026-06-01&role=seller&entity_id=' . $vendor->id);
        $dashboard->assertOk();

        $supplement = SellerBilling::where('vendor_id', $vendor->id)
            ->where('supplement_sequence', '>', 0)
            ->first();

        $this->assertNotNull($supplement);
        $this->assertSame(1, (int) $supplement->delivered_orders_count);
        $this->assertTrue($supplement->orders()->where('orders.id', $secondOrder->id)->exists());
        $this->assertFalse($supplement->orders()->where('orders.id', $firstOrder->id)->exists());

        $unpaidSellerRecords = collect($dashboard->json('unpaid'))
            ->where('role', 'seller')
            ->values();

        $this->assertTrue($unpaidSellerRecords->contains(fn (array $record) => $record['is_supplement'] === true));
    }

    private function createAdmin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['manage_orders', 'manage_vendors'],
            ]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function createBillingActors(): array
    {
        $vendorRole = Role::firstOrCreate(
            ['slug' => 'vendor'],
            [
                'name' => 'Vendor',
                'permissions' => ['view_own_orders'],
            ]
        );

        $confirmationRole = Role::firstOrCreate(
            ['slug' => 'confirmation_agent'],
            [
                'name' => 'Confirmation Agent',
                'permissions' => ['view_orders'],
            ]
        );

        $deliveryRole = Role::firstOrCreate(
            ['slug' => 'delivery_person'],
            [
                'name' => 'Delivery Person',
                'permissions' => ['view_assigned_orders'],
            ]
        );

        $vendorUser = User::factory()->create([
            'role_id' => $vendorRole->id,
            'is_active' => true,
        ]);

        $vendor = Vendor::create([
            'user_id' => $vendorUser->id,
            'name' => 'Test Seller',
            'email' => 'seller@example.com',
            'phone' => '0600000000',
            'billing_frequency' => 'weekly',
            'is_active' => true,
        ]);

        $confirmationAgent = User::factory()->create([
            'role_id' => $confirmationRole->id,
            'commission_per_order' => 15,
            'is_active' => true,
        ]);

        $deliveryPerson = User::factory()->create([
            'role_id' => $deliveryRole->id,
            'commission_per_order' => 20,
            'is_active' => true,
        ]);

        return [$vendor, $confirmationAgent, $deliveryPerson];
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

    private function createDeliveredOrder(array $attributes = []): Order
    {
        return Order::create([
            'client_id' => $attributes['client_id'],
            'vendor_id' => $attributes['vendor_id'] ?? null,
            'confirmation_agent_id' => $attributes['confirmation_agent_id'] ?? null,
            'delivery_person_id' => $attributes['delivery_person_id'] ?? null,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => $attributes['total'] ?? 100,
            'total' => $attributes['total'] ?? 100,
            'commission_amount' => $attributes['commission_amount'] ?? 0,
            'shipping_cost' => $attributes['shipping_cost'] ?? 0,
            'seller_net_profit' => $attributes['seller_net_profit'] ?? ($attributes['total'] ?? 100) - ($attributes['commission_amount'] ?? 0),
            'collected_amount' => $attributes['collected_amount'] ?? null,
            'delivery_person_commission' => $attributes['delivery_person_commission'] ?? null,
            'amount_due_to_admin' => $attributes['amount_due_to_admin'] ?? null,
            'delivered_at' => $attributes['delivered_at'] ?? now(),
            'seller_invoice_status' => $attributes['seller_invoice_status'] ?? 'not_invoiced',
            'confirmation_invoice_status' => $attributes['confirmation_invoice_status'] ?? 'not_invoiced',
            'delivery_invoice_status' => $attributes['delivery_invoice_status'] ?? 'not_invoiced',
        ]);
    }
}
