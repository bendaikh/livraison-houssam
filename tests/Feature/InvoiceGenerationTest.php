<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Order;
use App\Models\Role;
use App\Models\SellerBilling;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InvoiceGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_preview_and_generate_seller_invoice_with_pdf(): void
    {
        Storage::fake('public');

        $admin = $this->createAdmin();
        [$vendor, $confirmationAgent, $deliveryPerson] = $this->createBillingActors();
        $client = $this->createClient();

        $order = $this->createDeliveredOrder([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'confirmation_agent_id' => $confirmationAgent->id,
            'delivery_person_id' => $deliveryPerson->id,
            'total' => 180,
            'commission_amount' => 45,
            'shipping_cost' => 35,
            'seller_net_profit' => 100,
            'collected_amount' => 180,
            'delivery_person_commission' => 20,
            'amount_due_to_admin' => 160,
            'delivered_at' => '2026-06-05 10:00:00',
        ]);

        $token = $admin->createToken('invoice-test')->plainTextToken;

        $previewResponse = $this->withToken($token)->getJson('/api/billing/preview?' . http_build_query([
            'role' => 'seller',
            'entity_id' => $vendor->id,
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
        ]));

        $previewResponse->assertOk();
        $previewResponse->assertJsonPath('orders_count', 1);
        $previewResponse->assertJsonPath('orders.0.id', $order->id);

        $generateResponse = $this->withToken($token)->postJson('/api/billing/generate', [
            'role' => 'seller',
            'entity_id' => $vendor->id,
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
        ]);

        $generateResponse->assertOk();

        $order->refresh();
        $this->assertSame('invoiced', $order->seller_invoice_status);
        $this->assertSame('not_invoiced', $order->confirmation_invoice_status);
        $this->assertSame('not_invoiced', $order->delivery_invoice_status);

        $billing = SellerBilling::where('vendor_id', $vendor->id)->first();
        $this->assertNotNull($billing);
        $this->assertNotNull($billing->invoice_number);
        $this->assertNotNull($billing->pdf_path);
        Storage::disk('public')->assertExists($billing->pdf_path);

        $pdfResponse = $this->withToken($token)->get("/api/billing/seller/{$billing->id}/pdf");
        $pdfResponse->assertOk();
        $pdfResponse->assertHeader('content-type', 'application/pdf');
    }

    public function test_invoiced_orders_are_excluded_from_next_preview(): void
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
            'seller_net_profit' => 90,
            'delivered_at' => '2026-06-05 10:00:00',
            'seller_invoice_status' => 'invoiced',
        ]);

        $token = $admin->createToken('invoice-test')->plainTextToken;

        $previewResponse = $this->withToken($token)->getJson('/api/billing/preview?' . http_build_query([
            'role' => 'seller',
            'entity_id' => $vendor->id,
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
        ]));

        $previewResponse->assertOk();
        $previewResponse->assertJsonPath('orders_count', 0);
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
            'name' => 'ALFA COD.MA',
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
            'seller_net_profit' => $attributes['seller_net_profit'] ?? null,
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
