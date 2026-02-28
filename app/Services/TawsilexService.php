<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TawsilexService
{
    private string $baseUrl = 'https://tawsilex.com/api';
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
            'try_product' => $data['try_product'] ?? 0,
            'from_stock' => $data['from_stock'] ?? 0,
            'internal_id' => $data['internal_id'] ?? null,
        ];

        // Remove null values
        $payload = array_filter($payload, fn($value) => $value !== null);

        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->post("{$this->baseUrl}/client/post/colis/add-colis/", $payload);

            if (!$response->successful()) {
                throw new \Exception('Failed to create shipment: ' . $response->body());
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Tawsilex createShipment error', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
            throw $e;
        }
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

        Log::info('Using city for Tawsilex', [
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
            'try_product' => 0,
            'from_stock' => 0,
            'internal_id' => $order->order_number,
        ];

        return $this->createShipment($data);
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
            ])->get("{$this->baseUrl}/client/colis/list-colis");

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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/colis/list-colis-ramassage/");

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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/coli/track/{$code}");

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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->post("{$this->baseUrl}/post/colis/edit/", $payload);

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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/list-status");

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
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Api-Token' => $this->apiToken,
            ])->get("{$this->baseUrl}/client/stock/list");

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
}
