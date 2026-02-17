<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Generate API Token ===\n\n";

$user = \App\Models\User::first();

if (!$user) {
    echo "Error: No users found in database.\n";
    echo "Please create a user first.\n";
    exit(1);
}

$token = $user->createToken('api-test-token');

echo "✓ Token generated successfully!\n\n";
echo "User: {$user->email}\n";
echo "Token: {$token->plainTextToken}\n\n";

echo "=== Test the API ===\n\n";
echo "Copy and paste this command:\n\n";
echo "curl -X GET http://localhost:8000/api/api-integrations -H \"Authorization: Bearer {$token->plainTextToken}\" -H \"Accept: application/json\"\n\n";

echo "Or use this in your frontend/Postman:\n";
echo "Authorization: Bearer {$token->plainTextToken}\n\n";
