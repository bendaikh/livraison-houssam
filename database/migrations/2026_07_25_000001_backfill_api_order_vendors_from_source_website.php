<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('orders') || !Schema::hasColumn('orders', 'source_website')) {
            return;
        }

        $vendors = DB::table('vendors')
            ->get(['id', 'name', 'company_name']);

        foreach ($vendors as $vendor) {
            $labels = $this->labelsForVendor($vendor);
            if ($labels === []) {
                continue;
            }

            // Link custom API integrations that share the seller / store name.
            if (Schema::hasTable('api_integrations')) {
                foreach ($labels as $label) {
                    DB::table('api_integrations')
                        ->whereNull('vendor_id')
                        ->where('provider', 'custom_api')
                        ->where(function ($query) use ($label) {
                            $query->where('name', 'like', '%' . $label . '%');
                        })
                        ->update(['vendor_id' => $vendor->id]);
                }
            }

            $orders = DB::table('orders')
                ->whereNull('vendor_id')
                ->whereIn('source', ['custom_api', 'website'])
                ->whereNotNull('source_website')
                ->select(['id', 'source_website'])
                ->orderBy('id')
                ->cursor();

            foreach ($orders as $order) {
                $website = json_decode((string) $order->source_website, true);
                if (!is_array($website)) {
                    continue;
                }

                if ($this->websiteMatchesLabels($website, $labels)) {
                    DB::table('orders')
                        ->where('id', $order->id)
                        ->whereNull('vendor_id')
                        ->update(['vendor_id' => $vendor->id]);
                }
            }
        }
    }

    /**
     * @return list<string>
     */
    private function labelsForVendor(object $vendor): array
    {
        $labels = [];

        foreach ([$vendor->company_name ?? null, $vendor->name ?? null] as $raw) {
            $value = trim((string) $raw);
            if ($value === '') {
                continue;
            }

            $labels[] = $value;

            if (preg_match('/^([^\(\-\|]+)/u', $value, $matches)) {
                $token = trim($matches[1]);
                $token = preg_replace('/\b(store|shop|boutique)\b$/iu', '', $token) ?? $token;
                $token = trim($token);
                if (mb_strlen($token) >= 3) {
                    $labels[] = $token;
                }
            }
        }

        $labels = array_values(array_unique(array_filter($labels, function ($label) {
            return mb_strlen(trim((string) $label)) >= 3;
        })));

        usort($labels, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        return $labels;
    }

    /**
     * @param  list<string>  $labels
     */
    private function websiteMatchesLabels(array $website, array $labels): bool
    {
        $owner = is_array($website['owner'] ?? null) ? $website['owner'] : [];
        $candidates = array_filter([
            $website['store_name'] ?? null,
            $website['name'] ?? null,
            $website['subdomain'] ?? null,
            $owner['company_name'] ?? null,
            $owner['name'] ?? null,
        ], fn ($value) => trim((string) $value) !== '');

        foreach ($candidates as $candidate) {
            $candidateLower = mb_strtolower(trim((string) $candidate));
            foreach ($labels as $label) {
                $labelLower = mb_strtolower($label);
                if (
                    $candidateLower === $labelLower
                    || str_contains($candidateLower, $labelLower)
                    || str_contains($labelLower, $candidateLower)
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    public function down(): void
    {
        // Data backfill — no rollback
    }
};
