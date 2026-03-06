<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'delivery_city')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('delivery_city')->nullable()->after('city');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('orders', 'delivery_city')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('delivery_city');
            });
        }
    }
};
