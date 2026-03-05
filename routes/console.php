<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Legacy sync command (BMDelivery) every 30 minutes.
Schedule::command('orders:sync-delivery-statuses --provider=bmdelivery')->everyThirtyMinutes();

// Tawsilex automatic sync every 10 minutes.
// Uses direct sync command to avoid dependency on queue workers in hosted environments.
Schedule::command('orders:sync-delivery-statuses --provider=tawsilex')
    ->everyTenMinutes()
    ->withoutOverlapping();
