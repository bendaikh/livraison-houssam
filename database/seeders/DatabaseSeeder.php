<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\Category;
use App\Models\ExpenseCategory;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Roles (using firstOrCreate to avoid duplicates)
        
        // SuperAdmin - Highest level access
        $superAdminRole = Role::firstOrCreate(
            ['slug' => 'superadmin'],
            [
                'name' => 'Super Admin',
                'description' => 'Supreme administrator with all permissions',
                'permissions' => [
                    'manage_products',
                    'manage_orders',
                    'manage_clients',
                    'manage_vendors',
                    'manage_expenses',
                    'manage_stock',
                    'manage_users',
                    'manage_roles',
                    'manage_settings',
                    'view_dashboard',
                    'manage_api_integrations',
                    'view_reports',
                    'manage_categories',
                    'delete_anything',
                    'access_everything',
                ],
            ]
        );
        
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'description' => 'Full system access',
                'permissions' => [
                    'manage_products',
                    'manage_orders',
                    'manage_clients',
                    'manage_vendors',
                    'manage_expenses',
                    'manage_stock',
                    'manage_users',
                    'manage_settings',
                    'view_dashboard',
                    'manage_api_integrations',
                ],
            ]
        );

        $confirmationAgentRole = Role::firstOrCreate(
            ['slug' => 'confirmation_agent'],
            [
                'name' => 'Confirmation Agent',
                'description' => 'Calls customers, confirms orders, schedules callbacks, and tracks personal billing.',
                'permissions' => [
                    'view_orders',
                    'update_order_status',
                    'schedule_callbacks',
                    'manage_upsells',
                    'view_clients',
                    'view_products',
                    'view_dashboard',
                    'view_commission',
                ],
            ]
        );

        $deliveryAgentRole = Role::firstOrCreate(
            ['slug' => 'manager'],
            [
                'name' => 'Manager',
                'description' => 'Can manage deliveries',
                'permissions' => [
                    'view_orders',
                    'update_order_status',
                    'view_clients',
                    'view_dashboard',
                ],
            ]
        );

        $deliveryRole = Role::firstOrCreate(
            ['slug' => 'delivery_person'],
            [
                'name' => 'Delivery Person',
                'description' => 'Can only manage assigned orders, schedule callbacks, and track delivery billing.',
                'permissions' => [
                    'view_assigned_orders',
                    'update_delivery_status',
                    'schedule_delivery_callbacks',
                    'view_dashboard',
                    'view_delivery_billing',
                ],
            ]
        );

        $vendorRole = Role::firstOrCreate(
            ['slug' => 'vendor'],
            [
                'name' => 'Seller',
                'description' => 'Seller with limited access',
                'permissions' => [
                    'view_own_products',
                    'view_own_orders',
                    'view_dashboard',
                ],
            ]
        );

        // Create SuperAdmin User (YOU)
        User::firstOrCreate(
            ['email' => 'superadmin@ecommerce.com'],
            [
                'name' => 'Houssam SuperAdmin',
                'password' => Hash::make('SuperAdmin@2026'),
                'role_id' => $superAdminRole->id,
                'is_active' => true,
                'phone' => '+212 600 000 000',
                'address' => 'Morocco',
            ]
        );

        // Create Admin User
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]
        );

        // Create Confirmation Agent
        User::firstOrCreate(
            ['email' => 'confirmation@example.com'],
            [
                'name' => 'Agent Confirmation',
                'password' => Hash::make('password'),
                'role_id' => $confirmationAgentRole->id,
                'is_active' => true,
            ]
        );

        // Create Livraison Agent
        User::firstOrCreate(
            ['email' => 'livraison@example.com'],
            [
                'name' => 'Agent Livraison',
                'password' => Hash::make('password'),
                'role_id' => $deliveryAgentRole->id,
                'is_active' => true,
            ]
        );

        // Create Delivery Personnel
        User::firstOrCreate(
            ['email' => 'delivery@example.com'],
            [
                'name' => 'Delivery Person',
                'password' => Hash::make('password'),
                'role_id' => $deliveryRole->id,
                'is_active' => true,
            ]
        );

        // Create Vendor
        User::firstOrCreate(
            ['email' => 'vendor@example.com'],
            [
                'name' => 'Vendor User',
                'password' => Hash::make('password'),
                'role_id' => $vendorRole->id,
                'is_active' => true,
            ]
        );

        // Create Categories
        Category::firstOrCreate(
            ['slug' => 'electronics'],
            [
                'name' => 'Electronics',
                'description' => 'Electronic products',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'clothing'],
            [
                'name' => 'Clothing',
                'description' => 'Clothing items',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'home-garden'],
            [
                'name' => 'Home & Garden',
                'description' => 'Home and garden products',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        // Create Expense Categories
        ExpenseCategory::firstOrCreate(
            ['name' => 'Rent'],
            [
                'description' => 'Office or warehouse rent',
                'is_active' => true,
            ]
        );

        ExpenseCategory::firstOrCreate(
            ['name' => 'Utilities'],
            [
                'description' => 'Electricity, water, internet',
                'is_active' => true,
            ]
        );

        ExpenseCategory::firstOrCreate(
            ['name' => 'Marketing'],
            [
                'description' => 'Advertising and marketing expenses',
                'is_active' => true,
            ]
        );

        ExpenseCategory::firstOrCreate(
            ['name' => 'Salaries'],
            [
                'description' => 'Employee salaries',
                'is_active' => true,
            ]
        );

        ExpenseCategory::firstOrCreate(
            ['name' => 'Transportation'],
            [
                'description' => 'Delivery and shipping costs',
                'is_active' => true,
            ]
        );

        // Create Settings
        Setting::set('company_name', 'Advanced eCommerce', 'string', 'company');
        Setting::set('company_email', 'contact@ecommerce.com', 'string', 'company');
        Setting::set('company_phone', '+212 600 000 000', 'string', 'company');
        Setting::set('company_address', 'Casablanca, Morocco', 'string', 'company');
        Setting::set('currency', 'MAD', 'string', 'general');
        Setting::set('currency_symbol', 'DH', 'string', 'general');
        Setting::set('default_commission_rate', 10, 'number', 'commission');
        Setting::set('low_stock_threshold', 10, 'number', 'general');
        Setting::set('enable_email_notifications', true, 'boolean', 'notification');
        Setting::set('enable_low_stock_alerts', true, 'boolean', 'notification');
        Setting::set('default_shipping_cost', 30, 'number', 'delivery');
        Setting::set('tax_rate', 20, 'number', 'general');

        // Call other seeders
        $this->call([
            DefaultApiIntegrationsSeeder::class,
            CitiesSeeder::class,
        ]);
    }
}
