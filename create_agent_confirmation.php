<?php
/**
 * Create Agent Confirmation User
 * Run: php create_agent_confirmation.php
 */

require __DIR__ . '/vendor/autoload.php';

// Initialize Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

// Get or create Agent Confirmation role
$role = Role::where('slug', 'agent_confirmation')->first();

if (!$role) {
    echo "Error: Agent Confirmation role not found!\n";
    echo "Please run: php artisan migrate:fresh --seed\n";
    exit(1);
}

// Generate unique credentials
$firstName = 'Fatima';
$lastName = 'Agent';
$email = 'fatima.agent@example.com';
$password = 'AgentConfirm@2026';
$phone = '+212 600 123 456';

// Check if user already exists
if (User::where('email', $email)->exists()) {
    echo "User with email {$email} already exists!\n";
    
    // Show existing user info
    $user = User::where('email', $email)->first();
    echo "\nExisting User Details:\n";
    echo "Name: {$user->name}\n";
    echo "Email: {$user->email}\n";
    echo "Role: {$user->role->name}\n";
    echo "Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    exit(0);
}

// Create new agent confirmation user
try {
    $user = User::create([
        'name' => "{$firstName} {$lastName}",
        'email' => $email,
        'password' => Hash::make($password),
        'role_id' => $role->id,
        'is_active' => true,
        'phone' => $phone,
        'address' => 'Morocco',
    ]);

    echo "✅ Agent Confirmation User Created Successfully!\n";
    echo "\n========================================\n";
    echo "📋 Your Agent Confirmation Credentials\n";
    echo "========================================\n";
    echo "Name:     {$user->name}\n";
    echo "Email:    {$user->email}\n";
    echo "Password: {$password}\n";
    echo "Phone:    {$phone}\n";
    echo "Role:     {$role->name}\n";
    echo "Active:   Yes\n";
    echo "========================================\n";
    echo "\n✅ User successfully added to database!\n";
    echo "🔓 You can now login with these credentials\n";
    echo "📱 Access Level: " . implode(', ', $role->permissions ?? []) . "\n";

} catch (\Exception $e) {
    echo "❌ Error creating user: {$e->getMessage()}\n";
    exit(1);
}
?>
