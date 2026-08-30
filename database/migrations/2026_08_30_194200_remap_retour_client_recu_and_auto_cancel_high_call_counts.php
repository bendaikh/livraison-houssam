<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Move orders stuck on shipped (etc.) with "Retour client reçu" into returned,
     * and cancel active orders that already reached 10 client calls.
     */
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        $now = now();

        if (Schema::hasColumn('orders', 'delivery_status')) {
            $returnOrders = DB::table('orders')
                ->whereNotNull('delivery_status')
                ->whereIn('status', ['shipped', 'out_for_delivery', 'picked_up', 'ready_for_shipping', 'return_requested'])
                ->where(function ($query) {
                    $query->whereRaw('LOWER(delivery_status) LIKE ?', ['%retour client%'])
                        ->orWhereRaw('LOWER(delivery_status) LIKE ?', ['%retour reçu%'])
                        ->orWhereRaw('LOWER(delivery_status) LIKE ?', ['%retour recu%']);
                })
                ->get(['id', 'returned_at']);

            foreach ($returnOrders as $order) {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'returned',
                    'returned_at' => $order->returned_at ?: $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (Schema::hasColumn('orders', 'call_count')) {
            $cancelOrders = DB::table('orders')
                ->where('call_count', '>=', 10)
                ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned'])
                ->get(['id', 'cancelled_at']);

            foreach ($cancelOrders as $order) {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'cancelled',
                    'cancelled_at' => $order->cancelled_at ?: $now,
                    'callback_date' => null,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Irreversible data correction.
    }
};
