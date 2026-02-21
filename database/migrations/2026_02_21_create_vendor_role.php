<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        // Create vendor role
        Role::create([
            'name' => 'Vendor',
            'slug' => 'vendor',
            'description' => 'Vendor/Seller with limited access',
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
