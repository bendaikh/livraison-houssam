<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'callback_date')) {
                $table->timestamp('callback_date')->nullable()->after('confirmation_agent_id');
                $table->index('callback_date');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'is_upsell')) {
                $table->boolean('is_upsell')->default(false)->after('subtotal');
                $table->index('is_upsell');
            }
        });

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace','google_sheet','whatsapp') DEFAULT 'manual'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TYPE orders_source_enum ADD VALUE IF NOT EXISTS 'whatsapp'");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY source ENUM('manual','shopify','delivery_company','marketplace','google_sheet') DEFAULT 'manual'");
        }

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'is_upsell')) {
                $table->dropIndex(['is_upsell']);
                $table->dropColumn('is_upsell');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'callback_date')) {
                $table->dropIndex(['callback_date']);
                $table->dropColumn('callback_date');
            }
        });
    }
};
