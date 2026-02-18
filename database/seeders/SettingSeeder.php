<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General Settings
            [
                'key' => 'app_name',
                'value' => 'Livraison',
                'type' => 'string',
                'group' => 'general',
            ],
            [
                'key' => 'app_description',
                'value' => 'Admin Panel',
                'type' => 'string',
                'group' => 'general',
            ],
            [
                'key' => 'app_logo_url',
                'value' => null,
                'type' => 'string',
                'group' => 'general',
            ],
            [
                'key' => 'app_timezone',
                'value' => 'Africa/Casablanca',
                'type' => 'string',
                'group' => 'general',
            ],
            [
                'key' => 'app_language',
                'value' => 'en',
                'type' => 'string',
                'group' => 'general',
            ],

            // Currency Settings
            [
                'key' => 'currency_code',
                'value' => 'MAD',
                'type' => 'string',
                'group' => 'currency',
            ],
            [
                'key' => 'currency_symbol',
                'value' => 'DH',
                'type' => 'string',
                'group' => 'currency',
            ],
            [
                'key' => 'currency_position',
                'value' => 'after',
                'type' => 'string',
                'group' => 'currency',
            ],
            [
                'key' => 'currency_decimals',
                'value' => '2',
                'type' => 'number',
                'group' => 'currency',
            ],
            [
                'key' => 'currency_decimal_separator',
                'value' => '.',
                'type' => 'string',
                'group' => 'currency',
            ],
            [
                'key' => 'currency_thousand_separator',
                'value' => ',',
                'type' => 'string',
                'group' => 'currency',
            ],

            // Company Settings
            [
                'key' => 'company_name',
                'value' => 'Livraison Company',
                'type' => 'string',
                'group' => 'company',
            ],
            [
                'key' => 'company_email',
                'value' => 'contact@livraison.com',
                'type' => 'string',
                'group' => 'company',
            ],
            [
                'key' => 'company_phone',
                'value' => '+212 600 000 000',
                'type' => 'string',
                'group' => 'company',
            ],
            [
                'key' => 'company_address',
                'value' => 'Casablanca, Morocco',
                'type' => 'string',
                'group' => 'company',
            ],
            [
                'key' => 'company_tax_number',
                'value' => null,
                'type' => 'string',
                'group' => 'company',
            ],
            [
                'key' => 'company_registration_number',
                'value' => null,
                'type' => 'string',
                'group' => 'company',
            ],

            // Order Settings
            [
                'key' => 'order_prefix',
                'value' => 'ORD-',
                'type' => 'string',
                'group' => 'order',
            ],
            [
                'key' => 'order_auto_confirm',
                'value' => '0',
                'type' => 'boolean',
                'group' => 'order',
            ],
            [
                'key' => 'order_low_stock_warning',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'order',
            ],
            [
                'key' => 'order_low_stock_threshold',
                'value' => '10',
                'type' => 'number',
                'group' => 'order',
            ],

            // Notification Settings
            [
                'key' => 'notifications_enabled',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'notification',
            ],
            [
                'key' => 'notifications_email',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'notification',
            ],
            [
                'key' => 'notifications_sms',
                'value' => '0',
                'type' => 'boolean',
                'group' => 'notification',
            ],
            [
                'key' => 'notifications_low_stock',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'notification',
            ],
            [
                'key' => 'notifications_new_order',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'notification',
            ],

            // Commission Settings
            [
                'key' => 'commission_enabled',
                'value' => '1',
                'type' => 'boolean',
                'group' => 'commission',
            ],
            [
                'key' => 'commission_type',
                'value' => 'percentage',
                'type' => 'string',
                'group' => 'commission',
            ],
            [
                'key' => 'commission_value',
                'value' => '10',
                'type' => 'number',
                'group' => 'commission',
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
