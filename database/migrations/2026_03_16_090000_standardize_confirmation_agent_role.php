<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = json_encode([
            'view_orders',
            'update_order_status',
            'schedule_callbacks',
            'manage_upsells',
            'view_clients',
            'view_products',
            'view_dashboard',
            'view_commission',
        ]);

        $legacyRole = DB::table('roles')->where('slug', 'agent_confirmation')->first();
        $currentRole = DB::table('roles')->where('slug', 'confirmation_agent')->first();

        if ($legacyRole && !$currentRole) {
            DB::table('roles')
                ->where('id', $legacyRole->id)
                ->update([
                    'name' => 'Confirmation Agent',
                    'slug' => 'confirmation_agent',
                    'description' => 'Calls customers, confirms orders, schedules callbacks, and tracks personal billing.',
                    'permissions' => $permissions,
                    'updated_at' => now(),
                ]);

            return;
        }

        if ($currentRole) {
            DB::table('roles')
                ->where('id', $currentRole->id)
                ->update([
                    'name' => 'Confirmation Agent',
                    'description' => 'Calls customers, confirms orders, schedules callbacks, and tracks personal billing.',
                    'permissions' => $permissions,
                    'updated_at' => now(),
                ]);

            if ($legacyRole && $legacyRole->id !== $currentRole->id) {
                DB::table('users')
                    ->where('role_id', $legacyRole->id)
                    ->update(['role_id' => $currentRole->id]);

                DB::table('roles')->where('id', $legacyRole->id)->delete();
            }

            return;
        }

        DB::table('roles')->insert([
            'name' => 'Confirmation Agent',
            'slug' => 'confirmation_agent',
            'description' => 'Calls customers, confirms orders, schedules callbacks, and tracks personal billing.',
            'permissions' => $permissions,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $role = DB::table('roles')->where('slug', 'confirmation_agent')->first();

        if (!$role) {
            return;
        }

        DB::table('roles')
            ->where('id', $role->id)
            ->update([
                'name' => 'Agent Confirmation',
                'slug' => 'agent_confirmation',
                'description' => 'Can confirm orders',
                'permissions' => json_encode([
                    'view_orders',
                    'confirm_orders',
                    'view_clients',
                    'view_products',
                    'view_dashboard',
                ]),
                'updated_at' => now(),
            ]);
    }
};
