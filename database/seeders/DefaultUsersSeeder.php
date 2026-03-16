<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class DefaultUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Create or get roles first
        $superAdminRole = Role::firstOrCreate(
            ['slug' => 'superadmin'],
            [
                'name' => 'Super Admin',
                'description' => 'Supreme administrator with all permissions',
                'permissions' => json_encode([
                    'manage_products', 'manage_orders', 'manage_clients', 'manage_vendors',
                    'manage_expenses', 'manage_stock', 'manage_users', 'manage_roles',
                    'manage_settings', 'view_dashboard', 'manage_api_integrations',
                    'view_reports', 'manage_categories', 'delete_anything', 'access_everything'
                ]),
            ]
        );

        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'description' => 'Full system access',
                'permissions' => json_encode([
                    'manage_products', 'manage_orders', 'manage_clients', 'manage_vendors',
                    'manage_expenses', 'manage_stock', 'manage_users', 'manage_settings',
                    'view_dashboard', 'manage_api_integrations'
                ]),
            ]
        );

        $confirmationAgentRole = Role::firstOrCreate(
            ['slug' => 'confirmation_agent'],
            [
                'name' => 'Confirmation Agent',
                'description' => 'Calls customers, confirms orders, schedules callbacks, and tracks personal billing.',
                'permissions' => json_encode([
                    'view_orders', 'update_order_status', 'schedule_callbacks', 'manage_upsells',
                    'view_clients', 'view_products', 'view_dashboard', 'view_commission'
                ]),
            ]
        );

        $managerRole = Role::firstOrCreate(
            ['slug' => 'manager'],
            [
                'name' => 'Manager',
                'description' => 'Can manage deliveries',
                'permissions' => json_encode([
                    'view_orders', 'update_order_status', 'view_clients', 'view_dashboard'
                ]),
            ]
        );

        $deliveryRole = Role::firstOrCreate(
            ['slug' => 'delivery'],
            [
                'name' => 'Delivery',
                'description' => 'Delivery personnel',
                'permissions' => json_encode([
                    'view_assigned_orders', 'update_delivery_status', 'view_clients'
                ]),
            ]
        );

        $vendorRole = Role::firstOrCreate(
            ['slug' => 'vendor'],
            [
                'name' => 'Vendor',
                'description' => 'Vendor/Supplier',
                'permissions' => json_encode([
                    'view_own_products', 'view_own_orders', 'view_dashboard'
                ]),
            ]
        );

        // Create or update superadmin user
        $super = User::where('email', 'superadmin@ecommerce.com')->first();

        $password = 'SuperAdmin@2026';

        $payload = [
            'name' => 'Super Admin',
            'email' => 'superadmin@ecommerce.com',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
            'remember_token' => Str::random(10),
            'role_id' => $superAdminRole->id,
            'is_active' => true,
        ];

        if ($super) {
            $super->update($payload);
            $this->command->info('Updated existing superadmin user.');
        } else {
            User::create($payload);
            $this->command->info('Created superadmin user.');
        }

        // Create or update other default users
        $testUsers = [
            [
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => 'password',
                'role_id' => $adminRole->id,
            ],
            [
                'name' => 'Agent Confirmation',
                'email' => 'confirmation@example.com',
                'password' => 'password',
                'role_id' => $confirmationAgentRole->id,
            ],
            [
                'name' => 'Agent Livraison',
                'email' => 'livraison@example.com',
                'password' => 'password',
                'role_id' => $managerRole->id,
            ],
            [
                'name' => 'Delivery Person',
                'email' => 'delivery@example.com',
                'password' => 'password',
                'role_id' => $deliveryRole->id,
            ],
            [
                'name' => 'Vendor User',
                'email' => 'vendor@example.com',
                'password' => 'password',
                'role_id' => $vendorRole->id,
            ],
        ];

        foreach ($testUsers as $userData) {
            $existing = User::where('email', $userData['email'])->first();
            if ($existing) {
                $existing->update([
                    'name' => $userData['name'],
                    'password' => Hash::make($userData['password']),
                    'role_id' => $userData['role_id'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);
                $this->command->info("Updated {$userData['email']}");
            } else {
                User::create([
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'password' => Hash::make($userData['password']),
                    'role_id' => $userData['role_id'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                    'remember_token' => Str::random(10),
                ]);
                $this->command->info("Created {$userData['email']}");
            }
        }

        $this->command->info('✓ Default superadmin credentials: superadmin@ecommerce.com / ' . $password);
    }
}
