<?php

namespace App\Console\Commands;

use App\Models\ApiIntegration;
use App\Services\ApiIntegrationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncGoogleSheetOrders extends Command
{
    protected $signature = 'google-sheet:sync {--integration-id=}';

    protected $description = 'Automatically import new orders from configured Google Sheets integrations';

    public function __construct(
        private ApiIntegrationService $apiIntegrationService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $query = ApiIntegration::query()
            ->where('provider', 'google_sheet')
            ->where('is_active', true);

        if ($integrationId = $this->option('integration-id')) {
            $query->where('id', $integrationId);
        }

        $integrations = $query->get()->filter(function (ApiIntegration $integration) {
            $autoSync = $integration->settings['auto_sync'] ?? true;
            if (!$autoSync) {
                return false;
            }

            $connected = $integration->settings['connected_sheets'] ?? [];
            if (is_array($connected) && collect($connected)->contains(function ($sheet) {
                return is_array($sheet)
                    && !empty($sheet['sheet_id'])
                    && !empty($sheet['tab'])
                    && (($sheet['auto_sync'] ?? true) !== false);
            })) {
                return true;
            }

            $credentials = $integration->credentials ?? [];
            return !empty($credentials['sheet_id']) && !empty($credentials['range']);
        });

        if ($integrations->isEmpty()) {
            $this->info('No active Google Sheet integrations ready for auto-sync.');
            return self::SUCCESS;
        }

        $this->info("Syncing {$integrations->count()} Google Sheet integration(s)...");

        $successCount = 0;
        $failCount = 0;

        foreach ($integrations as $integration) {
            try {
                $this->line("Syncing integration #{$integration->id} ({$integration->name})...");
                $log = $this->apiIntegrationService->syncGoogleSheetOrders($integration->id);
                $this->info("  {$log->message}");
                $successCount++;
            } catch (\Throwable $e) {
                $failCount++;
                $this->error("  Failed: {$e->getMessage()}");
                Log::error('Google Sheet auto-sync failed', [
                    'integration_id' => $integration->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Done. Success: {$successCount}, Failed: {$failCount}");

        return $failCount > 0 ? self::FAILURE : self::SUCCESS;
    }
}
