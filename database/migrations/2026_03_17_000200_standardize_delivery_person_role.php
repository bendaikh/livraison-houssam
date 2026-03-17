<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = json_encode([
            'view_assigned_orders',
            'update_delivery_status',
            'schedule_delivery_callbacks',
            'view_dashboard',
            'view_delivery_billing',
        ]);

        $legacyRole = DB::table('roles')->where('slug', 'delivery')->first();
        $currentRole = DB::table('roles')->where('slug', 'delivery_person')->first();

        if ($legacyRole && !$currentRole) {
            DB::table('roles')
                ->where('id', $legacyRole->id)
                ->update([
                    'name' => 'Delivery Person',
                    'slug' => 'delivery_person',
                    'description' => 'Can only manage assigned orders, schedule callbacks, and track delivery billing.',
                    'permissions' => $permissions,
                    'updated_at' => now(),
                ]);

            return;
        }

        if ($currentRole) {
            DB::table('roles')
                ->where('id', $currentRole->id)
                ->update([
                    'name' => 'Delivery Person',
                    'description' => 'Can only manage assigned orders, schedule callbacks, and track delivery billing.',
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
            'name' => 'Delivery Person',
            'slug' => 'delivery_person',
            'description' => 'Can only manage assigned orders, schedule callbacks, and track delivery billing.',
            'permissions' => $permissions,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $role = DB::table('roles')->where('slug', 'delivery_person')->first();

        if (!$role) {
            return;
        }

        DB::table('roles')
            ->where('id', $role->id)
            ->update([
                'name' => 'Delivery',
                'slug' => 'delivery',
                'description' => 'Delivery personnel',
                'permissions' => json_encode([
                    'view_assigned_orders',
                    'update_delivery_status',
                    'view_clients',
                ]),
                'updated_at' => now(),
            ]);
    }
};
