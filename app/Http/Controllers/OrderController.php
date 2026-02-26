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
        $query = Order::with(['client', 'vendor', 'deliveryAgent', 'deliveryPerson', 'confirmationAgent', 'items.product']);

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
        ]);

        $order = $this->orderService->updateOrderStatus(
            $order->id,
            $validated['status'],
            $validated['note'] ?? null
        );

        return response()->json($order);
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
}
