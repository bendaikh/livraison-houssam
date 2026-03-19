<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class BMDeliveryService
{
    private string $baseUrl = 'https://bmdelivery.ma/api';
    private string $apiToken;

    public function __construct(?string $apiToken = null)
    {
        $this->apiToken = $apiToken ?? '';
        $this->baseUrl = rtrim((string) config('services.bmdelivery.base_url', $this->baseUrl), '/');
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
     * Create a new shipment/colis in BMDelivery
     * 
     * @param array $data Shipment data
     * @return array Response from BMDelivery API
     * @throws \Exception
     */
    public function createShipment(array $data): array
    {
        $this->validateApiToken();

        $payload = $this->buildShipmentPayload($data);

        try {
            $response = $this->request()
                ->asForm()
                ->post("{$this->baseUrl}/client/post/colis/add-colis/", $payload);

            if (in_array($response->status(), [301, 302, 307, 308], true)) {
                $location = $response->header('Location');

                if (!empty($location)) {
                    $response = $this->request()
                        ->asForm()
                        ->post($location, $payload);
                }
            }

            if (!$response->successful() && str_contains($response->body(), 'GET method is not supported')) {
                $response = $this->request()
                    ->asForm()
                    ->post("{$this->baseUrl}/client/post/colis/add-colis", $payload);
            }

            $responseData = $response->json();
            
            Log::info('BMDelivery API response', [
                'status' => $response->status(),
                'response' => $responseData,
            ]);

            // Check for error in response (BMDelivery returns code: "ko" for errors)
            if (isset($responseData['code']) && $responseData['code'] === 'ko') {
                $errorMessage = $responseData['error'] ?? 'Unknown error from BMDelivery';
                throw new \Exception('BMDelivery Error: ' . $errorMessage);
            }

            if (!$response->successful()) {
                throw new \Exception('Failed to create shipment: ' . $response->body());
            }

            return $responseData;
        } catch (Throwable $e) {
            $this->logRequestFailure('BMDelivery createShipment error', $e, [
                'payload' => $payload,
                'endpoint' => "{$this->baseUrl}/client/post/colis/add-colis/",
            ]);
            throw $e;
        }
    }

    /**
     * Map Arabic/alternative city names to BMDelivery accepted French names
     */
    private function mapCityName(string $city): string
    {
        // Common Arabic to French city mappings for Morocco
        $cityMapping = [
            // Arabic names - exact matches
            'الدار البيضاء' => 'Casablanca',
            'كازابلانكا' => 'Casablanca',
            'الرباط' => 'Rabat',
            'فاس' => 'Fes',
            'مراكش' => 'Marrakech',
            'طنجة' => 'Tanger',
            'أكادير' => 'Agadir',
            'مكناس' => 'Meknes',
            'وجدة' => 'Oujda',
            'القنيطرة' => 'Kenitra',
            'تطوان' => 'Tetouan',
            'سلا' => 'Sale',
            'الجديدة' => 'El Jadida',
            'بني ملال' => 'Beni Mellal',
            'خريبكة' => 'Khouribga',
            'الناظور' => 'Nador',
            'سطات' => 'Settat',
            'آسفي' => 'Safi',
            'المحمدية' => 'Mohammedia',
            'تازة' => 'Taza',
            'العيون' => 'Laayoune',
            'خنيفرة' => 'Khenifra',
            'الراشيدية' => 'Errachidia',
            'ورزازات' => 'Ouarzazate',
            'برشيد' => 'Berrechid',
            'تمارة' => 'Temara',
            'بوجدور' => 'Boujdour',
            'الداخلة' => 'Dakhla',
            'طرفاية' => 'Tarfaya',
            'السمارة' => 'Smara',
            'تيزنيت' => 'Tiznit',
            'طاطا' => 'Tata',
            'كلميم' => 'Guelmim',
            'سيدي إفني' => 'Sidi Ifni',
            'أصيلة' => 'Asilah',
            'شفشاون' => 'Chefchaouen',
            'الحسيمة' => 'Al Hoceima',
            'ميدلت' => 'Midelt',
            'إفران' => 'Ifrane',
            'أزرو' => 'Azrou',
            'الصويرة' => 'Essaouira',
            'زاكورة' => 'Zagora',
            'تنغير' => 'Tinghir',
            'فكيك' => 'Figuig',
            'جرادة' => 'Jerada',
            'بركان' => 'Berkane',
            'تاوريرت' => 'Taourirt',
            
            // French variations (normalize spelling)
            'casa' => 'Casablanca',
            'casa blanca' => 'Casablanca',
            'marrakesh' => 'Marrakech',
            'tangier' => 'Tanger',
            'fez' => 'Fes',
            'meknas' => 'Meknes',
            'el jadida' => 'El Jadida',
            'el-jadida' => 'El Jadida',
            'beni-mellal' => 'Beni Mellal',
            'al hoceima' => 'Al Hoceima',
            'al-hoceima' => 'Al Hoceima',
        ];

        // Partial matches - city contains this keyword
        $partialMatches = [
            'الدار البيضاء' => 'Casablanca',
            'البيضاء' => 'Casablanca',
            'كازا' => 'Casablanca',
            'casablanca' => 'Casablanca',
            'casa' => 'Casablanca',
            'الرباط' => 'Rabat',
            'rabat' => 'Rabat',
            'مراكش' => 'Marrakech',
            'marrakech' => 'Marrakech',
            'طنجة' => 'Tanger',
            'tanger' => 'Tanger',
            'فاس' => 'Fes',
            'fes' => 'Fes',
            'أكادير' => 'Agadir',
            'agadir' => 'Agadir',
            'مكناس' => 'Meknes',
            'meknes' => 'Meknes',
            'وجدة' => 'Oujda',
            'oujda' => 'Oujda',
            'القنيطرة' => 'Kenitra',
            'kenitra' => 'Kenitra',
            'سلا' => 'Sale',
            'sale' => 'Sale',
            'المحمدية' => 'Mohammedia',
            'mohammedia' => 'Mohammedia',
            'تمارة' => 'Temara',
            'temara' => 'Temara',
            'الناظور' => 'Nador',
            'nador' => 'Nador',
            'العيون' => 'Laayoune',
            'laayoune' => 'Laayoune',
            'الداخلة' => 'Dakhla',
            'dakhla' => 'Dakhla',
        ];

        $city = trim($city);

        // Try exact match first
        if (isset($cityMapping[$city])) {
            return $cityMapping[$city];
        }

        // Try lowercase exact match
        $cityLower = mb_strtolower($city);
        foreach ($cityMapping as $key => $value) {
            if (mb_strtolower($key) === $cityLower) {
                return $value;
            }
        }

        // Try partial match (city contains keyword)
        foreach ($partialMatches as $keyword => $mappedCity) {
            if (mb_stripos($city, $keyword) !== false) {
                Log::info('City partial match found', [
                    'original' => $city,
                    'keyword' => $keyword,
                    'mapped' => $mappedCity,
                ]);
                return $mappedCity;
            }
        }

        // Return original if no mapping found (maybe it's already in correct format)
        return $city;
    }

    /**
     * Create shipment from an Order model
     * 
     * @param Order $order
     * @param string|null $deliveryCity The city selected from BMDelivery's city list
     * @return array Response from BMDelivery API
     */
    public function createShipmentFromOrder(Order $order, ?string $deliveryCity = null): array
    {
        $order->load(['client', 'items.product']);

        // Prepare products and quantities
        $products = [];
        $quantities = [];
        
        foreach ($order->items as $item) {
            // Use product name from product relation, or fallback to product_name field
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

        Log::info('Using city for BMDelivery', [
            'provided_city' => $deliveryCity,
            'client_city' => $order->client->city ?? null,
            'final_city' => $city,
        ]);

        $fallbackFullname = 'Client ' . ($order->order_number ?? $order->id);
        $rawFullname = $order->client->name ?? null;

        $data = [
            'fullname' => $this->sanitizeFullname($rawFullname, $fallbackFullname),
            'phone' => $this->normalizeMoroccanPhone($order->client->phone ?? $order->phone ?? ''),
            'city' => $city,
            'address' => $this->normalizeAddress($order->shipping_address ?? $order->client->address ?? ''),
            'price' => (float) $order->total,
            'product' => $this->normalizeText(implode(',', $products)),
            'qty' => implode(',', $quantities),
            'note' => $this->normalizeText($order->notes ?? ''),
            'change' => 0,
            'openpackage' => 1,
            'from_stock' => 0,
            'internal_id' => $order->order_number,
        ];

        Log::info('BMDelivery createShipmentFromOrder payload', [
            'order_id' => $order->id,
            'payload' => $data,
        ]);

        return $this->createShipment($data);
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
            $response = $this->request()->get("{$this->baseUrl}/client/colis/list-colis-ramassage/");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments for pickup: ' . $response->body());
            }

            return $response->json();
        } catch (Throwable $e) {
            $this->logRequestFailure('BMDelivery listShipmentsForPickup error', $e, [
                'endpoint' => "{$this->baseUrl}/client/colis/list-colis-ramassage/",
            ]);
            throw $e;
        }
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
            $response = $this->request()->get("{$this->baseUrl}/colis/list-coli");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments: ' . $response->body());
            }

            return $response->json();
        } catch (Throwable $e) {
            $this->logRequestFailure('BMDelivery listShipments error', $e, [
                'endpoint' => "{$this->baseUrl}/colis/list-coli",
            ]);
            throw $e;
        }
    }

    /**
     * Track a shipment by internal code
     * 
     * @param string $code Internal tracking code
     * @return array Tracking information
     * @throws \Exception
     */
    public function trackShipment(string $code): array
    {
        $this->validateApiToken();

        try {
            $response = $this->request()->get("{$this->baseUrl}/client/colis/track/{$code}");

            if (!$response->successful()) {
                throw new \Exception('Failed to track shipment: ' . $response->body());
            }

            return $response->json();
        } catch (Throwable $e) {
            $this->logRequestFailure('BMDelivery trackShipment error', $e, [
                'code' => $code,
                'endpoint' => "{$this->baseUrl}/client/colis/track/{$code}",
            ]);
            throw $e;
        }
    }

    /**
     * Get list of available cities
     * 
     * @return array List of cities
     * @throws \Exception
     */
    public function listCities(): array
    {
        $this->validateApiToken();

        try {
            $response = $this->request()->get("{$this->baseUrl}/client/villes");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch cities: ' . $response->body());
            }

            return $response->json();
        } catch (Throwable $e) {
            $this->logRequestFailure('BMDelivery listCities error', $e, [
                'endpoint' => "{$this->baseUrl}/client/villes",
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
            throw new \Exception('BMDelivery API token is not set');
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
            $this->listCities();
            return true;
        } catch (\Exception $e) {
            Log::error('BMDelivery connection test failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get detailed shipment information by tracking code
     * 
     * @param string $trackingCode Tracking code from BMDelivery
     * @return array Shipment details including current status
     * @throws \Exception
     */
    public function getShipmentDetails(string $trackingCode): array
    {
        $this->validateApiToken();

        $endpoints = [
            // Try different endpoint variations
            "{$this->baseUrl}/client/coli/track/{$trackingCode}",
            "{$this->baseUrl}/client/colis/track/{$trackingCode}",
            "{$this->baseUrl}/client/colis/details/{$trackingCode}",
            "{$this->baseUrl}/client/post/colis/track/{$trackingCode}",
            "{$this->baseUrl}/client/post/coli/track/{$trackingCode}",
        ];

        $lastException = null;
        $lastResponse = null;

        // Try GET requests first
        foreach ($endpoints as $endpoint) {
            try {
                $response = $this->request()->get($endpoint);
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                $lastResponse = $response;
            } catch (Throwable $e) {
                $lastException = $e;
                continue;
            }
        }

        // Try POST requests with tracking code as parameter
        $postEndpoints = [
            "{$this->baseUrl}/client/coli/track",
            "{$this->baseUrl}/client/colis/track",
            "{$this->baseUrl}/client/colis/details",
            "{$this->baseUrl}/client/post/colis/track",
            "{$this->baseUrl}/client/post/coli/track",
        ];

        foreach ($postEndpoints as $endpoint) {
            try {
                $response = $this->request()
                    ->asForm()
                    ->post($endpoint, ['code' => $trackingCode]);
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                $lastResponse = $response;
            } catch (Throwable $e) {
                $lastException = $e;
                continue;
            }
        }

        // If we get here, all endpoints failed
        if ($lastException) {
            throw $lastException;
        }

        if ($lastResponse) {
            throw new \Exception('Failed to fetch shipment details: ' . $lastResponse->body());
        }

        throw new \Exception('Could not connect to BMDelivery API to fetch shipment details');
    }

    private function request(): PendingRequest
    {
        return Http::withHeaders([
            'Accept' => 'application/json',
            'Api-Token' => $this->apiToken,
        ])
            ->timeout((int) config('services.bmdelivery.timeout', 20))
            ->connectTimeout((int) config('services.bmdelivery.connect_timeout', 10))
            ->retry(
                (int) config('services.bmdelivery.retry_times', 2),
                (int) config('services.bmdelivery.retry_sleep_ms', 400)
            )
            ->withOptions($this->buildRequestOptions());
    }

    private function buildRequestOptions(): array
    {
        $options = [
            'allow_redirects' => false,
        ];

        if (config('services.bmdelivery.force_http1', true)) {
            $options['version'] = 1.1;
        }

        $curlOptions = [];

        if (
            config('services.bmdelivery.force_http1', true)
            && defined('CURLOPT_HTTP_VERSION')
            && defined('CURL_HTTP_VERSION_1_1')
        ) {
            $curlOptions[CURLOPT_HTTP_VERSION] = CURL_HTTP_VERSION_1_1;
        }

        if (
            config('services.bmdelivery.force_tls12', true)
            && defined('CURLOPT_SSLVERSION')
            && defined('CURL_SSLVERSION_TLSv1_2')
        ) {
            $curlOptions[CURLOPT_SSLVERSION] = CURL_SSLVERSION_TLSv1_2;
        }

        if (!empty($curlOptions)) {
            $options['curl'] = $curlOptions;
        }

        return $options;
    }

    private function logRequestFailure(string $message, Throwable $e, array $context = []): void
    {
        $loggerMethod = $this->isTransportException($e) ? 'warning' : 'error';

        Log::{$loggerMethod}($message, array_merge($context, [
            'error' => $e->getMessage(),
            'exception_class' => get_class($e),
            'transport_diagnostics' => $this->transportDiagnostics(),
        ]));
    }

    private function isTransportException(Throwable $e): bool
    {
        return $e instanceof ConnectionException
            || str_contains($e->getMessage(), 'cURL error')
            || str_contains(strtolower($e->getMessage()), 'tls')
            || str_contains(strtolower($e->getMessage()), 'ssl');
    }

    private function transportDiagnostics(): array
    {
        $curlVersion = function_exists('curl_version') ? curl_version() : null;

        return [
            'app_env' => config('app.env'),
            'php_version' => PHP_VERSION,
            'curl_version' => $curlVersion['version'] ?? null,
            'curl_ssl_version' => $curlVersion['ssl_version'] ?? null,
            'openssl_version' => defined('OPENSSL_VERSION_TEXT') ? OPENSSL_VERSION_TEXT : null,
            'base_url' => $this->baseUrl,
            'force_http1' => (bool) config('services.bmdelivery.force_http1', true),
            'force_tls12' => (bool) config('services.bmdelivery.force_tls12', true),
        ];
    }

    /**
     * Sync order status from BMDelivery
     * Updates the order with the latest status from BMDelivery API
     * 
     * @param Order $order Order to sync
     * @return array Status update result
     * @throws \Exception
     */
    public function syncOrderStatus(Order $order): array
    {
        if (!$order->delivery_tracking_code) {
            throw new \Exception('Order does not have a tracking code');
        }

        // Check for invalid tracking codes (BMDelivery error responses)
        $trackingCode = strtolower($order->delivery_tracking_code);
        if ($trackingCode === 'ko' || $trackingCode === 'ok') {
            throw new \Exception('Invalid tracking code: Order was not successfully sent to BMDelivery');
        }

        try {
            $shipmentDetails = $this->getShipmentDetails($order->delivery_tracking_code);

            if (isset($shipmentDetails['data']) && is_array($shipmentDetails['data']) && empty($shipmentDetails['data'])) {
                Log::warning('BMDelivery returned empty data array - tracking code not found', [
                    'tracking_code' => $order->delivery_tracking_code,
                    'response' => $shipmentDetails,
                ]);
                throw new \Exception('Tracking code not found in BMDelivery system. The order may not have been successfully sent to BMDelivery.');
            }

            $newStatus = $this->extractLatestStatus($shipmentDetails);

            if (!$newStatus) {
                Log::warning('Could not extract status from BMDelivery response', [
                    'tracking_code' => $order->delivery_tracking_code,
                    'response' => $shipmentDetails,
                ]);
                throw new \Exception('Status not found in BMDelivery response');
            }

            $oldDeliveryStatus = $order->delivery_status;
            $hasChanged = $oldDeliveryStatus !== $newStatus;

            // Update delivery status
            $order->update([
                'delivery_status' => $newStatus,
            ]);

            Log::info('Order delivery status synced from BMDelivery', [
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
                'shipment_details' => $shipmentDetails,
            ];

        } catch (\Exception $e) {
            Log::error('Failed to sync order status from BMDelivery', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'tracking_code' => $order->delivery_tracking_code,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function extractTrackingCode(array $payload): ?string
    {
        $directCode = $payload['code']
            ?? $payload['tracking_code']
            ?? $payload['code_shippment']
            ?? $payload['code_shipment']
            ?? null;

        if ($directCode) {
            return $directCode;
        }

        $nested = $payload['data'] ?? null;

        if (is_array($nested) && $this->isAssoc($nested)) {
            return $this->extractTrackingCode($nested);
        }

        return null;
    }

    public function extractLatestStatus(array $payload): ?string
    {
        if (isset($payload['data']) && is_array($payload['data'])) {
            $data = $payload['data'];

            if ($this->isAssoc($data)) {
                return $this->extractLatestStatus($data);
            }

            if (!empty($data)) {
                $events = $data;

                usort($events, function ($a, $b) {
                    return ($b['Date_Evenement'] ?? 0) <=> ($a['Date_Evenement'] ?? 0);
                });

                $latestEvent = $events[0];
                $status = $latestEvent['status']
                    ?? $latestEvent['Etat']
                    ?? $latestEvent['etat']
                    ?? null;

                Log::info('Extracted status from BMDelivery data array', [
                    'latest_event' => $latestEvent,
                    'status' => $status,
                    'status_lowercase' => $status ? mb_strtolower($status) : null,
                ]);

                return $status;
            }
        }

        return $payload['status']
            ?? $payload['Etat']
            ?? $payload['etat']
            ?? null;
    }

    private function buildShipmentPayload(array $data): array
    {
        return array_filter([
            'fullname' => $this->sanitizeFullname($data['fullname'] ?? '', 'Customer'),
            'phone' => $this->normalizeMoroccanPhone($data['phone'] ?? ''),
            'city' => $this->normalizeText($data['city'] ?? ''),
            'address' => $this->normalizeAddress($data['address'] ?? ''),
            'price' => $data['price'],
            'product' => $this->normalizeText($data['product'] ?? ''),
            'qty' => $data['qty'],
            'note' => $this->normalizeText($data['note'] ?? ''),
            'change' => $data['change'] ?? 0,
            'coli_exchange' => $data['coli_exchange'] ?? null,
            'openpackage' => $data['openpackage'] ?? 0,
            'from_stock' => $data['from_stock'] ?? 0,
            'internal_id' => $data['internal_id'] ?? null,
        ], fn ($value) => $value !== null);
    }

    private function normalizeMoroccanPhone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (empty($digits)) {
            return '';
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '212')) {
            $digits = '0' . substr($digits, 3);
        }

        if (!str_starts_with($digits, '0')) {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    private function sanitizeFullname(?string $fullname, string $fallback): string
    {
        $normalized = $this->normalizeText($fullname ?? '');

        if (mb_strlen($normalized) < 3) {
            return $this->normalizeText($fallback);
        }

        return $normalized;
    }

    private function normalizeAddress(?string $address): string
    {
        $normalized = $this->normalizeText($address ?? '');

        return $normalized !== '' ? $normalized : '-';
    }

    private function normalizeText(string $value): string
    {
        return trim(preg_replace('/\s+/', ' ', $value) ?? '');
    }

    private function isAssoc(array $value): bool
    {
        if ($value === []) {
            return false;
        }

        return array_keys($value) !== range(0, count($value) - 1);
    }
}
