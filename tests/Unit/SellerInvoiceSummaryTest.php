<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Order;
use App\Models\SellerBilling;
use App\Models\Vendor;
use App\Services\InvoicePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerInvoiceSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_pdf_net_amount_matches_billing_record(): void
    {
        $vendor = Vendor::create([
            'name' => 'Test Seller',
            'email' => 'seller@example.com',
            'is_active' => true,
        ]);

        $billing = SellerBilling::create([
            'vendor_id' => $vendor->id,
            'period_start' => '2026-06-08',
            'period_end' => '2026-06-14',
            'gross_sales' => 495,
            'commission_amount' => 395,
            'net_amount' => 100,
        ]);

        $client = Client::create([
            'name' => 'Test Client',
            'phone' => '0612345678',
            'is_active' => true,
        ]);

        $order = Order::create([
            'client_id' => $client->id,
            'vendor_id' => $vendor->id,
            'status' => 'delivered',
            'source' => 'manual',
            'subtotal' => 495,
            'total' => 495,
            'shipping_cost' => 25,
            'commission_amount' => 395,
            'seller_net_profit' => 100,
            'delivered_at' => '2026-06-10 10:00:00',
        ]);

        $billing->orders()->attach($order->id);

        $data = app(InvoicePdfService::class)->buildSellerData(
            SellerBilling::with(['vendor', 'orders.items.product'])->findOrFail($billing->id)
        );

        $this->assertSame(495.0, $data['summary']['total_sales']);
        $this->assertSame(100.0, $data['summary']['final_amount']);
        $this->assertSame(395.0, $data['summary']['total_deductions']);
    }
}
