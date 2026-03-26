<?php

namespace App\Services;

use App\Models\Order;
use App\Support\MoroccanPhone;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TawsilexService
{
    private string $baseUrl = 'https://tawsilex.com/api';
    private string $fallbackBaseUrl = 'https://tawsilex.com/public/api';
    private string $apiToken;

    public function __construct(?string $apiToken = null)
    {
        $this->apiToken = $apiToken ?? '';
    }

    /**
     * Set the API token for authentication
     */
    public function setApiToken(string $token): self
    {
        $this->apiToken = $token;
        return $this;
    }

    /**
     * Create a new shipment/colis in Tawsilex
     * 
     * @param array $data Shipment data
     * @return array Response from Tawsilex API
     * @throws \Exception
     */
    public function createShipment(array $data): array
    {
        $this->validateApiToken();

        $payload = $this->buildShipmentPayload($data);
        $this->validateShipmentPayload($payload);

        try {
            $response = $this->postFormWithFallback('/client/post/colis/add-colis/', $payload);
            $responseData = $response->json() ?? [];

            Log::info('Tawsilex API response (primary payload)', [
                'status' => $response->status(),
                'response' => $responseData,
            ]);

            // Retry with minimal payload for providers that reject optional fields with 500.
            if (!$response->successful() && $this->isServerErrorResponse($responseData, $response->body())) {
                $minimalPayload = $this->buildShipmentPayload($data, true);
                $response = $this->postFormWithFallback('/client/post/colis/add-colis/', $minimalPayload);
                $responseData = $response->json() ?? [];

                Log::warning('Tawsilex createShipment retried with minimal payload', [
                    'status' => $response->status(),
                    'response' => $responseData,
                    'minimal_payload' => $minimalPayload,
                ]);
            }

            if (isset($responseData['code']) && $responseData['code'] === 'ko') {
                $errorMessage = $responseData['error'] ?? 'Unknown error from Tawsilex';
                throw new \Exception('Tawsilex Error: ' . $errorMessage);
            }

            if (!$response->successful()) {
                throw new \Exception('Failed to create shipment: ' . $response->body());
            }

            // Guard against false-positive "success" without shipment code.
            if (empty($responseData['code_shippment']) && empty($responseData['code_shipment']) && empty($responseData['tracking_code']) && empty($responseData['code'])) {
                throw new \Exception('Tawsilex did not return a tracking code');
            }

            return $responseData;
        } catch (\Exception $e) {
            Log::error('Tawsilex createShipment error', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
            throw $e;
        }
    }

    /**
     * Build shipment payload.
     * When $minimal is true, optional flags are removed (BMDelivery-like payload)
     * to improve compatibility with strict Tawsilex tenants.
     */
    private function buildShipmentPayload(array $data, bool $minimal = false): array
    {
        $payload = [
            'fullname' => $this->normalizeText($data['fullname'] ?? ''),
            'phone' => $this->normalizeMoroccanPhone($data['phone'] ?? ''),
            'city' => $this->normalizeText($data['city'] ?? ''),
            'address' => $this->normalizeAddress($data['address'] ?? ''),
            'price' => $data['price'],
            'product' => $this->normalizeText($data['product'] ?? ''),
            'qty' => $data['qty'],
            'note' => $this->normalizeText($data['note'] ?? ''),
            'internal_id' => $data['internal_id'] ?? null,
        ];

        if (!$minimal) {
            $payload['change'] = $data['change'] ?? 0;
            $payload['coli_exchange'] = $data['coli_exchange'] ?? null;
            $payload['openpackage'] = $data['openpackage'] ?? 0;
            $payload['from_stock'] = $data['from_stock'] ?? 0;
        }

        return array_filter($payload, fn($value) => $value !== null);
    }

    private function validateShipmentPayload(array $payload): void
    {
        if (empty($payload['fullname']) || mb_strlen($payload['fullname']) < 3) {
            throw new \InvalidArgumentException('Client name must be at least 3 characters for Tawsilex.');
        }

        if (!$this->isValidMoroccanPhone($payload['phone'] ?? '')) {
            throw new \InvalidArgumentException('Client phone must be a valid Moroccan mobile number (10 digits, starts with 06 or 07).');
        }

        if (empty($payload['city'])) {
            throw new \InvalidArgumentException('Delivery city is required for Tawsilex.');
        }

        if (empty($payload['product'])) {
            throw new \InvalidArgumentException('Product description is required for Tawsilex.');
        }

        if (!isset($payload['price']) || !is_numeric($payload['price']) || (float) $payload['price'] < 0) {
            throw new \InvalidArgumentException('Order total is invalid for Tawsilex.');
        }
    }

    private function isServerErrorResponse(array $responseData, string $rawBody): bool
    {
        $message = strtolower((string) ($responseData['message'] ?? ''));
        $body = strtolower($rawBody);

        return str_contains($message, 'server error')
            || str_contains($body, 'server error');
    }

    /**
     * Create shipment from an Order model
     * 
     * @param Order $order
     * @param string|null $deliveryCity The city selected from Tawsilex's city list
     * @return array Response from Tawsilex API
     */
    public function createShipmentFromOrder(Order $order, ?string $deliveryCity = null): array
    {
        $order->load(['client', 'items.product']);

        // Prepare products and quantities
        $products = [];
        $quantities = [];
        
        foreach ($order->items as $item) {
            $productName = $item->product->name ?? $item->product_name ?? 'Product';
            $products[] = $productName;
            $quantities[] = $item->quantity;
        }

        // Ensure we have at least one product
        if (empty($products)) {
            $products[] = 'Order Items';
            $quantities[] = 1;
        }

        // Use the provided delivery city, or fallback to client's city
        $city = $deliveryCity ?? $order->client->city ?? $order->city ?? 'Casablanca';
        $fallbackFullname = 'Client ' . ($order->order_number ?? $order->id);
        $rawFullname = $order->client->name ?? null;
        $fullname = $this->sanitizeFullname($rawFullname, $fallbackFullname);
        $phone = $this->normalizeMoroccanPhone($order->client->phone ?? $order->phone ?? '');
        $address = $this->normalizeAddress($order->shipping_address ?? $order->client->address ?? '');

        if ($fullname !== $this->normalizeText($rawFullname ?? '')) {
            Log::warning('Tawsilex fullname sanitized for shipment', [
                'order_id' => $order->id,
                'raw_fullname' => $rawFullname,
                'sanitized_fullname' => $fullname,
            ]);
        }

        Log::info('Using city for Tawsilex', [
            'provided_city' => $deliveryCity,
            'client_city' => $order->client->city ?? null,
            'final_city' => $city,
        ]);

        $data = [
            'fullname' => $fullname,
            'phone' => $phone,
            'city' => $city,
            'address' => $address,
            'price' => (float) $order->total,
            'product' => implode(',', $products),
            'qty' => implode(',', $quantities),
            'note' => $order->notes ?? '',
            'change' => 0,
            'openpackage' => 1,
            'from_stock' => 0,
            'internal_id' => $order->order_number,
        ];

        return $this->createShipment($data);
    }

    private function normalizeMoroccanPhone(?string $phone): string
    {
        return MoroccanPhone::normalize($phone);
    }

    private function isValidMoroccanPhone(string $phone): bool
    {
        return preg_match('/^0[67]\d{8}$/', $phone) === 1;
    }

    private function sanitizeFullname(?string $fullname, string $fallback): string
    {
        $normalized = $this->normalizeText($fullname ?? '');

        // Tawsilex can fail with generic 500 for too-short recipient names.
        if (mb_strlen($normalized) < 3) {
            return $this->normalizeText($fallback);
        }

        return $normalized;
    }

    private function normalizeAddress(?string $address): string
    {
        $normalized = $this->normalizeText($address ?? '');

        // Keep address non-empty to avoid provider-side validation edge cases.
        return $normalized !== '' ? $normalized : '-';
    }

    private function normalizeText(string $value): string
    {
        return trim(preg_replace('/\s+/', ' ', $value) ?? '');
    }

    /**
     * Get list of all shipments
     * 
     * @return array List of shipments
     * @throws \Exception
     */
    public function listShipments(): array
    {
        $this->validateApiToken();

        try {
            $response = $this->getWithFallback('/client/colis/list-colis');

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex listShipments error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get list of shipments ready for pickup (ramassage)
     * 
     * @return array List of shipments
     * @throws \Exception
     */
    public function listShipmentsForPickup(): array
    {
        $this->validateApiToken();

        try {
            $response = $this->getWithFallback('/client/colis/list-colis-ramassage/');

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments for pickup: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex listShipmentsForPickup error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Track a shipment by code (internal_id or tracking code)
     * 
     * @param string $code Tracking code or internal ID
     * @return array Tracking information
     * @throws \Exception
     */
    public function trackShipment(string $code): array
    {
        $this->validateApiToken();

        try {
            $response = $this->getWithFallback("/client/coli/track/{$code}");

            if (!$response->successful()) {
                throw new \Exception('Failed to track shipment: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex trackShipment error', [
                'error' => $e->getMessage(),
                'code' => $code,
            ]);
            throw $e;
        }
    }

    /**
     * Sync order status from Tawsilex tracking endpoint.
     *
     * @param Order $order
     * @return array
     * @throws \Exception
     */
    public function syncOrderStatus(Order $order): array
    {
        if (!$order->delivery_tracking_code) {
            throw new \Exception('Order does not have a tracking code');
        }

        try {
            $trackingData = $this->trackShipment($order->delivery_tracking_code);
            $newStatus = $this->extractLatestStatus($trackingData);

            if (!$newStatus) {
                Log::warning('Could not extract status from Tawsilex response', [
                    'tracking_code' => $order->delivery_tracking_code,
                    'response' => $trackingData,
                ]);
                throw new \Exception('Status not found in Tawsilex response');
            }

            $oldDeliveryStatus = $order->delivery_status;
            $hasChanged = $oldDeliveryStatus !== $newStatus;

            $order->update([
                'delivery_status' => $newStatus,
            ]);

            Log::info('Order delivery status synced from Tawsilex', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'old_status' => $oldDeliveryStatus,
                'new_status' => $newStatus,
                'status_changed' => $hasChanged,
            ]);

            return [
                'success' => true,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'old_delivery_status' => $oldDeliveryStatus,
                'new_delivery_status' => $newStatus,
                'status_changed' => $hasChanged,
                'tracking_data' => $trackingData,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to sync order status from Tawsilex', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'tracking_code' => $order->delivery_tracking_code,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Extract latest status label from Tawsilex track response.
     */
    private function extractLatestStatus(array $trackingData): ?string
    {
        if (isset($trackingData['data']) && is_array($trackingData['data']) && !empty($trackingData['data'])) {
            $events = $trackingData['data'];

            usort($events, function ($a, $b) {
                return ($b['Date_Evenement'] ?? 0) <=> ($a['Date_Evenement'] ?? 0);
            });

            $latestEvent = $events[0];

            return $latestEvent['Etat']
                ?? $latestEvent['etat']
                ?? $latestEvent['status']
                ?? null;
        }

        return $trackingData['Etat']
            ?? $trackingData['etat']
            ?? $trackingData['status']
            ?? null;
    }

    /**
     * Get shipment details for editing
     * 
     * @param string $code Tracking code
     * @return array Shipment details
     * @throws \Exception
     */
    public function getShipment(string $code): array
    {
        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
            ])->get("{$this->baseUrl}/colis/edit/{$code}");

            if (!$response->successful()) {
                throw new \Exception('Failed to get shipment: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex getShipment error', [
                'error' => $e->getMessage(),
                'code' => $code,
            ]);
            throw $e;
        }
    }

    /**
     * Update shipment status
     * 
     * @param array $data Update data
     * @return array Response
     * @throws \Exception
     */
    public function updateShipmentStatus(array $data): array
    {
        $this->validateApiToken();

        $payload = [
            'code' => $data['code'],
            'status' => $data['status'],
            'reporting_date' => $data['reporting_date'] ?? null,
            'note' => $data['note'] ?? null,
            'attachment' => $data['attachment'] ?? null,
        ];

        // Remove null values
        $payload = array_filter($payload, fn($value) => $value !== null);

        try {
            $response = $this->postFormWithFallback('/post/colis/edit/', $payload);

            if (!$response->successful()) {
                throw new \Exception('Failed to update shipment status: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex updateShipmentStatus error', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
            throw $e;
        }
    }

    /**
     * Get list of available statuses
     * 
     * @return array List of statuses
     * @throws \Exception
     */
    public function listStatuses(): array
    {
        $this->validateApiToken();

        try {
            $response = $this->getWithFallback('/client/list-status');

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch statuses: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex listStatuses error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get stock list
     * 
     * @return array Stock list
     * @throws \Exception
     */
    public function listStock(): array
    {
        $this->validateApiToken();

        try {
            $response = $this->getWithFallback('/client/stock/list');

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch stock: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex listStock error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Validate that API token is set
     * 
     * @throws \Exception
     */
    private function validateApiToken(): void
    {
        if (empty($this->apiToken)) {
            throw new \Exception('Tawsilex API token is not set');
        }
    }

    /**
     * Test the API connection
     * 
     * @return bool True if connection is successful
     */
    public function testConnection(): bool
    {
        try {
            $this->listStatuses();
            return true;
        } catch (\Exception $e) {
            Log::error('Tawsilex connection test failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    private function getWithFallback(string $path): Response
    {
        $lastResponse = null;

        foreach ($this->candidateBaseUrls() as $baseUrl) {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get($this->buildUrl($baseUrl, $path));

            $lastResponse = $response;

            if ($response->successful()) {
                return $response;
            }
        }

        return $lastResponse;
    }

    private function postFormWithFallback(string $path, array $payload): Response
    {
        $lastResponse = null;

        foreach ($this->candidateBaseUrls() as $baseUrl) {
            // Tawsilex behaves differently with/without trailing slash on some routes, so try both.
            $paths = [$path, rtrim($path, '/')];

            foreach (array_unique($paths) as $candidatePath) {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Api-Token' => $this->apiToken,
                ])
                    ->asForm()
                    ->withOptions(['allow_redirects' => false])
                    ->post($this->buildUrl($baseUrl, $candidatePath), $payload);

                if (in_array($response->status(), [301, 302, 307, 308], true)) {
                    $location = $response->header('Location');

                    if (!empty($location)) {
                        $response = Http::withHeaders([
                            'Accept' => 'application/json',
                            'Api-Token' => $this->apiToken,
                        ])
                            ->asForm()
                            ->withOptions(['allow_redirects' => false])
                            ->post($this->resolveLocation($baseUrl, $location), $payload);
                    }
                }

                $lastResponse = $response;

                if ($response->successful() && !str_contains($response->body(), 'GET method is not supported')) {
                    return $response;
                }
            }
        }

        return $lastResponse;
    }

    private function candidateBaseUrls(): array
    {
        return [$this->baseUrl, $this->fallbackBaseUrl];
    }

    private function buildUrl(string $baseUrl, string $path): string
    {
        return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    }

    private function resolveLocation(string $baseUrl, string $location): string
    {
        if (str_starts_with($location, 'http://') || str_starts_with($location, 'https://')) {
            return $location;
        }

        if (str_starts_with($location, '/')) {
            return 'https://tawsilex.com' . $location;
        }

        return $this->buildUrl($baseUrl, $location);
    }

}
