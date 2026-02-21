<?php

namespace App\Console\Commands;

use App\Models\ApiIntegration;
use Illuminate\Console\Command;

class CheckShopifyIntegration extends Command
{
    protected $signature = 'shopify:check {--fix : Fix issues automatically}';
    protected $description = 'Check Shopify integration configuration and credentials';

    public function handle()
    {
        $this->info('🔍 Checking Shopify Integration...');
        $this->newLine();

        $integrations = ApiIntegration::where('type', 'shopify')->get();

        if ($integrations->isEmpty()) {
            $this->error('❌ No Shopify integrations found!');
            $this->newLine();
            
            if ($this->option('fix')) {
                $this->info('Creating default Shopify integration...');
                $integration = ApiIntegration::create([
                    'name' => 'Shopify Store',
                    'type' => 'shopify',
                    'provider' => 'shopify',
                    'is_active' => false,
                    'credentials' => [
                        'shop_url' => '',
                        'access_token' => '',
                    ],
                    'settings' => [],
                ]);
                $this->info("✅ Created integration with ID: {$integration->id}");
                $this->warn('⚠️  Please configure shop_url and access_token!');
            } else {
                $this->warn('Run with --fix to create a default integration');
            }
            
            return 0;
        }

        foreach ($integrations as $integration) {
            $this->info("═══════════════════════════════════════");
            $this->info("Integration ID: {$integration->id}");
            $this->info("Name: {$integration->name}");
            $this->info("Type: {$integration->type}");
            $this->info("Provider: " . ($integration->provider ?: 'Not set'));
            $this->info("Active: " . ($integration->is_active ? '✅ YES' : '❌ NO'));
            $this->info("Last Sync: " . ($integration->last_sync_at ? $integration->last_sync_at->format('Y-m-d H:i:s') : 'Never'));
            $this->newLine();

            // Check credentials
            $credentials = $integration->credentials;
            
            $this->info("📋 Credentials Check:");
            
            if (empty($credentials)) {
                $this->error("  ❌ Credentials field is empty or NULL");
                
                if ($this->option('fix')) {
                    $this->warn("  🔧 Fixing: Setting empty credentials array...");
                    $integration->update([
                        'credentials' => [
                            'shop_url' => '',
                            'access_token' => '',
                        ]
                    ]);
                    $this->info("  ✅ Fixed! Please configure shop_url and access_token.");
                } else {
                    $this->warn("  Run with --fix to initialize credentials");
                }
                
                continue;
            }

            if (!is_array($credentials)) {
                $this->error("  ❌ Credentials is not an array! Type: " . gettype($credentials));
                
                if ($this->option('fix')) {
                    $this->warn("  🔧 Fixing: Converting to array...");
                    $integration->update([
                        'credentials' => [
                            'shop_url' => '',
                            'access_token' => '',
                        ]
                    ]);
                    $this->info("  ✅ Fixed! Please configure shop_url and access_token.");
                }
                
                continue;
            }

            // Check shop_url
            $shopUrl = $credentials['shop_url'] ?? '';
            if (empty($shopUrl)) {
                $this->error("  ❌ shop_url: NOT SET");
            } else {
                $this->info("  ✅ shop_url: {$shopUrl}");
                
                // Validate format
                if (!str_contains($shopUrl, 'myshopify.com') && !str_contains($shopUrl, 'http')) {
                    $this->warn("  ⚠️  shop_url format looks incorrect");
                    $this->warn("     Expected: yourstore.myshopify.com");
                    $this->warn("     Got: {$shopUrl}");
                }
            }

            // Check access_token
            $accessToken = $credentials['access_token'] ?? '';
            if (empty($accessToken)) {
                $this->error("  ❌ access_token: NOT SET");
            } else {
                $tokenLength = strlen($accessToken);
                $tokenStart = substr($accessToken, 0, 10);
                $this->info("  ✅ access_token: {$tokenStart}... (length: {$tokenLength})");
                
                if ($tokenLength < 20) {
                    $this->warn("  ⚠️  Token seems too short (might be invalid)");
                }
            }

            $this->newLine();

            // Summary
            $hasShopUrl = !empty($shopUrl);
            $hasAccessToken = !empty($accessToken);
            $isActive = $integration->is_active;

            if ($hasShopUrl && $hasAccessToken && $isActive) {
                $this->info("✅ Integration looks good!");
                
                // Test connection
                if ($this->confirm('Would you like to test the connection?', true)) {
                    $this->testConnection($integration);
                }
            } else {
                $this->warn("⚠️  Issues found:");
                if (!$hasShopUrl) $this->error("   - shop_url is not configured");
                if (!$hasAccessToken) $this->error("   - access_token is not configured");
                if (!$isActive) $this->warn("   - Integration is not active");
                
                $this->newLine();
                $this->info("To fix:");
                $this->info("1. Go to your app: API Integrations page");
                $this->info("2. Edit this integration (ID: {$integration->id})");
                $this->info("3. Set shop_url: yourstore.myshopify.com");
                $this->info("4. Set access_token: Your Shopify Admin API token");
                $this->info("5. Make sure it's Active (green toggle)");
                $this->info("6. Save and try syncing again");
            }

            $this->newLine();
        }

        return 0;
    }

    private function testConnection($integration)
    {
        $this->info('🔌 Testing connection to Shopify...');
        
        try {
            $shopifyService = new \App\Services\ShopifyService();
            $credentials = $integration->credentials;
            $shopifyService->setCredentials(
                $credentials['shop_url'] ?? '',
                $credentials['access_token'] ?? ''
            );
            
            $shopInfo = $shopifyService->getShopInfo();
            
            if (isset($shopInfo['shop'])) {
                $this->info('✅ Connection successful!');
                $this->info('   Shop: ' . ($shopInfo['shop']['name'] ?? 'N/A'));
                $this->info('   Domain: ' . ($shopInfo['shop']['domain'] ?? 'N/A'));
                $this->info('   Email: ' . ($shopInfo['shop']['email'] ?? 'N/A'));
            } else {
                $this->warn('⚠️  Connected but unexpected response');
            }
        } catch (\Exception $e) {
            $this->error('❌ Connection failed!');
            $this->error('   Error: ' . $e->getMessage());
        }
    }
}
