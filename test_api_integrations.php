<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Testing API Integrations ===\n\n";

// Check database connection
try {
    $count = \App\Models\ApiIntegration::count();
    echo "✓ Database connected\n";
    echo "✓ Found {$count} integrations in database\n\n";
} catch (\Exception $e) {
    echo "✗ Database error: {$e->getMessage()}\n";
    exit(1);
}

// List all integrations
echo "=== Integrations List ===\n";
$integrations = \App\Models\ApiIntegration::all();

if ($integrations->isEmpty()) {
    echo "No integrations found. Run: php artisan db:seed --class=ApiIntegrationSeeder\n";
} else {
    foreach ($integrations as $integration) {
        echo "\nID: {$integration->id}\n";
        echo "Name: {$integration->name}\n";
        echo "Type: {$integration->type}\n";
        echo "Provider: {$integration->provider}\n";
        echo "Active: " . ($integration->is_active ? 'Yes' : 'No') . "\n";
        echo "Credentials: " . json_encode($integration->credentials) . "\n";
        echo str_repeat('-', 50) . "\n";
    }
}

echo "\n=== API Endpoint Test ===\n";
echo "To test the API endpoint, you need to:\n";
echo "1. Be authenticated (have a valid token)\n";
echo "2. Make a GET request to: /api/api-integrations\n";
echo "3. Include header: Authorization: Bearer YOUR_TOKEN\n\n";

echo "Example curl command:\n";
echo "curl -X GET http://localhost:8000/api/api-integrations \\\n";
echo "  -H \"Authorization: Bearer YOUR_TOKEN\" \\\n";
echo "  -H \"Accept: application/json\"\n\n";

// Check if user exists for testing
$user = \App\Models\User::first();
if ($user) {
    echo "✓ Found user: {$user->email}\n";
    echo "  You can create a token for this user to test the API\n";
} else {
    echo "✗ No users found. You need to create a user first.\n";
}

echo "\n=== Done ===\n";
