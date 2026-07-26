<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Console\Command;

class RecalculateSellerOrderFees extends Command
{
    protected $signature = 'orders:recalculate-seller-fees
        {--vendor-id= : Limit to a single vendor}
        {--only-zero : Only update orders whose commission_amount is currently 0 or null}
        {--dry-run : Show how many orders would be updated without writing}';

    protected $description = 'Recalculate seller platform fees (product + shipping + fulfillment) without applying Frais COD commission.';

    public function handle(OrderService $orderService): int
    {
        $vendorId = $this->option('vendor-id') ? (int) $this->option('vendor-id') : null;
        $onlyZero = (bool) $this->option('only-zero');
        $dryRun = (bool) $this->option('dry-run');

        $query = Order::query()
            ->whereNotNull('vendor_id')
            ->when($vendorId, fn ($q) => $q->where('vendor_id', $vendorId))
            ->when($onlyZero, function ($q) {
                $q->where(function ($inner) {
                    $inner->where('commission_amount', 0)->orWhereNull('commission_amount');
                });
            })
            ->orderBy('id');

        $total = (clone $query)->count();
        $this->info(($dryRun ? '[dry-run] ' : '') . "Recalculating seller fees for {$total} order(s)...");

        if ($dryRun || $total === 0) {
            return self::SUCCESS;
        }

        $updated = 0;
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $query->with('items.product')->chunkById(100, function ($orders) use ($orderService, &$updated, $bar) {
            foreach ($orders as $order) {
                $orderService->applySellerFinancials($order);
                $updated++;
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("Updated {$updated} order(s).");

        return self::SUCCESS;
    }
}
