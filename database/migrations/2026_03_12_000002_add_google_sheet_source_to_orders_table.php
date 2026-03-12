<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Add google_sheet to source enum
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace','google_sheet') DEFAULT 'manual'");
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TYPE orders_source_enum ADD VALUE IF NOT EXISTS 'google_sheet'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace') DEFAULT 'manual'");
        }
        // For pgsql we leave the value since enum value removal is destructive.
    }
};
