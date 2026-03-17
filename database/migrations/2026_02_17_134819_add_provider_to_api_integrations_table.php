<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('api_integrations', 'provider')) {
            Schema::table('api_integrations', function (Blueprint $table) {
                $table->string('provider')->nullable()->after('type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('api_integrations', 'provider')) {
            Schema::table('api_integrations', function (Blueprint $table) {
                $table->dropColumn('provider');
            });
        }
    }
};
