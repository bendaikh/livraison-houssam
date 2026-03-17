<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Tests\TestCase;

class ProfitCalculationTest extends TestCase
{
    public function test_order_profit_uses_main_and_upsell_formulas(): void
    {
        $baseProduct = new Product([
            'company_price' => 100,
            'vendor_price' => 70,
        ]);

        $upsellProduct = new Product([
            'company_price' => 40,
            'vendor_price' => 25,
        ]);

        $baseItem = new OrderItem([
            'price' => 150,
            'quantity' => 2,
            'is_upsell' => false,
        ]);
        $baseItem->setRelation('product', $baseProduct);

        $upsellItem = new OrderItem([
            'price' => 60,
            'quantity' => 1,
            'is_upsell' => true,
        ]);
        $upsellItem->setRelation('product', $upsellProduct);

        $order = new Order([
            'shipping_cost' => 30,
            'discount' => 0,
        ]);
        $order->setRelation('items', collect([$baseItem, $upsellItem]));

        $profit = $order->calculateProfit(15);

        $this->assertEquals(75.0, $profit);
    }

    public function test_admin_product_profit_is_seller_price_minus_company_price(): void
    {
        $product = new Product([
            'company_price' => 120,
            'vendor_price' => 80,
        ]);

        $this->assertEquals(40.0, $product->getAdminUnitProfitAmount());
    }
}
