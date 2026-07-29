<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\ClientIntelligenceService;
use App\Support\MoroccanPhone;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(
        private ClientIntelligenceService $clientIntelligenceService,
    ) {}

    public function intelligence(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string|max:30',
        ]);

        $phone = MoroccanPhone::normalize($validated['phone']);

        if ($phone === '') {
            return response()->json([
                'message' => 'A valid phone number is required.',
            ], 422);
        }

        return response()->json(
            $this->clientIntelligenceService->profile($phone)
        );
    }

    public function index(Request $request)
    {
        $query = Client::query();

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $perPage = $request->get('per_page', 15);
        $clients = $query->latest()->paginate($perPage);

        return response()->json($clients);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:clients,email',
            'phone' => 'required|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $client = Client::create($validated);

        return response()->json($client, 201);
    }

    public function show(Client $client)
    {
        return response()->json([
            'client' => $client,
            'orders' => $client->orders()->with(['items.product'])->latest()->get(),
            'statistics' => [
                'total_orders' => $client->orders_count,
                'total_spent' => $client->total_spent,
                'pending_orders' => $client->orders()->where('status', 'pending')->count(),
                'completed_orders' => $client->orders()->where('status', 'delivered')->count(),
            ]
        ]);
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'nullable|email|unique:clients,email,' . $client->id,
            'phone' => 'string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $client->update($validated);

        return response()->json($client);
    }

    public function destroy(Client $client)
    {
        $client->delete();
        return response()->json(['message' => 'Client deleted successfully']);
    }
}
