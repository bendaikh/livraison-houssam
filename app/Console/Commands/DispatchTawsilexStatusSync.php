<?php

namespace App\Console\Commands;

use App\Jobs\SyncTawsilexOrderStatusJob;
use App\Models\Order;
use Illuminate\Console\Command;

class DispatchTawsilexStatusSync extends Command
{
    protected $signature = 'orders:dispatch-tawsilex-status-sync {--order-id=}';

    protected $description = 'Dispatch queued Tawsilex status sync jobs for eligible orders';

    public function handle(): int
    {
        $query = Order::query()
            ->whereNotNull('delivery_tracking_code')
            ->where('delivery_tracking_code', '!=', '')
            ->whereNotIn('status', ['delivered', 'cancelled'])
            ->whereHas('deliveryIntegration', function ($q) {
                $q->where('provider', 'tawsilex')
                    ->where('is_active', true);
            });

        if ($orderId = $this->option('order-id')) {
            $query->where('id', $orderId);
        }

        $dispatched = 0;

        $query->select('id')
            ->orderBy('id')
            ->chunkById(200, function ($orders) use (&$dispatched) {
                foreach ($orders as $order) {
                    SyncTawsilexOrderStatusJob::dispatch($order->id);
                    $dispatched++;
                }
            });

        $this->info("Dispatched {$dispatched} Tawsilex sync job(s).");

        return self::SUCCESS;
    }
}
