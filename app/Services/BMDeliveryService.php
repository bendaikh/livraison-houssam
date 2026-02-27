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
            // Arabic names
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

        // Try exact match first
        if (isset($cityMapping[$city])) {
            return $cityMapping[$city];
        }

        // Try lowercase match
        $cityLower = mb_strtolower(trim($city));
        foreach ($cityMapping as $key => $value) {
            if (mb_strtolower($key) === $cityLower) {
                return $value;
            }
        }

        // Return original if no mapping found (maybe it's already in correct format)
        return $city;
    }

    /**
     * Create shipment from an Order model
     * 
     * @param Order $order
     * @return array Response from BMDelivery API
     */
    public function createShipmentFromOrder(Order $order): array
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

        // Get city and map to BMDelivery format
        $originalCity = $order->client->city ?? $order->city ?? 'Casablanca';
        $mappedCity = $this->mapCityName($originalCity);

        Log::info('City mapping', [
            'original' => $originalCity,
            'mapped' => $mappedCity,
        ]);

        $data = [
            'fullname' => $order->client->name ?? 'Customer',
            'phone' => $order->client->phone ?? '',
            'city' => $mappedCity,
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
}
