<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    public function index(Request $request)
    {
        $query = Vendor::query();

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $perPage = $request->get('per_page', 15);
        $vendors = $query->latest()->paginate($perPage);

        return response()->json($vendors);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:vendors,email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255|required_with:rib',
            'rib' => ['nullable', 'string', 'max:34', 'required_with:bank_name', 'regex:/^[0-9 ]+$/'],
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'billing_frequency' => 'nullable|in:weekly,twice_weekly',
            'is_active' => 'boolean',
        ]);

        // Start transaction
        \DB::beginTransaction();
        
        try {
            // Create user account for vendor
            $user = \App\Models\User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => \Hash::make($validated['password']),
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Assign vendor role
            $vendorRole = \App\Models\Role::where('slug', 'vendor')->first();
            if ($vendorRole) {
                $user->role()->associate($vendorRole);
                $user->save();
            }

            // Create vendor profile linked to user
            $vendorData = $validated;
            unset($vendorData['password'], $vendorData['password_confirmation']);
            if (isset($vendorData['rib'])) {
                $vendorData['rib'] = preg_replace('/\s+/', '', $vendorData['rib']);
            }
            $vendorData['user_id'] = $user->id;
            
            $vendor = Vendor::create($vendorData);

            \DB::commit();

            return response()->json([
                'vendor' => $vendor->load('user'),
                'message' => 'Vendor created successfully. They can now login with their email and password.'
            ], 201);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Failed to create vendor', [
                'error' => $e->getMessage(),
                'data' => $validated,
            ]);
            
            return response()->json([
                'message' => 'Failed to create vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(Vendor $vendor)
    {
        return response()->json([
            'vendor' => $vendor,
            'products' => $vendor->products()->with('category')->get(),
            'orders' => $vendor->orders()->with(['client', 'items.product'])->latest()->limit(20)->get(),
            'billing' => $this->dashboardService->getSellerBillingStats($vendor->id),
            'statistics' => [
                'total_products' => $vendor->products()->count(),
                'active_products' => $vendor->products()->where('is_active', true)->count(),
                'total_orders' => $vendor->orders()->count(),
                'total_sales' => $vendor->total_sales,
                'total_commission' => $vendor->total_commission,
            ]
        ]);
    }

    public function update(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'email|unique:vendors,email,' . $vendor->id . '|unique:users,email,' . ($vendor->user_id ?? 'NULL'),
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255|required_with:rib',
            'rib' => ['nullable', 'string', 'max:34', 'required_with:bank_name', 'regex:/^[0-9 ]+$/'],
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'billing_frequency' => 'nullable|in:weekly,twice_weekly',
            'is_active' => 'boolean',
        ]);

        \DB::beginTransaction();
        
        try {
            // Update vendor profile
            $vendorData = $validated;
            unset($vendorData['password'], $vendorData['password_confirmation']);
            if (isset($vendorData['rib'])) {
                $vendorData['rib'] = preg_replace('/\s+/', '', $vendorData['rib']);
            }
            $vendor->update($vendorData);

            // Update user account if exists
            if ($vendor->user_id) {
                $userData = [
                    'name' => $validated['name'] ?? $vendor->user->name,
                    'email' => $validated['email'] ?? $vendor->user->email,
                    'is_active' => $validated['is_active'] ?? $vendor->user->is_active,
                ];

                // Update password if provided
                if (!empty($validated['password'])) {
                    $userData['password'] = \Hash::make($validated['password']);
                }

                $vendor->user->update($userData);
            }

            \DB::commit();

            return response()->json([
                'vendor' => $vendor->load('user'),
                'message' => 'Vendor updated successfully.'
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Failed to update vendor', [
                'error' => $e->getMessage(),
                'vendor_id' => $vendor->id,
            ]);
            
            return response()->json([
                'message' => 'Failed to update vendor: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Vendor $vendor)
    {
        $vendor->delete();
        return response()->json(['message' => 'Vendor deleted successfully']);
    }

    public function salesReport(Request $request, Vendor $vendor)
    {
        $dateFrom = $request->get('date_from', now()->subMonth());
        $dateTo = $request->get('date_to', now());

        $orders = $vendor->orders()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->where('status', 'delivered')
            ->with(['items.product'])
            ->get();

        $totalSales = $orders->sum('total');
        $totalCommission = $orders->sum('commission_amount');

        return response()->json([
            'vendor' => $vendor,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'total_orders' => $orders->count(),
            'total_sales' => $totalSales,
            'total_commission' => $totalCommission,
            'net_revenue' => $totalSales - $totalCommission,
            'orders' => $orders,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:vendors,email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'required|string',
            'company_name' => 'required|string',
            'address' => 'required|string',
            'city' => 'required|string',
        ]);

        $vendor = Vendor::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'phone' => $validated['phone'],
            'company_name' => $validated['company_name'],
            'address' => $validated['address'],
            'city' => $validated['city'],
            'is_active' => false,
            'commission_rate' => 10,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please wait for admin approval.',
            'vendor' => $vendor
        ], 201);
    }
}
