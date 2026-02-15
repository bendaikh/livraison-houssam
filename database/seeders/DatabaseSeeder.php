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
            'description' => 'Can confirm orders',
            'permissions' => [
                'view_orders',
                'confirm_orders',
                'view_clients',
                'view_products',
                'view_dashboard',
            ],
        ]);

        $deliveryAgentRole = Role::create([
            'name' => 'Delivery Agent',
            'slug' => 'delivery_agent',
            'description' => 'Can manage deliveries',
            'permissions' => [
                'view_orders',
                'update_order_status',
                'view_clients',
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
            'name' => 'Confirmation Agent',
            'email' => 'confirmation@example.com',
            'password' => Hash::make('password'),
            'role_id' => $confirmationAgentRole->id,
            'is_active' => true,
        ]);

        // Create Delivery Agent
        User::create([
            'name' => 'Delivery Agent',
            'email' => 'delivery@example.com',
            'password' => Hash::make('password'),
            'role_id' => $deliveryAgentRole->id,
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
    }
}
