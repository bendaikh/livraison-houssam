<?php

namespace App\Support;

use App\Models\Order;

class OrderTotals
{
    private const INCLUDED_SHIPPING_SOURCES = [
        'custom_api',
        'website',
        'google_sheet',
        'whatsapp',
        'marketplace',
    ];

    public static function shippingIncludedInPrice(Order $order): bool
    {
        if ($order->shipping_included_in_price) {
            return true;
        }

        if (in_array($order->source, self::INCLUDED_SHIPPING_SOURCES, true)) {
            return true;
        }

        if ($order->external_order_id && $order->source !== 'shopify') {
            return true;
        }

        return false;
    }

    public static function itemsTotal(Order $order): float
    {
        if ($order->relationLoaded('items') && $order->items->isNotEmpty()) {
            return (float) $order->items->sum(function ($item) {
                return ((float) $item->price) * ((int) $item->quantity);
            });
        }

        return (float) ($order->subtotal ?? 0);
    }

    public static function shopifySurcharge(Order $order): float
    {
        if ($order->source !== 'shopify' || blank($order->external_order_id)) {
            return 0.0;
        }

        return 1.0;
    }

    /**
     * @return array{
     *     shipping_included_in_price: bool,
     *     display_subtotal: float,
     *     display_total: float,
     *     shipping_cost: float
     * }
     */
    public static function resolveForDisplay(Order $order): array
    {
        $itemsTotal = self::itemsTotal($order);
        $storedSubtotal = (float) ($order->subtotal ?? 0);
        $storedTotal = (float) ($order->total ?? 0);
        $baseAmount = $itemsTotal > 0 ? $itemsTotal : $storedSubtotal;
        $shippingCost = (float) ($order->shipping_cost ?? 0);
        $tax = (float) ($order->tax ?? 0);
        $discount = (float) ($order->discount ?? 0);
        $shopifySurcharge = self::shopifySurcharge($order);
        $shippingIncluded = self::shippingIncludedInPrice($order);

        if ($shippingIncluded) {
            $displayTotal = $baseAmount - $discount + $tax + $shopifySurcharge;

            return [
                'shipping_included_in_price' => true,
                'display_subtotal' => round($baseAmount, 2),
                'display_total' => round($displayTotal, 2),
                'shipping_cost' => $shippingCost,
            ];
        }

        return [
            'shipping_included_in_price' => false,
            'display_subtotal' => round($storedSubtotal ?: $baseAmount, 2),
            'display_total' => round($storedTotal, 2),
            'shipping_cost' => $shippingCost,
        ];
    }

    /**
     * @return array{subtotal: float, total: float, shipping_included_in_price: bool}|null
     */
    public static function persistedCorrection(Order $order): ?array
    {
        if (!self::shippingIncludedInPrice($order)) {
            return null;
        }

        $itemsTotal = self::itemsTotal($order);
        if ($itemsTotal <= 0) {
            return null;
        }

        $tax = (float) ($order->tax ?? 0);
        $discount = (float) ($order->discount ?? 0);
        $correctTotal = $itemsTotal - $discount + $tax + self::shopifySurcharge($order);
        $storedTotal = (float) ($order->total ?? 0);

        if (abs($storedTotal - $correctTotal) < 0.01 && $order->shipping_included_in_price) {
            return null;
        }

        return [
            'subtotal' => round($itemsTotal, 2),
            'total' => round($correctTotal, 2),
            'shipping_included_in_price' => true,
        ];
    }
}
