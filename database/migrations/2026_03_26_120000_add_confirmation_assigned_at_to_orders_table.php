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
            if (!Schema::hasColumn('orders', 'confirmation_assigned_at')) {
                $table->timestamp('confirmation_assigned_at')->nullable()->after('confirmation_agent_id');
            }
        });

        DB::table('orders')
            ->whereNotNull('confirmation_agent_id')
            ->whereNull('confirmation_assigned_at')
            ->update([
                'confirmation_assigned_at' => DB::raw('COALESCE(returned_to_confirmation_at, confirmed_at, updated_at, created_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'confirmation_assigned_at')) {
                $table->dropColumn('confirmation_assigned_at');
            }
        });
    }
};
