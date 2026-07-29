<?php

namespace App\Services;

use App\Models\Order;
use App\Support\MoroccanPhone;
use App\Support\OrderTotals;
use Illuminate\Support\Collection;

class ClientIntelligenceService
{
    public const MIN_ORDERS_FOR_RATES = 3;
    public const HIGH_CANCEL_RATE = 0.30;
    public const HIGH_RETURN_RATE = 0.25;
    public const TRUSTED_MIN_DELIVERED = 3;
    public const TRUSTED_DELIVERY_RATE = 0.70;
    public const TRUSTED_MAX_CANCEL_RATE = 0.20;
    public const TRUSTED_MAX_RETURN_RATE = 0.15;
    public const MULTI_SELLER_MIN_VENDORS = 2;

    /**
     * Build a lightweight reliability summary for each phone (list-card indicators).
     *
     * @param  iterable<int, string|null>  $phones
     * @return array<string, array<string, mixed>>
     */
    public function summarizeMany(iterable $phones): array
    {
        $normalized = collect($phones)
            ->map(fn ($phone) => MoroccanPhone::normalize($phone))
            ->filter()
            ->unique()
            ->values();

        if ($normalized->isEmpty()) {
            return [];
        }

        $orders = $this->ordersForPhones($normalized)
            ->with('client:id,phone')
            ->get();

        $summaries = [];

        foreach ($normalized as $phone) {
            $phoneOrders = $orders->filter(function (Order $order) use ($phone) {
                return MoroccanPhone::normalize($order->phone) === $phone
                    || MoroccanPhone::normalize($order->client?->phone) === $phone;
            })->values();

            $summaries[$phone] = $this->buildSummary($phone, $phoneOrders);
        }

        return $summaries;
    }

    /**
     * Full client intelligence profile keyed by phone number.
     *
     * @return array<string, mixed>
     */
    public function profile(?string $phone): array
    {
        $normalized = MoroccanPhone::normalize($phone);

        if ($normalized === '') {
            return $this->emptyProfile('');
        }

        $orders = $this->ordersForPhones(collect([$normalized]))
            ->with([
                'client:id,name,phone',
                'vendor:id,name,company_name',
                'items:id,order_id,product_id,product_name,sku,quantity,price,subtotal',
                'items.product:id,name',
            ])
            ->latest()
            ->get();

        $summary = $this->buildSummary($normalized, $orders);
        $clientNames = $orders
            ->map(fn (Order $order) => $order->client?->name)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $products = [];
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $name = $item->product?->name ?: ($item->product_name ?: 'Item');
                $key = strtolower(trim($name));
                if (!isset($products[$key])) {
                    $products[$key] = [
                        'name' => $name,
                        'quantity' => 0,
                        'orders_count' => 0,
                    ];
                }
                $products[$key]['quantity'] += (int) $item->quantity;
                $products[$key]['orders_count'] += 1;
            }
        }

        $sellers = [];
        foreach ($orders as $order) {
            if (!$order->vendor_id) {
                continue;
            }
            $key = (string) $order->vendor_id;
            if (!isset($sellers[$key])) {
                $sellers[$key] = [
                    'id' => $order->vendor_id,
                    'name' => $order->vendor?->company_name ?: ($order->vendor?->name ?: 'Seller'),
                    'orders_count' => 0,
                ];
            }
            $sellers[$key]['orders_count'] += 1;
        }

        $timeline = $orders->map(function (Order $order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total' => $this->orderAmount($order),
                'vendor_name' => $order->vendor?->company_name ?: ($order->vendor?->name),
                'created_at' => optional($order->created_at)?->toIso8601String(),
                'items_count' => $order->items->count(),
            ];
        })->values()->all();

        return array_merge($summary, [
            'client_names' => $clientNames,
            'products' => array_values($products),
            'sellers' => array_values($sellers),
            'timeline' => $timeline,
        ]);
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array<string, mixed>
     */
    public function buildSummary(string $phone, Collection $orders): array
    {
        $totalOrders = $orders->count();
        $delivered = $orders->where('status', 'delivered')->count();
        $cancelled = $orders->whereIn('status', ['cancelled', 'refused'])->count();
        $returned = $orders->whereIn('status', ['returned', 'return_requested'])->count();
        $totalSpent = round($orders
            ->where('status', 'delivered')
            ->sum(fn (Order $order) => $this->orderAmount($order)), 2);

        $vendorIds = $orders->pluck('vendor_id')->filter()->unique()->values();
        $sellersCount = $vendorIds->count();

        $cancelRate = $totalOrders > 0 ? $cancelled / $totalOrders : 0;
        $returnRate = $totalOrders > 0 ? $returned / $totalOrders : 0;
        $deliveryRate = $totalOrders > 0 ? $delivered / $totalOrders : 0;

        $highCancelRate = $totalOrders >= self::MIN_ORDERS_FOR_RATES
            && $cancelRate >= self::HIGH_CANCEL_RATE;
        $highReturnRate = $totalOrders >= self::MIN_ORDERS_FOR_RATES
            && $returnRate >= self::HIGH_RETURN_RATE;
        $multiSeller = $sellersCount >= self::MULTI_SELLER_MIN_VENDORS;
        $trusted = $delivered >= self::TRUSTED_MIN_DELIVERED
            && $deliveryRate >= self::TRUSTED_DELIVERY_RATE
            && $cancelRate < self::TRUSTED_MAX_CANCEL_RATE
            && $returnRate < self::TRUSTED_MAX_RETURN_RATE
            && !$highCancelRate
            && !$highReturnRate;

        $reliability = 'normal';
        if ($highCancelRate || $highReturnRate) {
            $reliability = 'warning';
        } elseif ($trusted) {
            $reliability = 'trusted';
        }

        $firstOrderAt = $orders->min('created_at');
        $latestOrderAt = $orders->max('created_at');

        return [
            'phone' => $phone,
            'total_orders' => $totalOrders,
            'delivered_orders' => $delivered,
            'cancelled_orders' => $cancelled,
            'returned_orders' => $returned,
            'total_spent' => $totalSpent,
            'sellers_count' => $sellersCount,
            'cancel_rate' => round($cancelRate * 100, 1),
            'return_rate' => round($returnRate * 100, 1),
            'delivery_rate' => round($deliveryRate * 100, 1),
            'first_order_at' => $firstOrderAt ? (string) $firstOrderAt : null,
            'latest_order_at' => $latestOrderAt ? (string) $latestOrderAt : null,
            'indicators' => [
                'high_cancel_rate' => $highCancelRate,
                'high_return_rate' => $highReturnRate,
                'multi_seller' => $multiSeller,
                'trusted' => $trusted,
            ],
            'reliability' => $reliability,
        ];
    }

    /**
     * @param  Collection<int, string>  $phones
     */
    private function ordersForPhones(Collection $phones)
    {
        $phoneList = $phones->all();

        return Order::query()
            ->where(function ($query) use ($phoneList) {
                $query->whereIn('phone', $phoneList)
                    ->orWhereHas('client', function ($clientQuery) use ($phoneList) {
                        $clientQuery->whereIn('phone', $phoneList);
                    });
            });
    }

    private function orderAmount(Order $order): float
    {
        return (float) OrderTotals::resolveForDisplay($order)['display_total'];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyProfile(string $phone): array
    {
        return array_merge($this->buildSummary($phone, collect()), [
            'client_names' => [],
            'products' => [],
            'sellers' => [],
            'timeline' => [],
        ]);
    }
}
