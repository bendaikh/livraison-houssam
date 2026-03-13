<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Vendor;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
            $vendor = $this->getAuthenticatedVendor($request);
            if ($vendor) {
                $query->where('vendor_id', $vendor->id);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('order_number', 'like', '%' . $request->search . '%')
                  ->orWhere('external_order_id', 'like', '%' . $request->search . '%')
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
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'delivery_city' => 'nullable|string|max:255',
            'source' => 'string|in:manual,shopify,google_sheet,delivery_company,marketplace',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_included_in_price' => 'nullable|boolean',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);
        $validated = $this->applyAuthenticatedVendor($request, $validated);
        $validated['shipping_included_in_price'] = $this->resolveShippingIncludedInPrice($request, $validated);

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

        // If created directly as confirmed with a delivery company, push to delivery provider
        if (
            ($validated['status'] ?? 'pending') === 'confirmed' &&
            !empty($validated['delivery_integration_id'])
        ) {
            $order = $this->orderService->updateOrderStatus(
                $order->id,
                'confirmed',
                'Order created and confirmed',
                $validated['delivery_integration_id'],
                $validated['delivery_city'] ?? $validated['city'] ?? null
            );
        }

        return response()->json($order, 201);
    }

    public function show(Order $order)
    {
        $this->authorizeVendorOrderAccess(request(), $order);

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
        $this->authorizeVendorOrderAccess($request, $order);

        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'required|string|max:20',
            'vendor_id' => 'nullable|exists:vendors,id',
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'delivery_city' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,confirmed,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,return_requested',
            'source' => 'string|in:manual,shopify,google_sheet,delivery_company,marketplace',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_included_in_price' => 'nullable|boolean',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);
        $validated = $this->applyAuthenticatedVendor($request, $validated);
        $validated['shipping_included_in_price'] = $this->resolveShippingIncludedInPrice($request, $validated, $order);

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
        
        // Prevent changing confirmation agent once set
        if (
            $order->confirmation_agent_id &&
            $request->filled('confirmation_agent_id') &&
            $request->confirmation_agent_id != $order->confirmation_agent_id
        ) {
            return response()->json([
                'message' => 'Confirmation agent cannot be changed after it has been set.'
            ], 422);
        }
        
        // Update the order first
        $order = $this->orderService->updateOrder($order->id, $validated);
        
        // If status changed, trigger status update logic (stock deduction, notifications, delivery send, etc.)
        if ($oldStatus !== $newStatus) {
            $order = $this->orderService->updateOrderStatus(
                $order->id,
                $newStatus,
                "Order status changed from {$oldStatus} to {$newStatus}",
                $validated['delivery_integration_id'] ?? $order->delivery_integration_id,
                $validated['delivery_city'] ?? $order->delivery_city ?? $order->city
            );
        }

        // Retry sending to delivery company if order is confirmed, has a delivery company, but no tracking code yet.
        if (
            ($validated['status'] ?? $order->status) === 'confirmed' &&
            ($validated['delivery_integration_id'] ?? $order->delivery_integration_id) &&
            empty($order->delivery_tracking_code)
        ) {
            $order = $this->orderService->updateOrderStatus(
                $order->id,
                'confirmed',
                $oldStatus === $newStatus
                    ? 'Order confirmed – retrying delivery send (no tracking code yet)'
                    : "Order status changed from {$oldStatus} to {$newStatus}",
                $validated['delivery_integration_id'] ?? $order->delivery_integration_id,
                $validated['delivery_city'] ?? $order->delivery_city ?? $order->city
            );
        }

        return response()->json($order);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $this->authorizeVendorOrderAccess($request, $order);

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,return_requested',
            'note' => 'nullable|string',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_city' => 'nullable|string', // The city selected from the delivery company's list
        ]);

        $deliveryIntegrationId = $validated['delivery_integration_id'] ?? $order->delivery_integration_id;
        $deliveryCity = $validated['delivery_city'] ?? $order->delivery_city ?? $order->city;

        $order = $this->orderService->updateOrderStatus(
            $order->id,
            $validated['status'],
            $validated['note'] ?? null,
            $deliveryIntegrationId,
            $deliveryCity
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
        $this->authorizeVendorOrderAccess($request, $order);

        $validated = $request->validate([
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_city' => 'required_with:delivery_integration_id|string|max:255',
        ]);

        $payload = [];
        if ($request->exists('delivery_agent_id')) {
            $payload['delivery_agent_id'] = $validated['delivery_agent_id'];
        }
        if ($request->exists('delivery_person_id')) {
            $payload['delivery_person_id'] = $validated['delivery_person_id'];
        }
        if ($request->exists('delivery_integration_id')) {
            $payload['delivery_integration_id'] = $validated['delivery_integration_id'];
        }
        if ($request->has('delivery_city')) {
            $payload['delivery_city'] = $validated['delivery_city'];
        }

        if (empty($payload)) {
            return response()->json(['message' => 'No assignment data provided'], 422);
        }

        $order = $this->orderService->assignDeliveryAgent($order->id, $payload);

        return response()->json($order->load(['deliveryAgent', 'deliveryPerson', 'deliveryIntegration']));
    }

    public function destroy(Order $order)
    {
        $this->authorizeVendorOrderAccess(request(), $order);

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
        $this->authorizeVendorOrderAccess(request(), $order);

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
                $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status'], $integration->provider);
                
                \Log::info('Attempting to map delivery status to order status', [
                    'delivery_status' => $result['new_delivery_status'],
                    'mapped_order_status' => $orderStatus,
                    'current_order_status' => $order->status,
                ]);
                
                if ($orderStatus && $orderStatus !== $order->status) {
                    $this->orderService->updateOrderStatus(
                        $order->id,
                        $orderStatus,
                        "Status synced from {$integration->name}: {$result['new_delivery_status']}"
                    );
                    $result['order_status_updated'] = true;
                    $result['new_order_status'] = $orderStatus;
                } else {
                    \Log::info('Order status not updated', [
                        'reason' => !$orderStatus ? 'No mapped status found' : 'Order status already matches',
                        'order_status' => $orderStatus,
                        'current_status' => $order->status,
                    ]);
                }
            } else {
                // Even if delivery status didn't change, check if order status needs updating
                $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status'], $integration->provider);
                
                \Log::info('Delivery status unchanged, checking if order status needs update', [
                    'delivery_status' => $result['new_delivery_status'],
                    'mapped_order_status' => $orderStatus,
                    'current_order_status' => $order->status,
                ]);
                
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
    private function mapDeliveryStatusToOrderStatus(?string $deliveryStatus, ?string $provider = null): ?string
    {
        if (!$deliveryStatus) {
            return null;
        }

        $normalizedStatus = strtolower(trim($deliveryStatus));
        $normalizedProvider = strtolower(trim((string) $provider));

        $statusMap = [
            'pending' => 'pending',
            'confirmed' => 'confirmed',
            'picked_up' => 'picked_up',
            'in_transit' => 'shipped',
            'out_for_delivery' => 'out_for_delivery',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            'returned' => 'returned',
            'failed' => 'cancelled',
            'refused' => 'refused',
            
            // BMDelivery French statuses (from actual API response)
            'en attente de ramassage' => 'confirmed',
            'en attente de rammage' => 'confirmed',
            'ramassé' => 'picked_up',
            'ramasse' => 'picked_up',
            'prêt pour expédition' => 'ready_for_shipping',
            'pret pour expedition' => 'ready_for_shipping',
            'expédié' => 'shipped',
            'expedie' => 'shipped',
            'en cours de livraison' => 'out_for_delivery',
            'en livraison' => 'out_for_delivery',
            'livré' => 'delivered',
            'livre' => 'delivered',
            'refusé' => 'refused',
            'refuse' => 'refused',
            'retourné' => 'returned',
            'retourne' => 'returned',
            'annulé' => 'cancelled',
            'annule' => 'cancelled',
            'demande de retour' => 'return_requested',
            'demande_de_retour' => 'return_requested',
            'injoignable' => 'cancelled',
            'injoignable client' => 'cancelled',
            'hors zone' => 'cancelled',
            'adresse incomplète' => 'cancelled',
            'adresse incomplete' => 'cancelled',
            'reporté' => 'confirmed',
            'reporte' => 'confirmed',
            'en cours de préparation' => 'ready_for_shipping',
            'en cours de preparation' => 'ready_for_shipping',
            
            // BMDelivery statuses (normalized)
            'ramassage' => 'picked_up',
            'en attente' => 'confirmed',
            'en_attente' => 'confirmed',
            'en cours' => 'shipped',
            'en_cours' => 'shipped',
            'en route' => 'out_for_delivery',
            'en_route' => 'out_for_delivery',
            'execute' => 'delivered',
            'exécuté' => 'delivered',
            'retour' => 'returned',
            'interesse' => 'confirmed',
            'intéressé' => 'confirmed',
            
            'preparation' => 'confirmed',
            'expedie' => 'shipped',
            'livraison' => 'out_for_delivery',
        ];

        if ($normalizedProvider === 'tawsilex') {
            $tawsilexStatusMap = [
                'sent' => 'shipped',
                'livree' => 'delivered',
                'livrée' => 'delivered',
                'livre' => 'delivered',
                'livré' => 'delivered',
            ];

            if (isset($tawsilexStatusMap[$normalizedStatus])) {
                return $tawsilexStatusMap[$normalizedStatus];
            }
        }

        return $statusMap[$normalizedStatus] ?? null;
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
                // Primary source: curated list provided by admin (from cITIES.xlsx).
                $cities = config('tawsilex_cities', []);

                // Fallback: BMDelivery cities if curated list is empty/unavailable.
                if (empty($cities)) {
                    $bmIntegration = \App\Models\ApiIntegration::where('provider', 'bmdelivery')
                        ->where('type', 'delivery')
                        ->where('is_active', true)
                        ->first();

                    if ($bmIntegration) {
                        $bmApiToken = $bmIntegration->credentials['api_token']
                            ?? $bmIntegration->credentials['apiToken']
                            ?? $bmIntegration->credentials['token']
                            ?? null;

                        if ($bmApiToken) {
                            $bmService = new \App\Services\BMDeliveryService();
                            $bmService->setApiToken($bmApiToken);
                            $cities = $bmService->listCities();
                        }
                    }
                }

                // Last fallback.
                if (empty($cities)) {
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

    private function getAuthenticatedVendor(Request $request): ?Vendor
    {
        $user = $request->user();

        if (!$user || !$user->role || $user->role->slug !== 'vendor') {
            return null;
        }

        return $user->vendor()->first();
    }

    private function applyAuthenticatedVendor(Request $request, array $validated): array
    {
        $user = $request->user();

        if (!$user || !$user->role || $user->role->slug !== 'vendor') {
            return $validated;
        }

        $vendor = $this->getAuthenticatedVendor($request);

        if (!$vendor) {
            throw ValidationException::withMessages([
                'vendor_id' => ['Authenticated seller does not have a vendor profile.'],
            ]);
        }

        $validated['vendor_id'] = $vendor->id;

        return $validated;
    }

    private function authorizeVendorOrderAccess(Request $request, Order $order): void
    {
        $user = $request->user();

        if (!$user || !$user->role || $user->role->slug !== 'vendor') {
            return;
        }

        $vendor = $this->getAuthenticatedVendor($request);

        if (!$vendor) {
            throw ValidationException::withMessages([
                'vendor_id' => ['Authenticated seller does not have a vendor profile.'],
            ]);
        }

        if ((int) $order->vendor_id !== (int) $vendor->id) {
            abort(403, 'You are not allowed to access this order.');
        }
    }

    private function resolveShippingIncludedInPrice(Request $request, array $validated, ?Order $order = null): bool
    {
        if (array_key_exists('shipping_included_in_price', $validated)) {
            return (bool) $validated['shipping_included_in_price'];
        }

        if ($order) {
            return (bool) $order->shipping_included_in_price;
        }

        $user = $request->user();
        $roleSlug = $user?->role?->slug;
        $source = $validated['source'] ?? 'manual';

        return in_array($roleSlug, ['admin', 'superadmin'], true)
            && in_array($source, ['manual', 'marketplace'], true);
    }
}
