<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        // Create seller role while keeping the vendor slug for compatibility
        Role::create([
            'name' => 'Seller',
            'slug' => 'vendor',
            'description' => 'Seller with limited access',
            'permissions' => [
                'view_dashboard',
                'manage_orders',
                'view_marketplace',
                'manage_api_integrations',
                'view_products',
            ],
        ]);
    }

    public function down(): void
    {
        Role::where('slug', 'vendor')->delete();
    }
};
