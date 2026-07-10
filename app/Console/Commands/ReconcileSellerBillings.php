<?php

namespace App\Console\Commands;

use App\Models\Vendor;
use App\Services\BillingService;
use Illuminate\Console\Command;

class ReconcileSellerBillings extends Command
{
    protected $signature = 'billing:reconcile-sellers
        {--vendor-id= : Limit the reconciliation to a single vendor}';

    protected $description = 'Reconcile seller invoices: refresh unpaid invoices, create supplemental invoices for orders delivered after a period was already paid, and regenerate PDFs.';

    public function handle(BillingService $billingService): int
    {
        $vendorId = $this->option('vendor-id') ? (int) $this->option('vendor-id') : null;

        if ($vendorId) {
            $vendor = Vendor::find($vendorId);

            if (!$vendor) {
                $this->error("Vendor #{$vendorId} was not found.");

                return self::FAILURE;
            }

            $this->info("Reconciling seller invoices for vendor #{$vendorId} ({$vendor->name})...");
        } else {
            $this->info('Reconciling seller invoices for all active vendors...');
        }

        $stats = $billingService->reconcileSellerBillings(
            $vendorId,
            function (Vendor $vendor, int $supplementsCreated, int $pdfsRegenerated) {
                $suffix = $supplementsCreated > 0
                    ? " (+{$supplementsCreated} supplemental invoice(s))"
                    : '';

                $this->line("  - {$vendor->name}: {$pdfsRegenerated} PDF(s) refreshed{$suffix}");
            }
        );

        $this->newLine();
        $this->info('Reconciliation complete.');
        $this->table(
            ['Vendors', 'Supplemental invoices created', 'PDFs regenerated', 'Orders re-flagged as invoiced'],
            [[
                $stats['vendors'],
                $stats['supplements_created'],
                $stats['pdfs_regenerated'],
                $stats['orders_reassigned'],
            ]]
        );

        return self::SUCCESS;
    }
}
