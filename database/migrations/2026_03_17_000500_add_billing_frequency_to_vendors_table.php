<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (!Schema::hasColumn('vendors', 'billing_frequency')) {
                $table->string('billing_frequency')->default('weekly')->after('commission_rate');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (Schema::hasColumn('vendors', 'billing_frequency')) {
                $table->dropColumn('billing_frequency');
            }
        });
    }
};
