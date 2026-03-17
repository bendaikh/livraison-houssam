<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBillingDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_billing_dashboard_generates_all_roles_in_one_view(): void
    {
        $admin = $this->createAdmin();
        [$vendor, $confirmationAgent, $deliveryPerson] = $this->createBillingActors();
        $client = $this->createClient();

        $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 100,
            'commission_amount' => 10,
            'collected_amount' => 100,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 80,
            'delivered_at' => '2026-03-02 10:00:00',
        ]);

        $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 200,
            'commission_amount' => 20,
            'collected_amount' => 200,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 180,
            'delivered_at' => '2026-03-06 16:00:00',
        ]);

        Sanctum::actingAs($admin);

        $generateResponse = $this->postJson('/api/billing/generate', [
            'month' => '2026-03-01',
        ]);

        $generateResponse->assertOk();
        $generateResponse->assertJsonPath('summary.total_invoices', 5);
        $generateResponse->assertJsonPath('summary.role_totals.seller.count', 2);
        $generateResponse->assertJsonPath('summary.role_totals.confirmation.count', 1);
        $generateResponse->assertJsonPath('summary.role_totals.delivery.count', 2);
        $this->assertEquals(300.0, $generateResponse->json('summary.pending_payout_total'));
        $this->assertEquals(260.0, $generateResponse->json('summary.pending_collection_total'));

        $roleCounts = collect($generateResponse->json('unpaid'))->countBy('role');

        $this->assertSame(2, $roleCounts->get('seller'));
        $this->assertSame(1, $roleCounts->get('confirmation'));
        $this->assertSame(2, $roleCounts->get('delivery'));
        $this->assertDatabaseCount('delivery_person_billings', 2);

        $sellerRecords = collect($generateResponse->json('unpaid'))
            ->where('role', 'seller')
            ->values();

        $this->assertCount(2, $sellerRecords);
        $this->assertTrue($sellerRecords->every(fn (array $record) => $record['frequency'] === 'twice_weekly'));
    }

    public function test_mark_paid_moves_invoice_to_paid_history(): void
    {
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
            'collected_amount' => 150,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 130,
            'delivered_at' => '2026-03-03 11:00:00',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/billing/generate', [
            'month' => '2026-03-01',
        ])->assertOk();

        $dashboard = $this->getJson('/api/billing?month=2026-03-01');
        $dashboard->assertOk();

        $sellerBilling = collect($dashboard->json('unpaid'))
            ->firstWhere('role', 'seller');

        $this->assertNotNull($sellerBilling);

        $markPaidResponse = $this->patchJson(sprintf(
            '/api/billing/%s/%d/mark-paid',
            $sellerBilling['role'],
            $sellerBilling['source_id']
        ));

        $markPaidResponse->assertOk();
        $markPaidResponse->assertJsonPath('status', 'paid');

        $refreshedDashboard = $this->getJson('/api/billing?month=2026-03-01');

        $refreshedDashboard->assertOk();
        $refreshedDashboard->assertJsonPath('summary.open_invoices', 2);
        $refreshedDashboard->assertJsonPath('summary.paid_invoices', 1);
        $this->assertCount(2, $refreshedDashboard->json('unpaid'));
        $this->assertCount(1, $refreshedDashboard->json('paid'));
        $this->assertSame('seller', $refreshedDashboard->json('paid.0.role'));
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
            'name' => 'Seller One',
            'email' => 'seller@example.com',
            'billing_frequency' => 'twice_weekly',
            'commission_rate' => 10,
            'is_active' => true,
        ]);

        $confirmationAgent = User::factory()->create([
            'role_id' => $confirmationRole->id,
            'is_active' => true,
            'commission_per_order' => 15,
        ]);

        $deliveryPerson = User::factory()->create([
            'role_id' => $deliveryRole->id,
            'is_active' => true,
            'commission_per_order' => 20,
        ]);

        return [$vendor, $confirmationAgent, $deliveryPerson];
    }

    private function createClient(): Client
    {
        return Client::create([
            'name' => 'Client Test',
            'phone' => '0612345678',
            'address' => 'Casablanca',
            'is_active' => true,
        ]);
    }

    private function createDeliveredOrder(array $attributes): Order
    {
        return Order::create([
            'client_id' => $attributes['client_id'],
            'vendor_id' => $attributes['vendor_id'] ?? null,
            'confirmation_agent_id' => $attributes['confirmation_agent_id'] ?? null,
            'delivery_person_id' => $attributes['delivery_person_id'] ?? null,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => $attributes['total'],
            'total' => $attributes['total'],
            'commission_amount' => $attributes['commission_amount'] ?? 0,
            'collected_amount' => $attributes['collected_amount'] ?? null,
            'delivery_person_commission' => $attributes['delivery_person_commission'] ?? null,
            'amount_due_to_admin' => $attributes['amount_due_to_admin'] ?? null,
            'delivered_at' => $attributes['delivered_at'],
        ]);
    }
}
