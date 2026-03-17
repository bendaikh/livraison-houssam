<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')
            ->where('slug', 'vendor')
            ->update([
                'name' => 'Seller',
                'description' => 'Seller with limited access',
            ]);
    }

    public function down(): void
    {
        DB::table('roles')
            ->where('slug', 'vendor')
            ->update([
                'name' => 'Vendor',
                'description' => 'Vendor/Seller with limited access',
            ]);
    }
};
