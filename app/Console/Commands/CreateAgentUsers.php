<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAgentUsers extends Command
{
    protected $signature = 'agents:create';
    protected $description = 'Create agent users (confirmation and delivery agents)';

    public function handle()
    {
        $this->info('Creating agent users...');

        // Get roles
        $confirmationRole = Role::where('slug', 'agent_confirmation')->first();
        $deliveryRole = Role::where('slug', 'agent_livraison')->first();
        $deliveryRole2 = Role::where('slug', 'delivery')->first();

        if (!$confirmationRole) {
            $this->error('Confirmation agent role not found! Creating it...');
            $confirmationRole = Role::create([
                'name' => 'Agent Confirmation',
                'slug' => 'agent_confirmation',
                'description' => 'Can confirm orders',
                'permissions' => ['view_orders', 'confirm_orders', 'view_clients', 'view_products', 'view_dashboard'],
            ]);
        }

        if (!$deliveryRole) {
            $this->error('Delivery agent role not found! Creating it...');
            $deliveryRole = Role::create([
                'name' => 'Agent Livraison',
                'slug' => 'agent_livraison',
                'description' => 'Can manage deliveries',
                'permissions' => ['view_orders', 'update_order_status', 'view_clients', 'view_dashboard'],
            ]);
        }

        if (!$deliveryRole2) {
            $this->info('Creating Delivery role...');
            $deliveryRole2 = Role::create([
                'name' => 'Delivery',
                'slug' => 'delivery',
                'description' => 'Delivery personnel',
                'permissions' => ['view_assigned_orders', 'update_delivery_status', 'view_clients'],
            ]);
        }

        // Create or update confirmation agents
        $confirmationAgent1 = User::updateOrCreate(
            ['email' => 'confirmation1@example.com'],
            [
                'name' => 'Agent Confirmation 1',
                'password' => Hash::make('password'),
                'role_id' => $confirmationRole->id,
                'is_active' => true,
                'phone' => '+212 600 111 111',
            ]
        );
        $this->info("✓ Created/Updated: {$confirmationAgent1->name}");

        $confirmationAgent2 = User::updateOrCreate(
            ['email' => 'confirmation2@example.com'],
            [
                'name' => 'Agent Confirmation 2',
                'password' => Hash::make('password'),
                'role_id' => $confirmationRole->id,
                'is_active' => true,
                'phone' => '+212 600 222 222',
            ]
        );
        $this->info("✓ Created/Updated: {$confirmationAgent2->name}");

        // Create or update delivery agents
        $deliveryAgent1 = User::updateOrCreate(
            ['email' => 'livraison1@example.com'],
            [
                'name' => 'Agent Livraison 1',
                'password' => Hash::make('password'),
                'role_id' => $deliveryRole->id,
                'is_active' => true,
                'phone' => '+212 600 333 333',
            ]
        );
        $this->info("✓ Created/Updated: {$deliveryAgent1->name}");

        $deliveryAgent2 = User::updateOrCreate(
            ['email' => 'livraison2@example.com'],
            [
                'name' => 'Agent Livraison 2',
                'password' => Hash::make('password'),
                'role_id' => $deliveryRole->id,
                'is_active' => true,
                'phone' => '+212 600 444 444',
            ]
        );
        $this->info("✓ Created/Updated: {$deliveryAgent2->name}");

        $deliveryPerson1 = User::updateOrCreate(
            ['email' => 'delivery1@example.com'],
            [
                'name' => 'Delivery Person 1',
                'password' => Hash::make('password'),
                'role_id' => $deliveryRole2->id,
                'is_active' => true,
                'phone' => '+212 600 555 555',
            ]
        );
        $this->info("✓ Created/Updated: {$deliveryPerson1->name}");

        $deliveryPerson2 = User::updateOrCreate(
            ['email' => 'delivery2@example.com'],
            [
                'name' => 'Delivery Person 2',
                'password' => Hash::make('password'),
                'role_id' => $deliveryRole2->id,
                'is_active' => true,
                'phone' => '+212 600 666 666',
            ]
        );
        $this->info("✓ Created/Updated: {$deliveryPerson2->name}");

        $this->info('');
        $this->info('✅ Agent users created successfully!');
        $this->info('');
        $this->info('Summary:');
        $this->info("- Confirmation Agents: " . User::where('role_id', $confirmationRole->id)->where('is_active', true)->count());
        $this->info("- Delivery Agents (Livraison): " . User::where('role_id', $deliveryRole->id)->where('is_active', true)->count());
        $this->info("- Delivery Personnel: " . User::where('role_id', $deliveryRole2->id)->where('is_active', true)->count());
        $this->info('');
        $this->info('All agents use password: password');

        return Command::SUCCESS;
    }
}
