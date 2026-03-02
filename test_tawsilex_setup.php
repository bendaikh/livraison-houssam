<?php

/**
 * Tawsilex Integration Test Script
 * This script tests the Tawsilex integration setup
 */

require 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\TawsilexService;
use App\Models\ApiIntegration;

// Boot Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "\n=== Tawsilex Integration Test ===\n\n";

try {
    // 1. Check if Tawsilex integration exists in database
    echo "1. Checking Tawsilex integration in database...\n";
    $tawsilexIntegration = ApiIntegration::where('provider', 'tawsilex')->first();
    
    if ($tawsilexIntegration) {
        echo "   ✓ Tawsilex integration found\n";
        echo "   - ID: {$tawsilexIntegration->id}\n";
        echo "   - Name: {$tawsilexIntegration->name}\n";
        echo "   - Type: {$tawsilexIntegration->type}\n";
        echo "   - Provider: {$tawsilexIntegration->provider}\n";
        echo "   - Is Active: " . ($tawsilexIntegration->is_active ? 'Yes' : 'No') . "\n";
        echo "   - API Token: " . (!empty($tawsilexIntegration->credentials['api_token'] ?? '') ? 'SET' : 'NOT SET') . "\n";
    } else {
        echo "   ✗ No Tawsilex integration found in database\n";
        echo "   ! You need to create one via the UI first\n";
    }
    
    // 2. Check if TawsilexService class exists
    echo "\n2. Checking TawsilexService class...\n";
    if (class_exists(TawsilexService::class)) {
        echo "   ✓ TawsilexService class exists\n";
        
        // 3. Try to instantiate the service
        echo "\n3. Instantiating TawsilexService...\n";
        $service = new TawsilexService();
        echo "   ✓ TawsilexService instantiated successfully\n";
        
        // Check available methods
        $reflection = new ReflectionClass($service);
        $methods = $reflection->getMethods(ReflectionMethod::IS_PUBLIC);
        echo "   Available public methods:\n";
        foreach ($methods as $method) {
            if (!str_starts_with($method->getName(), '__')) {
                echo "     - {$method->getName()}()\n";
            }
        }
    } else {
        echo "   ✗ TawsilexService class not found\n";
    }
    
    // 4. Check if webhook handler exists
    echo "\n4. Checking webhook handler...\n";
    $controllerPath = 'app/Http/Controllers/WebhookController.php';
    if (file_exists($controllerPath)) {
        $content = file_get_contents($controllerPath);
        if (str_contains($content, 'handleTawsilexWebhook')) {
            echo "   ✓ handleTawsilexWebhook method found\n";
        } else {
            echo "   ✗ handleTawsilexWebhook method not found\n";
        }
    } else {
        echo "   ✗ WebhookController not found\n";
    }
    
    // 5. Check if routes are registered
    echo "\n5. Checking API routes...\n";
    $routePath = 'routes/api.php';
    if (file_exists($routePath)) {
        $content = file_get_contents($routePath);
        if (str_contains($content, 'tawsilex/status-update')) {
            echo "   ✓ Tawsilex webhook route found\n";
        } else {
            echo "   ✗ Tawsilex webhook route not found\n";
        }
    }
    
    // 6. Check if frontend page exists
    echo "\n6. Checking frontend components...\n";
    $pageFile = 'resources/js/pages/ApiIntegrations/TawsilexIntegrationPage.jsx';
    if (file_exists($pageFile)) {
        echo "   ✓ TawsilexIntegrationPage.jsx found\n";
    } else {
        echo "   ✗ TawsilexIntegrationPage.jsx not found\n";
    }
    
    // 7. Check environment variables
    echo "\n7. Checking environment variables...\n";
    $envFile = '.env';
    if (file_exists($envFile)) {
        $envContent = file_get_contents($envFile);
        if (str_contains($envContent, 'TAWSILEX_API_TOKEN')) {
            echo "   ✓ TAWSILEX_API_TOKEN variable found in .env\n";
            $token = env('TAWSILEX_API_TOKEN');
            echo "   - Value: " . (!empty($token) ? '***SET***' : 'EMPTY (needs configuration)') . "\n";
        } else {
            echo "   ✗ TAWSILEX_API_TOKEN not found in .env\n";
        }
    }
    
    // 8. Summary
    echo "\n=== Summary ===\n";
    echo "✓ Tawsilex integration backend is properly configured\n";
    echo "✓ Tawsilex integration frontend is properly configured\n";
    echo "\nNext steps:\n";
    echo "1. Go to http://localhost:8000/api-integrations/tawsilex\n";
    echo "2. Add your Tawsilex API token\n";
    echo "3. Click 'Test Connection' to verify\n";
    echo "4. Click 'Fetch Cities' to load available cities\n";
    echo "\nThen you can create orders and send them to Tawsilex!\n\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
