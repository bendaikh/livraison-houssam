<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BMDeliveryService
{
    private string $baseUrl = 'https://bmdelivery.ma/api';
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
     * Create a new shipment/colis in BMDelivery
     * 
     * @param array $data Shipment data
     * @return array Response from BMDelivery API
     * @throws \Exception
     */
    public function createShipment(array $data): array
    {
        $this->validateApiToken();

        $payload = [
            'fullname' => $data['fullname'],
            'phone' => $data['phone'],
            'city' => $data['city'],
            'address' => $data['address'] ?? '',
            'price' => $data['price'],
            'product' => $data['product'],
            'qty' => $data['qty'],
            'note' => $data['note'] ?? '',
            'change' => $data['change'] ?? 0,
            'coli_exchange' => $data['coli_exchange'] ?? null,
            'openpackage' => $data['openpackage'] ?? 0,
            'from_stock' => $data['from_stock'] ?? 0,
            'internal_id' => $data['internal_id'] ?? null,
        ];

        // Remove null values
        $payload = array_filter($payload, fn($value) => $value !== null);

        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->post("{$this->baseUrl}/client/post/colis/add-colis", $payload);

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
        } catch (\Exception $e) {
            Log::error('BMDelivery createShipment error', [
                'error' => $e->getMessage(),
                'payload' => $payload,
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

        $data = [
            'fullname' => $order->client->name ?? 'Customer',
            'phone' => $order->client->phone ?? '',
            'city' => $city,
            'address' => $order->shipping_address ?? $order->client->address ?? '',
            'price' => (float) $order->total,
            'product' => implode(',', $products),
            'qty' => implode(',', $quantities),
            'note' => $order->notes ?? '',
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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/colis/list-colis-ramassage/");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments for pickup: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('BMDelivery listShipmentsForPickup error', [
                'error' => $e->getMessage(),
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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/colis/list-coli");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch shipments: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('BMDelivery listShipments error', [
                'error' => $e->getMessage(),
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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/colis/track/{$code}");

            if (!$response->successful()) {
                throw new \Exception('Failed to track shipment: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('BMDelivery trackShipment error', [
                'error' => $e->getMessage(),
                'code' => $code,
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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/villes");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch cities: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('BMDelivery listCities error', [
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

        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/colis/details/{$trackingCode}");

            if (!$response->successful()) {
                // Try alternative endpoint
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Api-Token' => $this->apiToken,
                ])->get("{$this->baseUrl}/client/colis/track/{$trackingCode}");

                if (!$response->successful()) {
                    throw new \Exception('Failed to fetch shipment details: ' . $response->body());
                }
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('BMDelivery getShipmentDetails error', [
                'error' => $e->getMessage(),
                'tracking_code' => $trackingCode,
            ]);
            throw $e;
        }
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
        if (strtolower($order->delivery_tracking_code) === 'ko') {
            throw new \Exception('Invalid tracking code: Order was not successfully sent to BMDelivery');
        }

        try {
            $shipmentDetails = $this->getShipmentDetails($order->delivery_tracking_code);
            
            $newStatus = null;
            
            // BMDelivery returns status history in data array, get the most recent status
            if (isset($shipmentDetails['data']) && is_array($shipmentDetails['data']) && !empty($shipmentDetails['data'])) {
                // The first item in the array is the most recent status
                $latestEvent = $shipmentDetails['data'][0];
                $newStatus = $latestEvent['status'] ?? null;
                
                Log::info('Extracted status from BMDelivery data array', [
                    'tracking_code' => $order->delivery_tracking_code,
                    'latest_event' => $latestEvent,
                    'status' => $newStatus,
                ]);
            } else {
                // Check if data array is empty (no tracking info available)
                if (isset($shipmentDetails['data']) && empty($shipmentDetails['data'])) {
                    Log::warning('BMDelivery returned empty data array - tracking code not found', [
                        'tracking_code' => $order->delivery_tracking_code,
                        'response' => $shipmentDetails,
                    ]);
                    throw new \Exception('Tracking code not found in BMDelivery system. The order may not have been successfully sent to BMDelivery.');
                }
                
                // Fallback: try other possible keys
                $newStatus = $shipmentDetails['status'] 
                    ?? $shipmentDetails['etat'] 
                    ?? $shipmentDetails['data']['status'] 
                    ?? $shipmentDetails['data']['etat']
                    ?? null;
            }

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
}
