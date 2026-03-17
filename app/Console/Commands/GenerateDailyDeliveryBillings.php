<?php

namespace App\Console\Commands;

use App\Http\Controllers\DeliveryPersonBillingController;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateDailyDeliveryBillings extends Command
{
    protected $signature = 'delivery-billings:generate-daily {--date=} {--delivery-person-id=}';

    protected $description = 'Generate daily invoices for delivery people.';

    public function handle(DeliveryPersonBillingController $controller): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->startOfDay()
            : Carbon::yesterday()->startOfDay();
        $deliveryPersonId = $this->option('delivery-person-id')
            ? (int) $this->option('delivery-person-id')
            : null;

        $billings = $controller->generateDailyBillings($date, $deliveryPersonId, true);

        $this->info(sprintf(
            'Generated %d delivery billing record(s) for %s.',
            $billings->count(),
            $date->toDateString()
        ));

        return self::SUCCESS;
    }
}
