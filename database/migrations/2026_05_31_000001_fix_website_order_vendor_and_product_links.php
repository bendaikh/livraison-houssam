<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $orderIds = DB::table('orders')
            ->whereNull('vendor_id')
            ->whereIn('source', ['website', 'custom_api'])
            ->pluck('id');

        foreach ($orderIds as $orderId) {
            $vendorId = DB::table('order_items')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->where('order_items.order_id', $orderId)
                ->whereNotNull('products.vendor_id')
                ->where('products.sku', '!=', 'UNKNOWN')
                ->value('products.vendor_id');

            if ($vendorId) {
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update(['vendor_id' => $vendorId]);
            }
        }

        $integrations = DB::table('api_integrations')
            ->where('provider', 'custom_api')
            ->whereNull('vendor_id')
            ->get(['id']);

        foreach ($integrations as $integration) {
            $vendorId = DB::table('orders')
                ->whereIn('source', ['website', 'custom_api'])
                ->whereNotNull('vendor_id')
                ->orderByDesc('created_at')
                ->value('vendor_id');

            if ($vendorId) {
                DB::table('api_integrations')
                    ->where('id', $integration->id)
                    ->update(['vendor_id' => $vendorId]);
            }
        }

        $this->relinkOrderItemsFromNotesSku();
    }

    private function relinkOrderItemsFromNotesSku(): void
    {
        $orders = DB::table('orders')
            ->whereIn('source', ['website', 'custom_api'])
            ->whereNotNull('notes')
            ->get(['id', 'notes']);

        foreach ($orders as $order) {
            $sku = $this->extractSkuFromNotes($order->notes);
            if (!$sku) {
                continue;
            }

            $productId = DB::table('products')->where('sku', $sku)->value('id');
            if (!$productId) {
                continue;
            }

            DB::table('order_items')
                ->where('order_id', $order->id)
                ->update(['product_id' => $productId, 'sku' => $sku]);
        }
    }

    private function extractSkuFromNotes(?string $notes): ?string
    {
        $notes = trim((string) $notes);
        if ($notes === '') {
            return null;
        }

        if (str_starts_with($notes, '{') || str_starts_with($notes, '[')) {
            $decoded = json_decode($notes, true);
            if (is_array($decoded)) {
                $payload = isset($decoded[0]) && is_array($decoded[0]) ? $decoded[0] : $decoded;
                $sku = trim((string) ($payload['sku'] ?? $payload['SKU'] ?? ''));

                return $sku !== '' ? $sku : null;
            }
        }

        if (preg_match('/(?:SKU|sku|Sku|Réf|réf|Ref|ref|Reference|reference)\s*[:\-]\s*([A-Za-z0-9\-_.]+)/u', $notes, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    public function down(): void
    {
        // Data backfill — no rollback
    }
};
