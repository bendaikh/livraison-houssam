<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account is not active.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load(['role', 'vendor']),
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load(['role', 'vendor']));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $vendor = $user->vendor;

        $rules = [
            'email' => 'required|email|unique:users,email,' . $user->id,
            'name' => 'sometimes|string|max:255',
        ];

        // Keep vendors.email unique when the linked seller profile is synced
        if ($vendor) {
            $rules['email'] .= '|unique:vendors,email,' . $vendor->id;
        }

        if ($request->filled('current_password') || $request->filled('new_password')) {
            $rules['current_password'] = 'required|string';
            $rules['new_password'] = 'required|string|min:8|confirmed';
        }

        $validated = $request->validate($rules);

        if ($request->filled('current_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password is incorrect.'],
                ]);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->email = $validated['email'];
        
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        $user->save();

        // Superadmin seller list reads vendors.name/email — keep them in sync with the user account
        if ($vendor) {
            $vendorData = [
                'name' => $user->name,
                'email' => $user->email,
            ];

            if ($request->filled('current_password')) {
                $vendorData['password'] = $user->password;
            }

            $vendor->update($vendorData);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->load(['role', 'vendor']),
        ]);
    }
}
