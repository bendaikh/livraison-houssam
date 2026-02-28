<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change status from enum to string for more flexibility
        Schema::table('orders', function (Blueprint $table) {
            $table->string('status', 50)->default('pending')->change();
        });
        
        // Add new timestamp fields for new statuses
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('picked_up_at')->nullable()->after('confirmed_at');
            $table->timestamp('ready_for_shipping_at')->nullable()->after('picked_up_at');
            $table->timestamp('out_for_delivery_at')->nullable()->after('ready_for_shipping_at');
            $table->timestamp('refused_at')->nullable()->after('cancelled_at');
            $table->timestamp('returned_at')->nullable()->after('refused_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'picked_up_at',
                'ready_for_shipping_at',
                'out_for_delivery_at',
                'refused_at',
                'returned_at'
            ]);
        });
        
        // Revert back to enum (note: may lose data if new statuses exist)
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])->default('pending')->change();
        });
    }
};
