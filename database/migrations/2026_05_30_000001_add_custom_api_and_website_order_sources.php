<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace','google_sheet','whatsapp','custom_api','website') DEFAULT 'manual'");
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TYPE orders_source_enum ADD VALUE IF NOT EXISTS 'custom_api'");
            DB::statement("ALTER TYPE orders_source_enum ADD VALUE IF NOT EXISTS 'website'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace','google_sheet','whatsapp') DEFAULT 'manual'");
        }
    }
};
