<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ApiIntegration;

class DefaultApiIntegrationsSeeder extends Seeder
{
    public function run(): void
    {
        // Create default Tawsilex integration (empty token, needs user config)
        ApiIntegration::firstOrCreate(
            ['provider' => 'tawsilex', 'type' => 'delivery'],
            [
                'name' => 'Tawsilex',
                'is_active' => true,
                'credentials' => [
                    'api_token' => '', // User must add their token
                ],
                'settings' => [
                    'allow_exchanges' => true,
                    'default_city' => 'Casablanca',
                ],
            ]
        );

        // Create default BMDelivery integration (empty token, needs user config)
        ApiIntegration::firstOrCreate(
            ['provider' => 'bmdelivery', 'type' => 'delivery'],
            [
                'name' => 'BMDelivery',
                'is_active' => true,
                'credentials' => [
                    'api_token' => '', // User must add their token
                ],
                'settings' => [
                    'allow_exchanges' => true,
                    'default_city' => 'Casablanca',
                ],
            ]
        );

        // Create default Shopify integration (empty credentials, needs user config)
        ApiIntegration::firstOrCreate(
            ['provider' => 'shopify', 'type' => 'shopify'],
            [
                'name' => 'Shopify',
                'is_active' => false,
                'credentials' => [
                    'shop_url' => '',
                    'access_token' => '',
                ],
                'settings' => [
                    'sync_products' => true,
                    'sync_orders' => true,
                ],
            ]
        );

        $this->command->info('✓ Default API integrations created');
    }
}
