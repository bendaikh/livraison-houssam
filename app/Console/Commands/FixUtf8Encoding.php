<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixUtf8Encoding extends Command
{
    protected $signature = 'db:fix-utf8-encoding {--dry-run : Preview changes without updating the database}';

    protected $description = 'Fix double-encoded UTF-8 text (Arabic mojibake) in the database';

    private const SKIP_TABLES = [
        'migrations',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'personal_access_tokens',
        'password_reset_tokens',
    ];

    private const SKIP_COLUMNS = [
        'password',
        'token',
        'remember_token',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $database = DB::getDatabaseName();
        $tableKey = "Tables_in_{$database}";
        $totalUpdated = 0;

        if ($dryRun) {
            $this->warn('Dry run mode — no changes will be saved.');
        }

        foreach (DB::select('SHOW TABLES') as $tableRow) {
            $table = $tableRow->$tableKey;

            if (in_array($table, self::SKIP_TABLES, true)) {
                continue;
            }

            $columns = DB::select(
                "SHOW FULL COLUMNS FROM `{$table}` WHERE Type LIKE '%char%' OR Type LIKE '%text%'"
            );

            foreach ($columns as $column) {
                $columnName = $column->Field;

                if (in_array($columnName, self::SKIP_COLUMNS, true)) {
                    continue;
                }

                $count = DB::table($table)->where($columnName, 'LIKE', '%Ø%')->count();

                if ($count === 0) {
                    continue;
                }

                $this->line("{$table}.{$columnName}: {$count} row(s)");

                if ($dryRun) {
                    $samples = DB::select(
                        "SELECT `{$columnName}` AS value,
                                CONVERT(CAST(CONVERT(`{$columnName}` USING latin1) AS BINARY) USING utf8mb4) AS fixed
                         FROM `{$table}`
                         WHERE `{$columnName}` LIKE ?
                         LIMIT 3",
                        ['%Ø%']
                    );

                    foreach ($samples as $sample) {
                        $this->line("  - {$sample->value}");
                        $this->line("    => {$sample->fixed}");
                    }

                    $totalUpdated += $count;
                    continue;
                }

                $updated = DB::affectingStatement(
                    "UPDATE `{$table}`
                     SET `{$columnName}` = CONVERT(CAST(CONVERT(`{$columnName}` USING latin1) AS BINARY) USING utf8mb4)
                     WHERE `{$columnName}` LIKE ?",
                    ['%Ø%']
                );

                $totalUpdated += $updated;
            }
        }

        $this->newLine();
        $this->info($dryRun
            ? "Would update {$totalUpdated} row(s)."
            : "Updated {$totalUpdated} row(s).");

        return self::SUCCESS;
    }
}
