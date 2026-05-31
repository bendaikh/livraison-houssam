<?php

namespace App\Http\Controllers;

use App\Models\BlacklistEntry;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Vendor;
use App\Support\MoroccanPhone;
use App\Support\OrderTotals;
use App\Services\DeliveryStatusMapper;
use App\Services\OrderService;
use App\Services\ShippingPriceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    private const ADMIN_DELIVERY_COMPANY_LOCKED_STATUSES = [
        'picked_up',
        'ready_for_shipping',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refused',
        'returned',
        'no_response',
        'return_requested',
    ];

    public function __construct(
        private OrderService $orderService,
        private ShippingPriceService $shippingPriceService,
        private DeliveryStatusMapper $deliveryStatusMapper,
    ) {}

    public function index(Request $request)
    {
        $query = Order::with(['client', 'vendor', 'deliveryAgent', 'deliveryPerson', 'confirmationAgent', 'deliveryIntegration', 'items.product']);

        $user = $request->user();

        if ($user && $user->isVendor()) {
            $vendor = $this->getAuthenticatedVendor($request);
            if ($vendor) {
                $query->where('vendor_id', $vendor->id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user && $user->isConfirmationAgent()) {
            $assignmentScope = $request->get('assignment_scope', 'my');

            if ($assignmentScope === 'available') {
                $query->whereNull('confirmation_agent_id')
                    ->where(function ($subQuery) {
                        $subQuery->whereNotIn('status', ['delivered', 'returned', 'no_response'])
                            ->orWhereNotNull('returned_to_confirmation_at');
                    });
            } else {
                $query->where('confirmation_agent_id', $user->id);
            }
        } elseif ($user && $user->isDeliveryPerson()) {
            $query->where('delivery_person_id', $user->id);
        }

        if ($request->get('callback_due') === 'today') {
            $query->whereDate('callback_date', '<=', Carbon::today())
                ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned', 'no_response']);
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

        $customSorted = false;

        if ($user && $user->isConfirmationAgent() && $request->get('assignment_scope', 'my') !== 'available') {
            $query->orderByRaw('COALESCE(returned_to_confirmation_at, confirmation_assigned_at, created_at) DESC');
            $customSorted = true;
        } elseif (
            $user
            && $user->isDeliveryPerson()
            && Schema::hasTable('delivery_person_billings')
            && Schema::hasTable('delivery_person_billing_order')
        ) {
            $query->withCount([
                'deliveryPersonBillings as paid_delivery_billings_count' => function ($billingQuery) {
                    $billingQuery->whereNotNull('delivery_person_billings.paid_at');
                },
            ]);

            $query->orderBy('paid_delivery_billings_count')->latest();
            $customSorted = true;
        }

        if (!$customSorted) {
            $query->latest();
        }

        $orders = $query->paginate($perPage);
        $orders->getCollection()->transform(function (Order $order) {
            $order->setAttribute('delivery_workflow_locked', $this->isDeliveryWorkflowLocked($order));
            $order->setAttribute('seller_name', $this->resolveSellerName($order));
            $this->attachOrderDisplayTotals($order);
            return $order;
        });
        $this->attachBlacklistMetadata($request, $orders->getCollection());

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        // Debug: Log incoming request data
        \Log::info('Order creation request received', [
            'all_data' => $request->all(),
            'has_client_name' => $request->has('client_name'),
            'has_client_phone' => $request->has('client_phone'),
            'has_source' => $request->has('source'),
            'has_items' => $request->has('items'),
            'source_value' => $request->input('source'),
            'auth_method' => $request->attributes->get('auth_method'),
            'user_id' => $request->user()?->id,
        ]);
        
        $this->normalizeLegacyItemProductKeys($request);

        if ($request->user()?->isDeliveryPerson()) {
            abort(403, 'Delivery people cannot create orders.');
        }

        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'required|string|max:20',
            'vendor_id' => 'nullable|exists:vendors,id',
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'callback_date' => 'nullable|date',
            'delivery_city' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,confirmed,reported,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,no_response,return_requested',
            'source' => 'string|in:manual,shopify,google_sheet,delivery_company,marketplace,whatsapp,custom_api,website',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_name' => 'nullable|string|max:255',
            'items.*.sku' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.is_upsell' => 'nullable|boolean',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_cost_source' => 'nullable|in:auto,manual',
            'shipping_included_in_price' => 'nullable|boolean',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);
        $normalizedClientPhone = MoroccanPhone::normalize($validated['client_phone'] ?? null);
        if ($normalizedClientPhone !== '') {
            $validated['client_phone'] = $normalizedClientPhone;
        }
        if (array_key_exists('whatsapp', $validated)) {
            $normalizedWhatsapp = MoroccanPhone::normalize($validated['whatsapp'] ?? null);
            $validated['whatsapp'] = $normalizedWhatsapp !== '' ? $normalizedWhatsapp : $validated['whatsapp'];
        }
        $validated = $this->applyAuthenticatedVendor($request, $validated);
        $validated = $this->applyIntegrationDefaults($request, $validated);
        $validated = $this->stripVendorRestrictedFields($request, $validated);
        if ($request->user()?->isVendor()) {
            $validated['status'] = 'pending';
        }
        if ($request->user()?->isConfirmationAgent()) {
            $validated['confirmation_agent_id'] = $request->user()->id;
        }
        $validated['created_by_user_id'] = $request->user()?->id;

        $orderSource = $validated['source'] ?? 'manual';
        $preferSkuResolution = in_array($orderSource, ['website', 'custom_api'], true);

        $validated['items'] = $this->enrichItemsFromOrderNotes(
            $validated['items'] ?? [],
            $validated['notes'] ?? null
        );
        $validated['items'] = $this->resolveProductsForItems(
            $validated['items'] ?? [],
            isset($validated['vendor_id']) ? (int) $validated['vendor_id'] : null,
            $preferSkuResolution
        );

        if (empty($validated['vendor_id'])) {
            $inferredVendorId = $this->inferVendorFromItems($validated['items'] ?? []);
            if ($inferredVendorId) {
                $validated['vendor_id'] = $inferredVendorId;
            }
        }
        
        $this->ensureProductsAllowedForSeller($validated['items'] ?? [], $validated['vendor_id'] ?? null);
        $validated['shipping_included_in_price'] = $this->resolveShippingIncludedInPrice($request, $validated);
        $this->ensureDeliveryAssignmentExistsForConfirmedStatus($validated);

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

        $this->attachShippingPricingMetadata($order, 'store');
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order, 201);
    }

    public function show(Order $order)
    {
        $this->authorizeOrderAccess(request(), $order);

        $order->setAttribute('delivery_workflow_locked', $this->isDeliveryWorkflowLocked($order));

        $order = $order->load([
            'client',
            'vendor',
            'deliveryAgent',
            'deliveryPerson',
            'confirmationAgent',
            'deliveryIntegration',
            'items.product',
            'history.user'
        ]);
        $this->attachShippingPricingMetadata($order, 'show');
        $this->attachBlacklistMetadata(request(), $order);
        $order->setAttribute('seller_name', $this->resolveSellerName($order));
        $this->attachOrderDisplayTotals($order);

        return response()->json($order);
    }

    public function update(Request $request, Order $order)
    {
        $this->normalizeLegacyItemProductKeys($request);

        $this->authorizeOrderAccess($request, $order);

        if ($request->user()?->isConfirmationAgent()) {
            if (!$this->canConfirmationAgentEditBaseItems($order, $request->user())) {
                abort(403, 'Confirmation agents must use the confirmation workflow endpoint.');
            }
        }

        if ($request->user()?->isDeliveryPerson()) {
            abort(403, 'Delivery people cannot edit orders directly.');
        }

        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'required_without:client_id|string|max:255',
            'client_phone' => 'required|string|max:20',
            'vendor_id' => 'nullable|exists:vendors,id',
            'delivery_agent_id' => 'nullable|exists:users,id',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'callback_date' => 'nullable|date',
            'delivery_city' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,confirmed,reported,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,no_response,return_requested',
            'source' => 'string|in:manual,shopify,google_sheet,delivery_company,marketplace,whatsapp,custom_api,website',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.is_upsell' => 'nullable|boolean',
            'shipping_cost' => 'nullable|numeric|min:0',
            'shipping_cost_source' => 'nullable|in:auto,manual',
            'shipping_included_in_price' => 'nullable|boolean',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'whatsapp' => 'nullable|string',
        ]);
        $normalizedClientPhone = MoroccanPhone::normalize($validated['client_phone'] ?? null);
        if ($normalizedClientPhone !== '') {
            $validated['client_phone'] = $normalizedClientPhone;
        }
        if (array_key_exists('whatsapp', $validated)) {
            $normalizedWhatsapp = MoroccanPhone::normalize($validated['whatsapp'] ?? null);
            $validated['whatsapp'] = $normalizedWhatsapp !== '' ? $normalizedWhatsapp : $validated['whatsapp'];
        }
        $validated = $this->applyAuthenticatedVendor($request, $validated);
        $validated = $this->stripVendorRestrictedFields($request, $validated);
        $this->ensureProductsAllowedForSeller($validated['items'] ?? [], $validated['vendor_id'] ?? $order->vendor_id);
        $validated['shipping_included_in_price'] = $this->resolveShippingIncludedInPrice($request, $validated, $order);
        $this->ensureDeliveryAssignmentExistsForConfirmedStatus($validated, $order);

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

        $this->ensureAdminCanManuallyUpdateStatus($request, $order, $newStatus);
        $this->ensureSellerCanManuallyUpdateStatus($request, $order, $newStatus);
        $this->ensureConfirmationAgentCanManuallyUpdateStatus($request, $order, $newStatus);
        
        // Prevent changing confirmation agent once set
        if (
            $order->confirmation_agent_id &&
            $request->filled('confirmation_agent_id') &&
            $request->confirmation_agent_id != $order->confirmation_agent_id &&
            !$request->user()?->isAdmin()
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

        $this->attachShippingPricingMetadata($order, 'update');
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $this->authorizeOrderAccess($request, $order);

        if ($request->user()?->isVendor()) {
            abort(403, 'Status is read-only for sellers.');
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,reported,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,no_response,return_requested',
            'note' => 'nullable|string',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_person_id' => 'nullable|exists:users,id',
            'delivery_city' => 'nullable|string', // The city selected from the delivery company's list
        ]);

        if ($request->user()?->isDeliveryPerson()) {
            abort(403, 'Delivery people must use the delivery workflow endpoint.');
        }

        $this->ensureConfirmationAgentCanManuallyUpdateStatus($request, $order, $validated['status']);
        $this->ensureAdminCanManuallyUpdateStatus($request, $order, $validated['status']);
        $this->ensureSellerCanManuallyUpdateStatus($request, $order, $validated['status']);

        $this->ensureDeliveryAssignmentExistsForConfirmedStatus($validated, $order);

        if (!$request->user()?->isVendor()) {
            $assignmentPayload = $this->extractAssignmentPayload($request, $validated);
            if (!empty($assignmentPayload)) {
                $order = $this->orderService->assignDeliveryAgent($order->id, $assignmentPayload);
            }
        }

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
        $response = $this->attachBlacklistMetadataToArray($request, $response, $order);

        return response()->json($response);
    }

    public function assignDeliveryAgent(Request $request, Order $order)
    {
        $this->authorizeOrderAccess($request, $order);

        if ($request->user()?->isDeliveryPerson()) {
            abort(403, 'Delivery people cannot assign orders.');
        }

        if ($request->user()?->isVendor()) {
            abort(403, 'Sellers cannot assign delivery agents.');
        }

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
        $order->load(['deliveryAgent', 'deliveryPerson', 'deliveryIntegration']);
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
    }

    public function destroy(Order $order)
    {
        $this->authorizeOrderAccess(request(), $order);

        if (request()->user()?->isConfirmationAgent()) {
            abort(403, 'Confirmation agents cannot delete orders.');
        }

        if (request()->user()?->isDeliveryPerson()) {
            abort(403, 'Delivery people cannot delete orders.');
        }

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
        $this->authorizeOrderAccess(request(), $order);

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
                $orderStatus = $this->deliveryStatusMapper->mapToOrderStatus($result['new_delivery_status'], $integration->provider);
                
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
                $orderStatus = $this->deliveryStatusMapper->mapToOrderStatus($result['new_delivery_status'], $integration->provider);
                
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
            $order->load(['client', 'deliveryIntegration', 'history']);
            $this->attachBlacklistMetadata(request(), $order);

            return response()->json([
                'message' => 'Order status synced successfully',
                'result' => $result,
                'order' => $order,
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
     * Get available cities for a specific delivery integration
     */
    public function getDeliveryCities(Request $request, $integrationId)
    {
        $integration = \App\Models\ApiIntegration::findOrFail($integrationId);
        
        if (!$integration->is_active) {
            return response()->json(['error' => 'Integration is not active'], 400);
        }

        \Log::info('Loading delivery cities for integration', [
            'integration_id' => $integration->id,
            'provider' => $integration->provider,
            'name' => $integration->name,
        ]);

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

                return $this->deliveryCitiesResponse(
                    $this->normalizeDeliveryCities($bmService->listCities()),
                    'provider'
                );
            }

            if ($integration->provider === 'tawsilex') {
                // Primary source: curated list provided by admin (from cITIES.xlsx).
                $cities = $this->normalizeDeliveryCities(config('tawsilex_cities', []));

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
                            $cities = $this->normalizeDeliveryCities($bmService->listCities());
                        }
                    }
                }

                // Last fallback.
                if (empty($cities)) {
                    $cities = $this->getTawsilexDefaultCities();
                }

                return $this->deliveryCitiesResponse($cities, empty($cities) ? 'default' : 'config');
            }

            return $this->deliveryCitiesResponse($cities, 'provider');
        } catch (\Throwable $e) {
            $fallbackCities = $this->getFallbackDeliveryCities();

            if (!empty($fallbackCities)) {
                $warning = 'Live BMDelivery city lookup is unavailable from this server right now. Showing the saved city list instead.';

                \Log::warning('Falling back to saved delivery cities', [
                    'integration_id' => $integrationId,
                    'provider' => $integration->provider,
                    'error' => $e->getMessage(),
                    'fallback_count' => count($fallbackCities),
                ]);

                return $this->deliveryCitiesResponse($fallbackCities, 'fallback', $warning);
            }

            \Log::error('Failed to fetch delivery cities', [
                'integration_id' => $integrationId,
                'provider' => $integration->provider,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json(['error' => 'Failed to fetch cities: ' . $e->getMessage()], 500);
        }
    }

    public function assignToMe(Request $request, Order $order)
    {
        if (!$request->user()?->isConfirmationAgent()) {
            abort(403, 'Only confirmation agents can assign orders to themselves.');
        }

        $this->authorizeOrderAccess($request, $order, true);

        $order = $this->orderService->assignConfirmationAgentToSelf($order->id, $request->user());
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
    }

    public function updateConfirmationWorkflow(Request $request, Order $order)
    {
        $this->normalizeLegacyItemProductKeys($request, ['items', 'upsell_items']);

        if (!$request->user()?->isConfirmationAgent()) {
            abort(403, 'Only confirmation agents can use this workflow.');
        }

        $this->authorizeOrderAccess($request, $order);

        $validated = $request->validate([
            'status' => 'nullable|in:pending,confirmed,reported,picked_up,ready_for_shipping,shipped,out_for_delivery,delivered,cancelled,refused,returned,no_response,return_requested',
            'callback_date' => 'nullable|date',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string',
            'discount' => 'nullable|numeric|min:0',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'delivery_person_id' => 'nullable|exists:users,id',
            'delivery_integration_id' => 'nullable|exists:api_integrations,id',
            'delivery_city' => 'nullable|string|max:255',
            'upsell_items' => 'nullable|array',
            'upsell_items.*.product_id' => 'required|exists:products,id',
            'upsell_items.*.quantity' => 'required|integer|min:1',
            'upsell_items.*.price' => 'required|numeric|min:0',
        ]);

        $this->ensureConfirmationAgentCanManuallyUpdateStatus($request, $order, $validated['status'] ?? null);
        $this->ensureConfirmationAgentCanEditBaseItems($request, $order, $validated);
        $this->ensureProductsAllowedForSeller($validated['items'] ?? [], $order->vendor_id);
        $this->ensureProductsAllowedForSeller($validated['upsell_items'] ?? [], $order->vendor_id, 'upsell_items');
        $this->ensureDeliveryAssignmentExistsForConfirmedStatus($validated, $order);

        $order = $this->orderService->updateConfirmationWorkflow($order->id, $request->user(), $validated);
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
    }

    public function updateConfirmationAssignment(Request $request, Order $order)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'confirmation_agent_id' => 'nullable|exists:users,id',
            'reset_to_pending' => 'nullable|boolean',
            'note' => 'nullable|string',
        ]);

        if (!empty($validated['confirmation_agent_id'])) {
            $agent = User::with('role')->findOrFail($validated['confirmation_agent_id']);

            if (!$agent->isConfirmationAgent()) {
                throw ValidationException::withMessages([
                    'confirmation_agent_id' => ['Selected user is not a confirmation agent.'],
                ]);
            }
        }

        $order = $this->orderService->updateConfirmationAssignment(
            $order->id,
            $validated['confirmation_agent_id'] ?? null,
            (bool) ($validated['reset_to_pending'] ?? false),
            $validated['note'] ?? null
        );
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
    }

    public function updateDeliveryWorkflow(Request $request, Order $order)
    {
        if (!$request->user()?->isDeliveryPerson()) {
            abort(403, 'Only delivery people can use this workflow.');
        }

        $this->authorizeOrderAccess($request, $order);
        $this->ensureDeliveryWorkflowUnlocked($order);

        $validated = $request->validate([
            'status' => 'nullable|in:delivered,refused,cancelled,no_response,returned',
            'delivery_status_note' => 'nullable|string',
            'callback_date' => 'nullable|date|after:today',
            'collected_amount' => 'nullable|numeric|min:0',
            'return_to_confirmation' => 'nullable|boolean',
            'return_status' => 'nullable|in:refused,cancelled,no_response,returned',
        ]);

        $returnToConfirmation = (bool) ($validated['return_to_confirmation'] ?? false);

        if (empty($validated['status']) && empty($validated['callback_date']) && !$returnToConfirmation) {
            throw ValidationException::withMessages([
                'status' => ['Provide a status or a callback date.'],
            ]);
        }

        if ($returnToConfirmation && empty(trim((string) ($validated['delivery_status_note'] ?? '')))) {
            throw ValidationException::withMessages([
                'delivery_status_note' => ['A reason is required when sending an order back to confirmation.'],
            ]);
        }

        if (!$returnToConfirmation && !empty($validated['status']) && in_array($validated['status'], ['refused', 'cancelled', 'no_response', 'returned'], true)) {
            if (empty(trim((string) ($validated['delivery_status_note'] ?? '')))) {
                throw ValidationException::withMessages([
                    'delivery_status_note' => ['A reason is required for this status.'],
                ]);
            }
        }

        if (($validated['status'] ?? null) === 'delivered' && !array_key_exists('collected_amount', $validated)) {
            throw ValidationException::withMessages([
                'collected_amount' => ['Collected amount is required for delivered orders.'],
            ]);
        }

        $order = $this->orderService->updateDeliveryWorkflow($order->id, $request->user(), $validated);
        $order->setAttribute('delivery_workflow_locked', $this->isDeliveryWorkflowLocked($order));
        $this->attachBlacklistMetadata($request, $order);

        return response()->json($order);
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

    private function normalizeDeliveryCities(array $cities): array
    {
        return collect($cities)
            ->map(function ($city) {
                if (is_string($city)) {
                    $name = trim($city);
                    return $name !== '' ? ['name' => $name] : null;
                }

                if (!is_array($city)) {
                    return null;
                }

                $name = trim((string) ($city['name'] ?? $city['ville'] ?? $city['city'] ?? $city['label'] ?? $city['nom'] ?? ''));

                return $name !== '' ? ['name' => $name] : null;
            })
            ->filter()
            ->unique('name')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    private function getFallbackDeliveryCities(): array
    {
        $savedCities = \App\Models\City::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->filter()
            ->map(fn (string $name) => ['name' => $name])
            ->values()
            ->all();

        if (!empty($savedCities)) {
            return $savedCities;
        }

        $configCities = $this->normalizeDeliveryCities(config('tawsilex_cities', []));

        return !empty($configCities) ? $configCities : $this->getTawsilexDefaultCities();
    }

    private function deliveryCitiesResponse(array $cities, string $source, ?string $warning = null)
    {
        $response = response()->json($cities);
        $response->headers->set('X-Delivery-Cities-Source', $source);

        if ($warning) {
            $response->headers->set('X-Delivery-Cities-Warning', $warning);
        }

        return $response;
    }

    private function getAuthenticatedVendor(Request $request): ?Vendor
    {
        $user = $request->user();

        if (!$user || !$user->isVendor()) {
            return null;
        }

        return $user->vendor()->first();
    }

    private function applyAuthenticatedVendor(Request $request, array $validated): array
    {
        $user = $request->user();

        if (!$user || !$user->isVendor()) {
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

    private function authorizeOrderAccess(Request $request, Order $order, bool $allowUnassignedClaim = false): void
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->isAdmin()) {
            return;
        }

        if ($user->isManager()) {
            return;
        }

        if ($user->isVendor()) {
            $vendor = $this->getAuthenticatedVendor($request);

            if (!$vendor) {
                throw ValidationException::withMessages([
                    'vendor_id' => ['Authenticated seller does not have a vendor profile.'],
                ]);
            }

            if ((int) $order->vendor_id !== (int) $vendor->id) {
                abort(403, 'You are not allowed to access this order.');
            }

            return;
        }

        if ($user->isConfirmationAgent()) {
            if ((int) $order->confirmation_agent_id === (int) $user->id) {
                return;
            }

            if ($allowUnassignedClaim && !$order->confirmation_agent_id) {
                return;
            }

            abort(403, 'You are not allowed to access this order.');
        }

        if ($user->isDeliveryPerson()) {
            if ((int) $order->delivery_person_id === (int) $user->id) {
                return;
            }

            abort(403, 'You are not allowed to access this order.');
        }

        abort(403, 'You are not allowed to access this order.');
    }

    private function ensureConfirmationAgentCanManuallyUpdateStatus(Request $request, Order $order, ?string $requestedStatus = null): void
    {
        $user = $request->user();

        if (!$user?->isConfirmationAgent()) {
            return;
        }

        if ($requestedStatus !== null && $requestedStatus === $order->status) {
            return;
        }

        if ($this->isConfirmationAgentStatusLocked($order, $requestedStatus)) {
            abort(403, $this->getConfirmationAgentStatusLockMessage($order));
        }
    }

    private function ensureSellerCanManuallyUpdateStatus(Request $request, Order $order, ?string $requestedStatus = null): void
    {
        if (!$request->user()?->isVendor()) {
            return;
        }

        if ($requestedStatus !== null && $requestedStatus !== $order->status) {
            abort(403, $this->getSellerStatusLockMessage($order));
        }
    }

    private function ensureAdminCanManuallyUpdateStatus(Request $request, Order $order, ?string $requestedStatus = null): void
    {
        $user = $request->user();

        if (!$user?->isAdmin()) {
            return;
        }

        if ($requestedStatus === null || $requestedStatus === $order->status) {
            return;
        }

        if ($this->isAdminStatusLocked($order)) {
            abort(403, $this->getAdminStatusLockMessage($order));
        }
    }

    private function isConfirmationAgentStatusLocked(Order $order, ?string $requestedStatus = null): bool
    {
        if (!empty($order->delivery_tracking_code)) {
            return true;
        }

        $isInitialConfirmation = $order->status === 'pending'
            && $requestedStatus === 'confirmed'
            && empty($order->confirmed_at);

        if ($isInitialConfirmation) {
            return false;
        }

        if ($order->delivery_person_id && (!empty($order->confirmed_at) || $order->status === 'confirmed')) {
            return true;
        }

        return !empty($order->confirmed_at) || $order->status === 'confirmed';
    }

    private function isSellerStatusLocked(Order $order, ?string $requestedStatus = null): bool
    {
        return true;
    }

    private function getConfirmationAgentStatusLockMessage(Order $order): string
    {
        if (!empty($order->delivery_tracking_code)) {
            return 'Status is read-only for confirmation agents after the order is handed to a delivery company.';
        }

        if ($order->delivery_person_id) {
            return 'Status is read-only for confirmation agents once a delivery person is assigned.';
        }

        return 'Status is read-only for confirmation agents once the order has been confirmed.';
    }

    private function getSellerStatusLockMessage(Order $order): string
    {
        return 'Status is read-only for sellers.';
    }

    private function isAdminStatusLocked(Order $order): bool
    {
        if ($this->isDeliveryWorkflowLocked($order)) {
            return true;
        }

        return $this->isAdminDeliveryCompanyStatusLocked($order);
    }

    private function isAdminDeliveryCompanyStatusLocked(Order $order): bool
    {
        if (empty($order->delivery_integration_id) || empty($order->delivery_tracking_code)) {
            return false;
        }

        return in_array($order->status, self::ADMIN_DELIVERY_COMPANY_LOCKED_STATUSES, true);
    }

    private function getAdminStatusLockMessage(Order $order): string
    {
        if ($this->isDeliveryWorkflowLocked($order)) {
            return 'Status is read-only for admins after the delivery person invoice is marked as paid.';
        }

        return 'Status is read-only for admins once the delivery company marks the order as picked up.';
    }

    private function ensureDeliveryWorkflowUnlocked(Order $order): void
    {
        if ($this->isDeliveryWorkflowLocked($order)) {
            abort(403, 'This order is locked because its delivery invoice has been marked as paid.');
        }
    }

    private function isDeliveryWorkflowLocked(Order $order): bool
    {
        if (
            !Schema::hasTable('delivery_person_billings')
            || !Schema::hasTable('delivery_person_billing_order')
        ) {
            return false;
        }

        return $order->deliveryPersonBillings()
            ->whereNotNull('delivery_person_billings.paid_at')
            ->exists();
    }

    private function authorizeAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403, 'Only administrators can perform this action.');
        }
    }

    private function ensureDeliveryAssignmentExistsForConfirmedStatus(array $validated, ?Order $order = null): void
    {
        if (($validated['status'] ?? null) !== 'confirmed') {
            return;
        }

        $hasDeliveryPerson = array_key_exists('delivery_person_id', $validated)
            ? !empty($validated['delivery_person_id'])
            : !empty($order?->delivery_person_id);
        $hasDeliveryIntegration = array_key_exists('delivery_integration_id', $validated)
            ? !empty($validated['delivery_integration_id'])
            : !empty($order?->delivery_integration_id);
        $deliveryCity = array_key_exists('delivery_city', $validated)
            ? ($validated['delivery_city'] ?? null)
            : ($order?->delivery_city ?? $order?->city);

        if (!$hasDeliveryPerson && !$hasDeliveryIntegration) {
            throw ValidationException::withMessages([
                'delivery_assignment' => ['Choose a delivery person or a delivery company before confirming the order.'],
            ]);
        }

        if ($hasDeliveryIntegration && empty($deliveryCity)) {
            throw ValidationException::withMessages([
                'delivery_city' => ['Select a delivery city before confirming the order.'],
            ]);
        }
    }

    private function ensureProductsAllowedForSeller(array $items, mixed $vendorId, string $fieldPrefix = 'items'): void
    {
        if (empty($vendorId) || empty($items)) {
            return;
        }

        $normalizedVendorId = (int) $vendorId;
        $productIds = collect($items)
            ->pluck('product_id')
            ->filter()
            ->map(fn ($productId) => (int) $productId)
            ->unique()
            ->values();

        if ($productIds->isEmpty()) {
            return;
        }

        $allowedProductIds = Product::query()
            ->whereIn('id', $productIds)
            ->where(function ($query) use ($normalizedVendorId) {
                $query->where('vendor_id', $normalizedVendorId)
                    ->orWhereHas('marketplaceProducts', function ($marketplaceQuery) use ($normalizedVendorId) {
                        $marketplaceQuery
                            ->where('vendor_id', $normalizedVendorId)
                            ->where('is_active', true);
                    });
            })
            ->pluck('id')
            ->map(fn ($productId) => (int) $productId)
            ->all();

        $validationErrors = [];

        foreach ($items as $index => $item) {
            $productId = (int) ($item['product_id'] ?? 0);

            if ($productId === 0 || in_array($productId, $allowedProductIds, true)) {
                continue;
            }

            $validationErrors["{$fieldPrefix}.{$index}.product_id"] = ['Selected product is not allowed for the chosen seller.'];
        }

        if (!empty($validationErrors)) {
            throw ValidationException::withMessages($validationErrors);
        }
    }

    private function ensureConfirmationAgentCanEditBaseItems(Request $request, Order $order, array $validated): void
    {
        if (!array_key_exists('items', $validated)) {
            return;
        }

        $user = $request->user();

        if (!$this->canConfirmationAgentEditBaseItems($order, $user)) {
            abort(403, 'Only confirmation agents who created this order can edit its products.');
        }
    }

    private function canConfirmationAgentEditBaseItems(Order $order, ?User $user): bool
    {
        if (!$user?->isConfirmationAgent()) {
            return false;
        }

        $createdByUserId = (int) ($order->created_by_user_id ?? 0);

        if ($createdByUserId <= 0 && $order->source === 'manual') {
            $createdByUserId = (int) ($order->history()->oldest('id')->value('user_id') ?? 0);
        }

        if ($createdByUserId !== (int) $user->id) {
            return false;
        }

        if (!empty($order->returned_to_confirmation_at)) {
            return true;
        }

        return empty($order->confirmed_at) && $order->status === 'pending';
    }

    private function extractAssignmentPayload(Request $request, array $validated): array
    {
        $payload = [];

        if ($request->exists('delivery_agent_id')) {
            $payload['delivery_agent_id'] = $validated['delivery_agent_id'] ?? null;
        }

        if ($request->exists('delivery_person_id')) {
            $payload['delivery_person_id'] = $validated['delivery_person_id'] ?? null;
        }

        if ($request->exists('delivery_integration_id')) {
            $payload['delivery_integration_id'] = $validated['delivery_integration_id'] ?? null;
        }

        if ($request->exists('delivery_city')) {
            $payload['delivery_city'] = $validated['delivery_city'] ?? null;
        }

        return $payload;
    }

    private function attachShippingPricingMetadata(Order $order, string $context): void
    {
        $resolved = $this->shippingPriceService->resolveCityRate($order->city);
        $effectiveShippingCost = $order->shipping_cost !== null
            ? (float) $order->shipping_cost
            : $resolved['cost'];

        $order->setAttribute('resolved_shipping_cost', $resolved['cost']);
        $order->setAttribute('effective_shipping_cost', $effectiveShippingCost);
        $order->setAttribute('shipping_cost_resolution', [
            'saved_shipping_cost' => $order->shipping_cost !== null ? (float) $order->shipping_cost : null,
            'effective_shipping_cost' => $effectiveShippingCost,
            'city' => $order->city,
            'source' => $resolved['source'],
            'matched_city' => $resolved['matched_city'],
            'used_fallback' => $resolved['used_fallback'],
        ]);

        \Log::info('Order shipping pricing prepared for frontend.', [
            'context' => $context,
            'order_id' => $order->id,
            'city' => $order->city,
            'saved_shipping_cost' => $order->shipping_cost,
            'resolved_shipping_cost' => $resolved['cost'],
            'effective_shipping_cost' => $effectiveShippingCost,
            'city_rate_source' => $resolved['source'],
            'matched_city' => $resolved['matched_city'],
            'used_fallback' => $resolved['used_fallback'],
        ]);
    }

    private function attachOrderDisplayTotals(Order $order): void
    {
        $display = OrderTotals::resolveForDisplay($order);

        $order->setAttribute('shipping_included_in_price', $display['shipping_included_in_price']);
        $order->setAttribute('display_subtotal', $display['display_subtotal']);
        $order->setAttribute('display_total', $display['display_total']);
    }

    private function attachBlacklistMetadata(Request $request, Order|Collection $orders): void
    {
        $collection = $orders instanceof Order ? collect([$orders]) : $orders;

        if (!Schema::hasTable('blacklist_entries')) {
            $collection->each(function (Order $order) {
                $order->setAttribute('is_blacklisted', false);
                $order->setAttribute('blacklist_badge', null);
                $order->setAttribute('blacklist_entry', null);
            });

            return;
        }

        $normalizedPhones = $collection
            ->flatMap(function (Order $order) {
                return [
                    BlacklistEntry::normalizePhone($order->phone),
                    BlacklistEntry::normalizePhone($order->client?->phone),
                ];
            })
            ->filter()
            ->unique()
            ->values();

        if ($normalizedPhones->isEmpty()) {
            $collection->each(function (Order $order) {
                $order->setAttribute('is_blacklisted', false);
                $order->setAttribute('blacklist_badge', null);
                $order->setAttribute('blacklist_entry', null);
            });

            return;
        }

        $canSeeDetails = $request->user()?->isAdmin() || $request->user()?->isConfirmationAgent();
        $entriesByPhone = BlacklistEntry::whereIn('normalized_phone', $normalizedPhones->all())
            ->get()
            ->keyBy('normalized_phone');

        $collection->each(function (Order $order) use ($entriesByPhone, $canSeeDetails) {
            $entry = $entriesByPhone->get(BlacklistEntry::normalizePhone($order->phone))
                ?? $entriesByPhone->get(BlacklistEntry::normalizePhone($order->client?->phone));

            $order->setAttribute('is_blacklisted', (bool) $entry);
            $order->setAttribute('blacklist_badge', $entry ? 'Banned / Blacklisted' : null);
            $order->setAttribute('blacklist_entry', $entry && $canSeeDetails ? [
                'id' => $entry->id,
                'phone_number' => $entry->phone_number,
                'reason' => $entry->reason,
                'cancellation_timing' => $entry->cancellation_timing,
                'created_at' => $entry->created_at,
            ] : null);
        });
    }

    private function attachBlacklistMetadataToArray(Request $request, array $payload, Order $order): array
    {
        $this->attachBlacklistMetadata($request, $order);

        $payload['is_blacklisted'] = (bool) $order->getAttribute('is_blacklisted');
        $payload['blacklist_badge'] = $order->getAttribute('blacklist_badge');
        $payload['blacklist_entry'] = $order->getAttribute('blacklist_entry');

        return $payload;
    }

    private function normalizeLegacyItemProductKeys(Request $request, array $itemGroups = ['items']): void
    {
        $normalizedPayload = [];

        foreach ($itemGroups as $group) {
            $items = $request->input($group);

            if (!is_array($items)) {
                continue;
            }

            $normalizedPayload[$group] = array_map(function ($item) {
                if (!is_array($item)) {
                    return $item;
                }

                // Map legacy product ID keys
                if (empty($item['product_id']) && !empty($item['article_id'])) {
                    $item['product_id'] = $item['article_id'];
                }

                // If product_id is a SKU (non-numeric string), move it to sku field
                if (!empty($item['product_id']) && !is_numeric($item['product_id']) && empty($item['sku'])) {
                    $item['sku'] = $item['product_id'];
                    unset($item['product_id']);
                }

                // Map legacy SKU keys
                if (empty($item['sku'])) {
                    $skuAliases = ['SKU', 'ref', 'reference', 'Ref', 'Reference', 'article_sku'];
                    foreach ($skuAliases as $alias) {
                        if (!empty($item[$alias])) {
                            $item['sku'] = $item[$alias];
                            break;
                        }
                    }
                }

                // Map legacy product name keys
                if (empty($item['product_name'])) {
                    $nameAliases = ['product', 'article', 'name', 'Product', 'Article', 'Name', 'product_title'];
                    foreach ($nameAliases as $alias) {
                        if (!empty($item[$alias])) {
                            $item['product_name'] = $item[$alias];
                            break;
                        }
                    }
                }

                return $item;
            }, $items);
        }

        if (!empty($normalizedPayload)) {
            $request->merge($normalizedPayload);
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

        if ($request->attributes->get('api_integration_id')) {
            return true;
        }

        if (in_array($source, ['custom_api', 'website', 'google_sheet', 'marketplace'], true)) {
            return true;
        }

        return in_array($roleSlug, ['admin', 'superadmin'], true)
            && in_array($source, ['manual', 'marketplace'], true);
    }

    private function applyIntegrationDefaults(Request $request, array $validated): array
    {
        $integration = $request->attributes->get('api_integration');

        if (!$integration) {
            return $validated;
        }

        $vendorId = $request->attributes->get('api_vendor_id');
        if ($vendorId && empty($validated['vendor_id'])) {
            $validated['vendor_id'] = $vendorId;
        }

        $defaultSource = match ($integration->provider) {
            'shopify' => 'shopify',
            'google_sheets' => 'google_sheet',
            'custom_api' => 'custom_api',
            default => 'custom_api',
        };

        $currentSource = $this->normalizeOrderSource($validated['source'] ?? null, $defaultSource);
        $integrationSources = ['shopify', 'google_sheet', 'custom_api', 'website', 'marketplace'];

        if (
            !$request->filled('source')
            || in_array($currentSource, ['manual', 'whatsapp'], true)
            || !in_array($currentSource, $integrationSources, true)
        ) {
            $validated['source'] = $defaultSource;
        } else {
            $validated['source'] = $currentSource;
        }

        return $validated;
    }

    private function applyIntegrationVendor(Request $request, array $validated): array
    {
        $vendorId = $request->attributes->get('api_vendor_id');

        if ($vendorId && empty($validated['vendor_id'])) {
            $validated['vendor_id'] = $vendorId;
        }

        return $validated;
    }

    private function stripVendorRestrictedFields(Request $request, array $validated): array
    {
        if (!$request->user()?->isVendor()) {
            return $validated;
        }

        unset(
            $validated['delivery_agent_id'],
            $validated['delivery_person_id'],
            $validated['delivery_integration_id'],
            $validated['delivery_city'],
            $validated['confirmation_agent_id'],
            $validated['status'],
        );

        return $validated;
    }

    private function normalizeOrderSource(?string $source, string $default = 'manual'): string
    {
        $normalized = strtolower(trim((string) $source));
        $normalized = str_replace([' ', '-'], '_', $normalized);

        $aliases = [
            'api' => 'custom_api',
            'api_personnalisee' => 'custom_api',
            'api_personnalisée' => 'custom_api',
            'custom' => 'custom_api',
            'google_sheets' => 'google_sheet',
            'google_sheet' => 'google_sheet',
            'sheet' => 'google_sheet',
            'site' => 'website',
            'web' => 'website',
            'store' => 'website',
        ];

        if (isset($aliases[$normalized])) {
            $normalized = $aliases[$normalized];
        }

        $allowed = [
            'manual',
            'shopify',
            'google_sheet',
            'delivery_company',
            'marketplace',
            'whatsapp',
            'custom_api',
            'website',
        ];

        if ($normalized === '' || !in_array($normalized, $allowed, true)) {
            return $default;
        }

        return $normalized;
    }

    private function resolveSellerName(Order $order): ?string
    {
        if ($order->relationLoaded('vendor') && $order->vendor) {
            return $order->vendor->name ?: $order->vendor->company_name;
        }

        if ($order->vendor_id) {
            $vendor = Vendor::find($order->vendor_id);

            return $vendor?->name ?: $vendor?->company_name;
        }

        return null;
    }

    /**
     * Resolve product IDs for items that don't have product_id but have product_name or sku.
     * This allows external apps to send product info without knowing internal product IDs.
     */
    private function resolveProductsForItems(array $items, ?int $vendorId = null, bool $preferSkuOverProductId = false): array
    {
        return array_map(function ($item) use ($vendorId, $preferSkuOverProductId) {
            $productBySku = $this->findProductBySku($item['sku'] ?? null, $vendorId);

            if ($productBySku && ($preferSkuOverProductId || $this->shouldReplaceProductId($item['product_id'] ?? null))) {
                $item['product_id'] = $productBySku->id;
                if (empty($item['product_name'])) {
                    $item['product_name'] = $productBySku->name;
                }
                if (empty($item['sku'])) {
                    $item['sku'] = $productBySku->sku;
                }

                return $item;
            }

            // Try to find product by name if SKU resolution failed or wasn't possible
            if (!empty($item['product_name']) && ($preferSkuOverProductId || empty($item['product_id']) || $this->shouldReplaceProductId($item['product_id']))) {
                $product = $this->findProductByNameFlexible($item['product_name'], $vendorId);

                if ($product) {
                    $item['product_id'] = $product->id;
                    return $item;
                }
            }

            // If product_id already exists, no need to resolve further
            if (!empty($item['product_id'])) {
                return $item;
            }

            // If we still don't have a product_id, create/use a generic "Unknown Product"
            if (empty($item['product_id'])) {
                $unknownProduct = Product::firstOrCreate(
                    ['sku' => 'UNKNOWN'],
                    [
                        'name' => 'Unknown Product (External)',
                        'sku' => 'UNKNOWN',
                        'price' => 0,
                        'company_price' => 0,
                        'vendor_price' => 0,
                        'stock_quantity' => 999999,
                        'is_active' => true,
                    ]
                );
                $item['product_id'] = $unknownProduct->id;

                if (empty($item['product_name'])) {
                    $item['product_name'] = 'Unknown Product';
                }
            }

            return $item;
        }, $items);
    }

    private function findProductByNameFlexible(string $name, ?int $vendorId = null): ?Product
    {
        // Clean product name (remove common prefixes/suffixes like [ChatEasy Product: ...])
        $name = preg_replace('/^\[?ChatEasy\s+Product\s*[:\-]\s*/i', '', $name);
        $name = trim(str_replace([']', '['], '', $name));
        
        if ($name === '') {
            return null;
        }

        $query = Product::query();
        if ($vendorId) {
            $query->where(function ($q) use ($vendorId) {
                $q->where('vendor_id', $vendorId)
                    ->orWhereHas('marketplaceProducts', function ($mq) use ($vendorId) {
                        $mq->where('vendor_id', $vendorId)->where('is_active', true);
                    });
            });
        }

        // 1. Try exact SKU match (in case name field actually contains SKU)
        $skuMatch = (clone $query)->where('sku', $name)->first();
        if ($skuMatch) return $skuMatch;

        // 2. Exact name match
        $exact = (clone $query)->where('name', $name)->first();
        if ($exact) return $exact;

        // 3. Fuzzy name match (LIKE)
        $fuzzy = (clone $query)->where('name', 'LIKE', '%' . $name . '%')->first();
        if ($fuzzy) return $fuzzy;

        // 4. Search in description
        $inDesc = (clone $query)->where('description', 'LIKE', '%' . $name . '%')->first();
        if ($inDesc) return $inDesc;

        // 5. Keyword match (split name into words and search for products containing all words)
        $words = array_filter(explode(' ', $name), function($w) { return mb_strlen($w) > 2; });
        if (!empty($words)) {
            $keywordQuery = clone $query;
            foreach ($words as $word) {
                $keywordQuery->where(function($q) use ($word) {
                    $q->where('name', 'LIKE', '%' . $word . '%')
                      ->orWhere('description', 'LIKE', '%' . $word . '%')
                      ->orWhere('sku', 'LIKE', '%' . $word . '%');
                });
            }
            $keywordMatch = $keywordQuery->first();
            if ($keywordMatch) return $keywordMatch;
        }

        // 6. Try matching parts of the name (e.g. if name is "حقيبة تبريد أنسولين مزودة بشاشة", try "حقيبة تبريد أنسولين")
        if (mb_strlen($name) > 10) {
            $parts = explode(' ', $name);
            if (count($parts) > 2) {
                $shortName = implode(' ', array_slice($parts, 0, 3));
                $shortMatch = (clone $query)->where('name', 'LIKE', '%' . $shortName . '%')->first();
                if ($shortMatch) return $shortMatch;
            }
        }

        return null;
    }

    private function findProductBySku(?string $sku, ?int $vendorId = null): ?Product
    {
        $sku = trim((string) $sku);
        if ($sku === '') {
            return null;
        }

        if ($vendorId) {
            $scopedProduct = Product::query()
                ->where('sku', $sku)
                ->where(function ($query) use ($vendorId) {
                    $query->where('vendor_id', $vendorId)
                        ->orWhereHas('marketplaceProducts', function ($marketplaceQuery) use ($vendorId) {
                            $marketplaceQuery
                                ->where('vendor_id', $vendorId)
                                ->where('is_active', true);
                        });
                })
                ->first();

            if ($scopedProduct) {
                return $scopedProduct;
            }
        }

        return Product::where('sku', $sku)->first();
    }

    private function shouldReplaceProductId(mixed $productId): bool
    {
        if (empty($productId)) {
            return false;
        }

        $product = Product::find($productId);

        if (!$product) {
            return true;
        }

        // UNKNOWN product should always be replaced if a better match is found
        if ($product->sku === 'UNKNOWN') {
            return true;
        }

        // PDR001 is often used as a default/placeholder product in some integrations
        if ($product->sku === 'PDR001') {
            return true;
        }

        return false;
    }

    private function enrichItemsFromOrderNotes(array $items, ?string $notes): array
    {
        $fromNotes = $this->extractProductInfoFromNotes($notes);
        if (empty($fromNotes)) {
            return $items;
        }

        if (empty($items)) {
            return $items;
        }

        return array_map(function ($item, $index) use ($fromNotes, $items) {
            if ($index > 0 && count($items) > 1) {
                return $item;
            }

            if (empty($item['sku']) && !empty($fromNotes['sku'])) {
                $item['sku'] = $fromNotes['sku'];
            }

            if (empty($item['product_name']) && !empty($fromNotes['product_name'])) {
                $item['product_name'] = $fromNotes['product_name'];
            }

            return $item;
        }, $items, array_keys($items));
    }

    private function extractProductInfoFromNotes(?string $notes): array
    {
        $notes = trim((string) $notes);
        if ($notes === '') {
            return [];
        }

        $result = [];

        // Check for JSON-like structure in notes
        if (str_starts_with($notes, '{') || str_starts_with($notes, '[')) {
            $decoded = json_decode($notes, true);
            if (is_array($decoded)) {
                $payload = isset($decoded[0]) && is_array($decoded[0]) ? $decoded[0] : $decoded;
                $sku = trim((string) ($payload['sku'] ?? $payload['SKU'] ?? ''));
                $productName = trim((string) ($payload['product_name'] ?? $payload['product'] ?? $payload['name'] ?? ''));

                if ($sku !== '') {
                    $result['sku'] = $sku;
                }
                if ($productName !== '') {
                    $result['product_name'] = $productName;
                }

                if (!empty($result)) {
                    return $result;
                }
            }
        }

        // Try to extract SKU using common patterns
        if (preg_match('/(?:SKU|sku|Sku|Réf|réf|Ref|ref|Reference|reference)\s*[:\-]\s*([A-Za-z0-9\-_.]+)/u', $notes, $matches)) {
            $result['sku'] = trim($matches[1]);
        }

        // Try to extract Product Name using common patterns, handling optional brackets
        if (preg_match('/(?:Product|Produit|product|produit|Article|article)\s*[:\-]\s*([^\]\n|]+)/u', $notes, $matches)) {
            $result['product_name'] = trim($matches[1]);
        }

        return array_filter($result);
    }

    private function inferVendorFromItems(array $items): ?int
    {
        $productIds = collect($items)
            ->pluck('product_id')
            ->filter()
            ->map(fn ($productId) => (int) $productId)
            ->unique()
            ->values();

        if ($productIds->isEmpty()) {
            return null;
        }

        $vendorIds = Product::query()
            ->whereIn('id', $productIds)
            ->whereNotNull('vendor_id')
            ->pluck('vendor_id')
            ->map(fn ($vendorId) => (int) $vendorId)
            ->unique()
            ->values();

        return $vendorIds->count() === 1 ? $vendorIds->first() : null;
    }
}

