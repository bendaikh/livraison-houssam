<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('role');

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $perPage = $request->get('per_page', 15);
        $users = $query->latest()->paginate($perPage);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
            'commission_per_order' => 'nullable|numeric|min:0',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json($user->load('role'), 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['role', 'deliveryOrders']));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role_id' => 'exists:roles,id',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
            'commission_per_order' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json($user->load('role'));
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function deliveryAgents()
    {
        $agents = User::whereHas('role', function ($query) {
            $query->where('slug', 'manager');
        })->where('is_active', true)->get();

        \Log::info('Delivery Agents Query Result:', ['count' => $agents->count(), 'agents' => $agents->toArray()]);

        return response()->json($agents);
    }

    public function deliveryPersons()
    {
        $persons = User::whereHas('role', function ($query) {
            $query->whereIn('slug', ['delivery_person', 'delivery']);
        })->where('is_active', true)->get();

        return response()->json($persons);
    }

    public function confirmationAgents()
    {
        $agents = User::whereHas('role', function ($query) {
            $query->whereIn('slug', ['confirmation_agent', 'agent_confirmation']);
        })->where('is_active', true)->get();

        \Log::info('Confirmation Agents Query Result:', ['count' => $agents->count(), 'agents' => $agents->toArray()]);

        return response()->json($agents);
    }
}
