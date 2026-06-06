<?php

namespace App\Services;

use App\Models\ApiIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleOAuthService
{
    private const SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
    ];

    public function getAuthorizationUrl(int $integrationId): string
    {
        $clientId = $this->clientId();
        $redirectUri = $this->redirectUri();

        if ($clientId === '' || $redirectUri === '') {
            throw new \RuntimeException('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
        }

        $state = base64_encode(json_encode([
            'integration_id' => $integrationId,
            'nonce' => Str::random(32),
        ]));

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;
    }

    public function handleCallback(string $code, int $integrationId): ApiIntegration
    {
        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect_uri' => $this->redirectUri(),
            'grant_type' => 'authorization_code',
        ]);

        if (!$tokenResponse->successful()) {
            throw new \RuntimeException('Failed to exchange Google authorization code: ' . $tokenResponse->body());
        }

        $tokenData = $tokenResponse->json();
        $integration = ApiIntegration::findOrFail($integrationId);
        $credentials = $integration->credentials ?? [];

        $credentials['oauth'] = [
            'access_token' => $tokenData['access_token'] ?? null,
            'refresh_token' => $tokenData['refresh_token'] ?? ($credentials['oauth']['refresh_token'] ?? null),
            'expires_at' => now()->addSeconds((int) ($tokenData['expires_in'] ?? 3600))->toIso8601String(),
            'token_type' => $tokenData['token_type'] ?? 'Bearer',
            'scope' => $tokenData['scope'] ?? implode(' ', self::SCOPES),
        ];

        $userInfo = Http::withToken($credentials['oauth']['access_token'])
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        if ($userInfo->successful()) {
            $credentials['oauth']['email'] = $userInfo->json('email');
        }

        $integration->update(['credentials' => $credentials]);

        return $integration->fresh();
    }

    public function disconnect(ApiIntegration $integration): ApiIntegration
    {
        $credentials = $integration->credentials ?? [];
        unset($credentials['oauth'], $credentials['sheet_id'], $credentials['sheet_name'], $credentials['sheet_url']);
        $integration->update(['credentials' => $credentials]);

        return $integration->fresh();
    }

    public function getValidAccessToken(ApiIntegration $integration): string
    {
        $oauth = $integration->credentials['oauth'] ?? null;
        if (!$oauth || empty($oauth['access_token'])) {
            throw new \RuntimeException('Google account is not connected. Click "Connect with Google" first.');
        }

        $expiresAt = isset($oauth['expires_at']) ? \Carbon\Carbon::parse($oauth['expires_at']) : null;
        if ($expiresAt && $expiresAt->greaterThan(now()->addMinute())) {
            return (string) $oauth['access_token'];
        }

        if (empty($oauth['refresh_token'])) {
            return (string) $oauth['access_token'];
        }

        $refreshResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'refresh_token' => $oauth['refresh_token'],
            'grant_type' => 'refresh_token',
        ]);

        if (!$refreshResponse->successful()) {
            throw new \RuntimeException('Failed to refresh Google access token. Please reconnect your Google account.');
        }

        $tokenData = $refreshResponse->json();
        $credentials = $integration->credentials ?? [];
        $credentials['oauth']['access_token'] = $tokenData['access_token'];
        $credentials['oauth']['expires_at'] = now()->addSeconds((int) ($tokenData['expires_in'] ?? 3600))->toIso8601String();
        if (!empty($tokenData['refresh_token'])) {
            $credentials['oauth']['refresh_token'] = $tokenData['refresh_token'];
        }

        $integration->update(['credentials' => $credentials]);

        return (string) $credentials['oauth']['access_token'];
    }

    public function listSpreadsheets(ApiIntegration $integration): array
    {
        $accessToken = $this->getValidAccessToken($integration);

        $response = Http::withToken($accessToken)->get('https://www.googleapis.com/drive/v3/files', [
            'q' => "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            'orderBy' => 'modifiedTime desc',
            'pageSize' => 100,
            'fields' => 'files(id,name,modifiedTime,webViewLink)',
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Failed to list Google Drive spreadsheets: ' . $response->body());
        }

        return collect($response->json('files', []))
            ->map(fn (array $file) => [
                'id' => $file['id'] ?? '',
                'name' => $file['name'] ?? '',
                'modified_at' => $file['modifiedTime'] ?? null,
                'url' => $file['webViewLink'] ?? null,
            ])
            ->filter(fn (array $file) => $file['id'] !== '')
            ->values()
            ->all();
    }

    public function isConnected(ApiIntegration $integration): bool
    {
        $oauth = $integration->credentials['oauth'] ?? null;

        return is_array($oauth) && !empty($oauth['access_token']);
    }

    public function frontendRedirectUrl(string $query = ''): string
    {
        $base = rtrim((string) config('services.google.oauth.frontend_redirect', config('app.url')), '/');

        return $base . '/dashboard/api-integrations/google-sheet' . ($query ? '?' . $query : '');
    }

    private function clientId(): string
    {
        return trim((string) config('services.google.oauth.client_id', ''));
    }

    private function clientSecret(): string
    {
        return trim((string) config('services.google.oauth.client_secret', ''));
    }

    private function redirectUri(): string
    {
        return trim((string) config('services.google.oauth.redirect_uri', ''));
    }
}
