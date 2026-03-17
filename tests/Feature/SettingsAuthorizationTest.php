<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_settings_endpoints(): void
    {
        $user = $this->createUserWithRole('delivery_person', 'Delivery Person');

        Sanctum::actingAs($user);

        $this->getJson('/api/settings')->assertForbidden();
        $this->getJson('/api/settings/app_name')->assertForbidden();
        $this->putJson('/api/settings', [
            'settings' => ['app_name' => 'Blocked update'],
        ])->assertForbidden();
    }

    public function test_non_admin_can_load_shared_app_settings_only(): void
    {
        $user = $this->createUserWithRole('delivery_person', 'Delivery Person');

        Setting::set('app_name', 'Livraison Secure');
        Setting::set('currency_symbol', 'MAD');
        Setting::set('company_email', 'private@example.com');

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/app-settings');

        $response->assertOk();
        $response->assertJsonPath('app_name', 'Livraison Secure');
        $response->assertJsonPath('currency_symbol', 'MAD');
        $response->assertJsonMissingPath('company_email');
    }

    public function test_admin_can_access_settings_endpoints(): void
    {
        $admin = $this->createUserWithRole('admin', 'Admin');

        Setting::set('company_email', 'admin@example.com');

        Sanctum::actingAs($admin);

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('company_email', 'admin@example.com');

        $this->putJson('/api/settings', [
            'settings' => ['app_name' => 'Updated by admin'],
        ])->assertOk();

        $this->assertSame('Updated by admin', Setting::get('app_name'));
    }

    private function createUserWithRole(string $slug, string $name): User
    {
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => $name]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
