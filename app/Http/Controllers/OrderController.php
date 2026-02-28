<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function index(Request $request)
    {
        $query = Order::with(['client', 'vendor', 'deliveryAgent', 'deliveryPerson', 'confirmationAgent', 'deliveryIntegration', 'items.product']);

        // If user is a vendor, only show their orders
        $user = $request->user();
        if ($user && $user->role && $user->role->slug === 'vendor') {
            $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
            if ($vendor) {
                $query->where('vendor_id', $vendor->id);
            }
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('order_number', 'like', '%' . $request->search . '%')
                  ->orWhereHas('client', function ($q) use ($request) {
                      $q->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('phone', 'like', '%' . $request->search . '%');
                  });
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        if ($request->has('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        if ($request->has('delivery_agent_id')) {
            $query->where('delivery_agent_id', $request->delivery_agent_id);
        }

        if ($request->has('confirmation_agent_id')) {
            $query->where('confirmation_agent_id', $request->confirmation_agent_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $orders = $query->latest()->paginate($perPage);

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'required|string|max:20',
            'vendor_id' => 'nullable|exists:vendors,id',
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'source' => 'string|in:manual,shopify,delivery_company,marketplace',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);

        // If client_id is not provided, create or find client by name and phone
        if (!isset($validated['client_id'])) {
            $client = \App\Models\Client::firstOrCreate(
                [
                    'phone' => $validated['client_phone'],
                    'name' => $validated['client_name'],
                ],
                [
                    'name' => $validated['client_name'],
                    'phone' => $validated['client_phone'],
                    'address' => $validated['shipping_address'] ?? null,
                    'is_active' => true,
                ]
            );
            $validated['client_id'] = $client->id;
        }

        $order = $this->orderService->createOrder($validated);

        return response()->json($order, 201);
    }

    public function show(Order $order)
    {
        return response()->json($order->load([
            'client',
            'vendor',
            'deliveryAgent',
            'deliveryPerson',
            'confirmationAgent',
            'deliveryIntegration',
            'items.product',
            'history.user'
        ]));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'required|string|max:20',
            'vendor_id' => 'nullable|exists:vendors,id',
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:pending,confirmed,shipped,delivered,cancelled',
            'source' => 'string|in:manual,shopify,delivery_company,marketplace',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);

        // If client_id is not provided, create or find client by name and phone
        if (!isset($validated['client_id']) && isset($validated['client_name'])) {
            $client = \App\Models\Client::firstOrCreate(
                [
                    'phone' => $validated['client_phone'],
                    'name' => $validated['client_name'],
                ],
                [
                    'name' => $validated['client_name'],
                    'phone' => $validated['client_phone'],
                    'address' => $validated['shipping_address'] ?? null,
                    'is_active' => true,
                ]
            );
            $validated['client_id'] = $client->id;
        }

        // Check if status is being changed
        $oldStatus = $order->status;
        $newStatus = $validated['status'] ?? $oldStatus;
        
        // Update the order first
        $order = $this->orderService->updateOrder($order->id, $validated);
        
        // If status changed, trigger status update logic (stock deduction, notifications, etc.)
        if ($oldStatus !== $newStatus) {
            $order = $this->orderService->updateOrderStatus(
                $order->id,
                $newStatus,
                "Order status changed from {$oldStatus} to {$newStatus}"
            );
        }

        return response()->json($order);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,shipped,delivered,cancelled',
            'note' => 'nullable|string',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_city' => 'nullable|string', // The city selected from the delivery company's list
        ]);

        $order = $this->orderService->updateOrderStatus(
            $order->id,
            $validated['status'],
            $validated['note'] ?? null,
            $validated['delivery_integration_id'] ?? null,
            $validated['delivery_city'] ?? null
        );

        $response = $order->toArray();
        
        // Include delivery error if present
        if (isset($order->delivery_error)) {
            $response['delivery_error'] = $order->delivery_error;
        }

        return response()->json($response);
    }

    public function assignDeliveryAgent(Request $request, Order $order)
    {
        $validated = $request->validate([
            'delivery_agent_id' => 'required|exists:users,id',
        ]);

        $order = $this->orderService->assignDeliveryAgent($order->id, $validated['delivery_agent_id']);

        return response()->json($order->load(['deliveryAgent']));
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return response()->json(['message' => 'Order deleted successfully']);
    }

    public function getAvailableDeliveryCompanies()
    {
        $integrations = \App\Models\ApiIntegration::where('type', 'delivery')
            ->where('is_active', true)
            ->get(['id', 'name', 'provider']);

        return response()->json($integrations);
    }

    /**
     * Sync order status from delivery company
     */
    public function syncDeliveryStatus(Order $order)
    {
        try {
            if (!$order->delivery_integration_id) {
                return response()->json([
                    'error' => 'Order is not assigned to any delivery company'
                ], 400);
            }

            if (!$order->delivery_tracking_code) {
                return response()->json([
                    'error' => 'Order does not have a tracking code'
                ], 400);
            }

            $integration = $order->deliveryIntegration;
            
            if (!$integration->is_active) {
                return response()->json([
                    'error' => 'Delivery integration is not active'
                ], 400);
            }

            $apiToken = $integration->credentials['api_token'] 
                ?? $integration->credentials['apiToken'] 
                ?? $integration->credentials['token'] 
                ?? null;
            
            if (!$apiToken) {
                return response()->json([
                    'error' => 'API token not configured for this integration'
                ], 400);
            }

            $result = null;

            // Sync based on provider
            if ($integration->provider === 'bmdelivery') {
                $bmService = new \App\Services\BMDeliveryService();
                $bmService->setApiToken($apiToken);
                $result = $bmService->syncOrderStatus($order);
                
            } elseif ($integration->provider === 'tawsilex') {
                $tawsilexService = new \App\Services\TawsilexService();
                $tawsilexService->setApiToken($apiToken);
                
                if (method_exists($tawsilexService, 'syncOrderStatus')) {
                    $result = $tawsilexService->syncOrderStatus($order);
                } else {
                    return response()->json([
                        'error' => 'Status sync not implemented for Tawsilex'
                    ], 501);
                }
            } else {
                return response()->json([
                    'error' => 'Unsupported delivery provider: ' . $integration->provider
                ], 400);
            }

            // Update order status based on delivery status if it changed
            if ($result['status_changed']) {
                $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status']);
                
                if ($orderStatus && $orderStatus !== $order->status) {
                    $this->orderService->updateOrderStatus(
                        $order->id,
                        $orderStatus,
                        "Status synced from {$integration->name}: {$result['new_delivery_status']}"
                    );
                    $result['order_status_updated'] = true;
                    $result['new_order_status'] = $orderStatus;
                }
            }

            // Reload order to get fresh data
            $order->refresh();

            return response()->json([
                'message' => 'Order status synced successfully',
                'result' => $result,
                'order' => $order->load(['client', 'deliveryIntegration', 'history']),
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to sync delivery status', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to sync status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Map delivery company status to internal order status
     * (Moved here to be accessible from syncDeliveryStatus)
     */
    private function mapDeliveryStatusToOrderStatus(?string $deliveryStatus): ?string
    {
        if (!$deliveryStatus) {
            return null;
        }

        $statusMap = [
            'pending' => 'pending',
            'confirmed' => 'confirmed',
            'picked_up' => 'shipped',
            'in_transit' => 'shipped',
            'out_for_delivery' => 'shipped',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            'returned' => 'cancelled',
            'failed' => 'cancelled',
            
            // BMDelivery French statuses (from actual API response)
            'en attente de ramassage' => 'confirmed',
            'ramassé' => 'confirmed',
            'ramasse' => 'confirmed',
            'prêt pour expédition' => 'confirmed',
            'pret pour expedition' => 'confirmed',
            'expédié' => 'shipped',
            'expedie' => 'shipped',
            'en cours de livraison' => 'shipped',
            'en livraison' => 'shipped',
            'livré' => 'delivered',
            'livre' => 'delivered',
            'retourné' => 'cancelled',
            'retourne' => 'cancelled',
            'annulé' => 'cancelled',
            'annule' => 'cancelled',
            
            // BMDelivery statuses (normalized)
            'ramassage' => 'confirmed',
            'en attente' => 'confirmed',
            'en_attente' => 'confirmed',
            'en cours' => 'shipped',
            'en_cours' => 'shipped',
            'en route' => 'shipped',
            'en_route' => 'shipped',
            'execute' => 'delivered',
            'exécuté' => 'delivered',
            'retour' => 'cancelled',
            'demande de retour' => 'cancelled',
            'demande_de_retour' => 'cancelled',
            'interesse' => 'confirmed',
            'intéressé' => 'confirmed',
            
            'preparation' => 'confirmed',
            'expedie' => 'shipped',
            'livraison' => 'delivered',
        ];

        return $statusMap[strtolower($deliveryStatus)] ?? null;
    }

    /**
     * Get available cities for a specific delivery integration
     */
    public function getDeliveryCities(Request $request, $integrationId)
    {
        $integration = \App\Models\ApiIntegration::findOrFail($integrationId);
        
        if (!$integration->is_active) {
            return response()->json(['error' => 'Integration is not active'], 400);
        }

        try {
            $cities = [];
            
            if ($integration->provider === 'bmdelivery') {
                $bmService = new \App\Services\BMDeliveryService();
                $apiToken = $integration->credentials['api_token'] 
                    ?? $integration->credentials['apiToken'] 
                    ?? $integration->credentials['token'] 
                    ?? null;
                
                if (!$apiToken) {
                    return response()->json(['error' => 'API token not configured'], 400);
                }
                
                $bmService->setApiToken($apiToken);
                $cities = $bmService->listCities();
                
            } elseif ($integration->provider === 'tawsilex') {
                $tawsilexService = new \App\Services\TawsilexService();
                $apiToken = $integration->credentials['api_token'] 
                    ?? $integration->credentials['apiToken'] 
                    ?? $integration->credentials['token'] 
                    ?? null;
                
                if (!$apiToken) {
                    return response()->json(['error' => 'API token not configured'], 400);
                }
                
                $tawsilexService->setApiToken($apiToken);
                // Assuming Tawsilex has a similar method
                if (method_exists($tawsilexService, 'listCities')) {
                    $cities = $tawsilexService->listCities();
                } else {
                    // Fallback to a predefined list if Tawsilex doesn't have API endpoint
                    $cities = $this->getTawsilexDefaultCities();
                }
            }
            
            return response()->json($cities);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch delivery cities', [
                'integration_id' => $integrationId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json(['error' => 'Failed to fetch cities: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fallback cities for Tawsilex if they don't have an API endpoint
     */
    private function getTawsilexDefaultCities(): array
    {
        return [
            ['name' => 'Casablanca'],
            ['name' => 'Rabat'],
            ['name' => 'Tanger'],
            ['name' => 'Fes'],
            ['name' => 'Marrakech'],
            ['name' => 'Agadir'],
            ['name' => 'Meknes'],
            ['name' => 'Oujda'],
            ['name' => 'Kenitra'],
            ['name' => 'Tetouan'],
            ['name' => 'Safi'],
            ['name' => 'Temara'],
            ['name' => 'Sale'],
            ['name' => 'Mohammedia'],
            ['name' => 'Khouribga'],
            ['name' => 'El Jadida'],
            ['name' => 'Beni Mellal'],
            ['name' => 'Nador'],
            ['name' => 'Taza'],
            ['name' => 'Settat'],
        ];
    }
}
