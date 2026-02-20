<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('roles')
            ->where('slug', 'agent_livraison')
            ->update([
                'slug' => 'manager',
                'name' => 'Manager'
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')
            ->where('slug', 'manager')
            ->update([
                'slug' => 'agent_livraison',
                'name' => 'Agent Livraison'
            ]);
    }
};
