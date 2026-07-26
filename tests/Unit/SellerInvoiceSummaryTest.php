<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerBilling;
use App\Models\Setting;
use App\Models\Vendor;
use App\Services\InvoicePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerInvoiceSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_pdf_net_amount_matches_billing_record(): void
    {
        Setting::set('order_fulfillment_cost', 10, 'number', 'orders');

        $vendor = Vendor::create([
            'name' => 'Test Seller Person',
            'company_name' => 'Test Store Name',
            'email' => 'seller@example.com',
            'is_active' => true,
        ]);

        $product = Product::create([
            'name' => 'Test Product',
            'sku' => 'TST-001',
            'price' => 495,
            'company_price' => 360,
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

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 1,
            'price' => 495,
            'subtotal' => 495,
        ]);

        $billing->orders()->attach($order->id);

        $data = app(InvoicePdfService::class)->buildSellerData(
            SellerBilling::with(['vendor', 'orders.items.product'])->findOrFail($billing->id)
        );

        $this->assertSame(495.0, $data['summary']['total_sales']);
        $this->assertSame(100.0, $data['summary']['final_amount']);
        $this->assertSame(395.0, $data['summary']['total_deductions']);
        $this->assertSame(360.0, $data['summary']['total_product_cost']);
        $this->assertSame(35.0, $data['summary']['total_delivery_cost']);
        $this->assertSame(0.0, $data['summary']['total_cod_fees']);
        $this->assertSame('Test Store Name', $data['entity_name']);
    }

    public function test_seller_pdf_falls_back_to_seller_name_when_store_missing(): void
    {
        $vendor = Vendor::create([
            'name' => 'Fallback Seller',
            'company_name' => null,
            'email' => 'fallback@example.com',
            'is_active' => true,
        ]);

        $billing = SellerBilling::create([
            'vendor_id' => $vendor->id,
            'period_start' => '2026-06-08',
            'period_end' => '2026-06-14',
            'gross_sales' => 100,
            'commission_amount' => 40,
            'net_amount' => 60,
        ]);

        $data = app(InvoicePdfService::class)->buildSellerData(
            SellerBilling::with(['vendor', 'orders.items.product'])->findOrFail($billing->id)
        );

        $this->assertSame('Fallback Seller', $data['entity_name']);
    }
}
