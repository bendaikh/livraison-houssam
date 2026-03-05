<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Legacy sync command (BMDelivery) every 30 minutes.
Schedule::command('orders:sync-delivery-statuses --provider=bmdelivery')->everyThirtyMinutes();

// Tawsilex automatic sync dispatcher every 10 minutes.
// It dispatches queued jobs to fetch status from /client/coli/track/{tracking_code}.
Schedule::command('orders:dispatch-tawsilex-status-sync')
    ->everyTenMinutes()
    ->withoutOverlapping();
