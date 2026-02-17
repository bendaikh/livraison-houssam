<?php

namespace Database\Seeders;

use App\Models\ApiIntegration;
use Illuminate\Database\Seeder;

class ApiIntegrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Example Shopify Integration
        ApiIntegration::create([
            'name' => 'Example Shopify Store',
            'type' => 'shopify',
            'provider' => 'shopify',
            'is_active' => false, // Set to false by default for security
            'credentials' => [
                'shop_url' => 'https://example-store.myshopify.com',
                'access_token' => 'shpat_example_token_replace_with_real',
            ],
            'settings' => [
                'auto_sync' => false,
                'sync_interval' => 3600, // 1 hour
                'import_fulfilled_orders' => true,
            ],
        ]);

        // Example Tawsilex Integration
        ApiIntegration::create([
            'name' => 'Tawsilex Delivery',
            'type' => 'delivery',
            'provider' => 'tawsilex',
            'is_active' => false, // Set to false by default for security
            'credentials' => [
                'api_token' => 'example_tawsilex_token_replace_with_real',
            ],
            'settings' => [
                'auto_create_shipment' => false,
                'default_openpackage' => 1,
                'default_try_product' => 0,
            ],
        ]);

        // Example BMDelivery Integration
        ApiIntegration::create([
            'name' => 'BMDelivery Service',
            'type' => 'delivery',
            'provider' => 'bmdelivery',
            'is_active' => false, // Set to false by default for security
            'credentials' => [
                'api_token' => 'example_bmdelivery_token_replace_with_real',
            ],
            'settings' => [
                'auto_create_shipment' => false,
                'default_openpackage' => 1,
            ],
        ]);
    }
}
