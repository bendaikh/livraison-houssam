<?php

use App\Models\Order;
use App\Support\OrderTotals;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Order::query()
            ->with('items')
            ->where(function ($query) {
                $query->whereIn('source', ['custom_api', 'website', 'google_sheet', 'whatsapp'])
                    ->orWhere(function ($subQuery) {
                        $subQuery->whereNotNull('external_order_id')
                            ->where('source', '!=', 'shopify');
                    });
            })
            ->chunkById(100, function ($orders) {
                foreach ($orders as $order) {
                    $correction = OrderTotals::persistedCorrection($order);

                    if ($correction) {
                        $order->update($correction);
                    }
                }
            });
    }

    public function down(): void
    {
        // Non-reversible data correction.
    }
};
