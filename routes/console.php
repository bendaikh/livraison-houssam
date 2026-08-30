<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Hostinger-compatible scheduler
|--------------------------------------------------------------------------
| Shared hosting disables proc_open/exec, so Schedule::command() cannot spawn
| child artisan processes. Use Schedule::call() + Artisan::call() instead so
| tasks run inside the same PHP process started by cron:
|   /usr/bin/php .../artisan schedule:run
|
| Also prefer a dedicated Hostinger cron for Google Sheets:
|   /usr/bin/php .../artisan google-sheet:sync >> /dev/null 2>&1
*/

// Auto-import new Google Sheet orders every minute (run first / keep light).
Schedule::call(function () {
    Log::info('Scheduled google-sheet-sync starting');
    Artisan::call('google-sheet:sync');
})->everyMinute()
    ->name('google-sheet-sync')
    ->withoutOverlapping(2);

// Legacy sync command (BMDelivery) every 30 minutes.
Schedule::call(fn () => Artisan::call('orders:sync-delivery-statuses', ['--provider' => 'bmdelivery']))
    ->everyThirtyMinutes()
    ->name('orders-sync-bmdelivery')
    ->withoutOverlapping(25);

// Tawsilex automatic sync every 10 minutes.
Schedule::call(fn () => Artisan::call('orders:sync-delivery-statuses', ['--provider' => 'tawsilex']))
    ->everyTenMinutes()
    ->name('orders-sync-tawsilex')
    ->withoutOverlapping(8);

Schedule::call(fn () => Artisan::call('delivery-billings:generate-daily'))
    ->dailyAt('00:00')
    ->name('delivery-billings-generate-daily')
    ->withoutOverlapping(120);
