<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule automatic delivery status synchronization
// Run every 30 minutes for active orders
Schedule::command('orders:sync-delivery-statuses')->everyThirtyMinutes();
