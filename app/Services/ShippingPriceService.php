<?php

namespace App\Services;

use App\Models\City;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

class ShippingPriceService
{
    public function resolveCityRate(?string $cityName): array
    {
        $normalizedCity = $this->normalizeCity($cityName);

        if ($normalizedCity === '') {
            return [
                'city' => $cityName,
                'normalized_city' => $normalizedCity,
                'cost' => 35.0,
                'source' => 'missing_city_default',
                'matched_city' => null,
                'used_fallback' => true,
            ];
        }

        $match = City::query()
            ->get(['name', 'delivery_cost'])
            ->first(function (City $city) use ($normalizedCity) {
                return $this->normalizeCity($city->name) === $normalizedCity;
            });

        if ($match && $match->delivery_cost !== null) {
            return [
                'city' => $cityName,
                'normalized_city' => $normalizedCity,
                'cost' => (float) $match->delivery_cost,
                'source' => 'city_table',
                'matched_city' => $match->name,
                'used_fallback' => false,
            ];
        }

        return [
            'city' => $cityName,
            'normalized_city' => $normalizedCity,
            'cost' => $this->isCasaCity($cityName) ? 25.0 : 35.0,
            'source' => $this->isCasaCity($cityName) ? 'default_casa' : 'default_outside_casa',
            'matched_city' => null,
            'used_fallback' => true,
        ];
    }

    public function resolveForOrderData(array $data, ?Order $order = null): array
    {
        $city = array_key_exists('city', $data)
            ? ($data['city'] ?? null)
            : $order?->city;
        $resolved = $this->resolveCityRate($city);
        $requestedShippingCost = $this->parseNumeric($data['shipping_cost'] ?? null);
        $existingShippingCost = $order && $order->shipping_cost !== null
            ? (float) $order->shipping_cost
            : null;
        $shippingCostSource = $data['shipping_cost_source'] ?? null;

        $cityChanged = $order
            ? !$this->sameCity($city, $order->city)
            : !empty($city);
        $deliveryIntegrationChanged = $order
            ? (string) ($data['delivery_integration_id'] ?? $order->delivery_integration_id ?? '') !== (string) ($order->delivery_integration_id ?? '')
            : !empty($data['delivery_integration_id']);
        $shouldRecalculateAutomatically = !$order || $cityChanged || $deliveryIntegrationChanged || $requestedShippingCost === null;

        if ($shippingCostSource === 'auto') {
            if ($shouldRecalculateAutomatically) {
                $finalShippingCost = $resolved['cost'];
                $decision = $order
                    ? 'auto_recalculated_from_city_context'
                    : 'auto_resolved_on_create';
            } else {
                // Placeholder zeros (common from Google Sheet imports) are not real
                // saved rates — replace them with the requested/city value.
                $existingIsPlaceholderZero = $existingShippingCost !== null
                    && abs($existingShippingCost) < 0.00001
                    && abs((float) $resolved['cost']) >= 0.00001;

                if ($existingIsPlaceholderZero) {
                    $finalShippingCost = ($requestedShippingCost !== null && abs($requestedShippingCost) >= 0.00001)
                        ? $requestedShippingCost
                        : $resolved['cost'];
                    $decision = ($requestedShippingCost !== null && abs($requestedShippingCost) >= 0.00001)
                        ? 'auto_replaced_placeholder_zero_with_requested_value'
                        : 'auto_replaced_placeholder_zero_from_city';
                } else {
                    $finalShippingCost = $existingShippingCost ?? $requestedShippingCost ?? $resolved['cost'];
                    $decision = $existingShippingCost !== null
                        ? 'auto_preserved_existing_saved_value'
                        : 'auto_used_requested_value';
                }
            }
        } elseif ($requestedShippingCost !== null) {
            $finalShippingCost = $requestedShippingCost;
            $decision = 'manual_requested_value';
        } elseif ($existingShippingCost !== null && !$cityChanged && !$deliveryIntegrationChanged) {
            $finalShippingCost = $existingShippingCost;
            $decision = 'preserved_existing_saved_value';
        } else {
            $finalShippingCost = $resolved['cost'];
            $decision = 'resolved_from_city_fallback';
        }

        $resolution = array_merge($resolved, [
            'shipping_cost' => (float) $finalShippingCost,
            'requested_shipping_cost' => $requestedShippingCost,
            'existing_shipping_cost' => $existingShippingCost,
            'shipping_cost_source' => $shippingCostSource,
            'city_changed' => $cityChanged,
            'delivery_integration_changed' => $deliveryIntegrationChanged,
            'decision' => $decision,
        ]);

        Log::info('Shipping price resolved for order payload.', [
            'order_id' => $order?->id,
            'city' => $resolution['city'],
            'shipping_cost' => $resolution['shipping_cost'],
            'requested_shipping_cost' => $resolution['requested_shipping_cost'],
            'existing_shipping_cost' => $resolution['existing_shipping_cost'],
            'city_rate_source' => $resolution['source'],
            'matched_city' => $resolution['matched_city'],
            'used_fallback' => $resolution['used_fallback'],
            'shipping_cost_source' => $resolution['shipping_cost_source'],
            'city_changed' => $resolution['city_changed'],
            'delivery_integration_changed' => $resolution['delivery_integration_changed'],
            'decision' => $resolution['decision'],
        ]);

        return $resolution;
    }

    public function sameCity(?string $left, ?string $right): bool
    {
        return $this->normalizeCity($left) === $this->normalizeCity($right);
    }

    public function normalizeCity(?string $value): string
    {
        $value = $value ?? '';
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $normalized = $normalized !== false ? $normalized : $value;

        return trim(mb_strtolower((string) preg_replace('/\s+/', ' ', $normalized)));
    }

    private function isCasaCity(?string $cityName): bool
    {
        return str_contains($this->normalizeCity($cityName), 'casa');
    }

    private function parseNumeric(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
