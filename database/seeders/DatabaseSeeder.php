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
        // Create Roles
        
        // SuperAdmin - Highest level access
        $superAdminRole = Role::create([
            'name' => 'Super Admin',
            'slug' => 'superadmin',
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
        ]);
        
        $adminRole = Role::create([
            'name' => 'Admin',
            'slug' => 'admin',
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
        ]);

        $confirmationAgentRole = Role::create([
            'name' => 'Confirmation Agent',
            'slug' => 'confirmation_agent',
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
        ]);

        $deliveryAgentRole = Role::create([
            'name' => 'Manager',
            'slug' => 'manager',
            'description' => 'Can manage deliveries',
            'permissions' => [
                'view_orders',
                'update_order_status',
                'view_clients',
                'view_dashboard',
            ],
        ]);

        $deliveryRole = Role::create([
            'name' => 'Delivery Person',
            'slug' => 'delivery_person',
            'description' => 'Can only manage assigned orders, schedule callbacks, and track delivery billing.',
            'permissions' => [
                'view_assigned_orders',
                'update_delivery_status',
                'schedule_delivery_callbacks',
                'view_dashboard',
                'view_delivery_billing',
            ],
        ]);

        $vendorRole = Role::create([
            'name' => 'Seller',
            'slug' => 'vendor',
            'description' => 'Seller with limited access',
            'permissions' => [
                'view_own_products',
                'view_own_orders',
                'view_dashboard',
            ],
        ]);

        // Create SuperAdmin User (YOU)
        User::create([
            'name' => 'Houssam SuperAdmin',
            'email' => 'superadmin@ecommerce.com',
            'password' => Hash::make('SuperAdmin@2026'),
            'role_id' => $superAdminRole->id,
            'is_active' => true,
            'phone' => '+212 600 000 000',
            'address' => 'Morocco',
        ]);

        // Create Admin User
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        // Create Confirmation Agent
        User::create([
            'name' => 'Agent Confirmation',
            'email' => 'confirmation@example.com',
            'password' => Hash::make('password'),
            'role_id' => $confirmationAgentRole->id,
            'is_active' => true,
        ]);

        // Create Livraison Agent
        User::create([
            'name' => 'Agent Livraison',
            'email' => 'livraison@example.com',
            'password' => Hash::make('password'),
            'role_id' => $deliveryAgentRole->id,
            'is_active' => true,
        ]);

        // Create Delivery Personnel
        User::create([
            'name' => 'Delivery Person',
            'email' => 'delivery@example.com',
            'password' => Hash::make('password'),
            'role_id' => $deliveryRole->id,
            'is_active' => true,
        ]);

        // Create Vendor
        User::create([
            'name' => 'Vendor User',
            'email' => 'vendor@example.com',
            'password' => Hash::make('password'),
            'role_id' => $vendorRole->id,
            'is_active' => true,
        ]);

        // Create Categories
        Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
            'description' => 'Electronic products',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        Category::create([
            'name' => 'Clothing',
            'slug' => 'clothing',
            'description' => 'Clothing items',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        Category::create([
            'name' => 'Home & Garden',
            'slug' => 'home-garden',
            'description' => 'Home and garden products',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        // Create Expense Categories
        ExpenseCategory::create([
            'name' => 'Rent',
            'description' => 'Office or warehouse rent',
            'is_active' => true,
        ]);

        ExpenseCategory::create([
            'name' => 'Utilities',
            'description' => 'Electricity, water, internet',
            'is_active' => true,
        ]);

        ExpenseCategory::create([
            'name' => 'Marketing',
            'description' => 'Advertising and marketing expenses',
            'is_active' => true,
        ]);

        ExpenseCategory::create([
            'name' => 'Salaries',
            'description' => 'Employee salaries',
            'is_active' => true,
        ]);

        ExpenseCategory::create([
            'name' => 'Transportation',
            'description' => 'Delivery and shipping costs',
            'is_active' => true,
        ]);

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
