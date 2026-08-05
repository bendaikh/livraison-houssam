<?php

namespace App\Http\Controllers;

use App\Models\MarketplaceProduct;
use App\Models\Product;
use App\Models\Vendor;
use App\Services\DashboardService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    /**
     * Lightweight seller list for Custom API / external integrations (e.g. Prixvado).
     */
    public function externalIndex(Request $request)
    {
        $query = Vendor::query()->select([
            'id',
            'name',
            'company_name',
            'email',
            'phone',
            'is_active',
        ]);

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('company_name', 'like', '%' . $search . '%');
            });
        }

        $vendors = $query
            ->orderByRaw('COALESCE(NULLIF(company_name, ""), name) asc')
            ->get()
            ->map(function (Vendor $vendor) {
                return [
                    'id' => $vendor->id,
                    'name' => $vendor->name,
                    'company_name' => $vendor->company_name,
                    'email' => $vendor->email,
                    'phone' => $vendor->phone,
                    'is_active' => (bool) $vendor->is_active,
                    'label' => trim(($vendor->company_name ?: $vendor->name) . ($vendor->email ? " ({$vendor->email})" : '')),
                ];
            });

        return response()->json([
            'data' => $vendors,
            'count' => $vendors->count(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email:rfc,dns',
                'unique:vendors,email',
                'unique:users,email',
                function ($attribute, $value, $fail) {
                    if (preg_match('/\.([a-z]{2,})\.\1$/i', $value)) {
                        $fail('The email address contains a repeated extension (e.g., .com.com).');
                    }
                    if (str_contains($value, '..')) {
                        $fail('The email address cannot contain consecutive dots.');
                    }
                },
            ],
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
            $this->assignAllActiveProductsToVendor($vendor);

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
            'email' => [
                'nullable',
                'email:rfc,dns',
                'unique:vendors,email,' . $vendor->id,
                'unique:users,email,' . ($vendor->user_id ?? 'NULL'),
                function ($attribute, $value, $fail) {
                    if (empty($value)) return;
                    if (preg_match('/\.([a-z]{2,})\.\1$/i', $value)) {
                        $fail('The email address contains a repeated extension (e.g., .com.com).');
                    }
                    if (str_contains($value, '..')) {
                        $fail('The email address cannot contain consecutive dots.');
                    }
                },
            ],
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
            } else {
                // Create user account for self-registered vendor being activated
                $isBeingActivated = isset($validated['is_active']) && $validated['is_active'] === true;
                
                if ($isBeingActivated) {
                    // Use the password provided during update, or the original password from registration
                    if (!empty($validated['password'])) {
                        $passwordHash = \Hash::make($validated['password']);
                    } elseif (!empty($vendor->password)) {
                        // Use the password hash stored during self-registration
                        $passwordHash = $vendor->password;
                    } else {
                        // Fallback: generate a temporary password
                        $tempPassword = \Str::random(12);
                        $passwordHash = \Hash::make($tempPassword);
                    }
                    
                    $user = \App\Models\User::create([
                        'name' => $validated['name'] ?? $vendor->name,
                        'email' => $validated['email'] ?? $vendor->email,
                        'password' => $passwordHash,
                        'is_active' => true,
                    ]);

                    // Assign vendor role
                    $vendorRole = \App\Models\Role::where('slug', 'vendor')->first();
                    if ($vendorRole) {
                        $user->role()->associate($vendorRole);
                        $user->save();
                    }

                    // Link user to vendor and clear the temporary password
                    $vendor->user_id = $user->id;
                    $vendor->password = null;
                    $vendor->save();

                    \Log::info('Created user account for self-registered vendor', [
                        'vendor_id' => $vendor->id,
                        'user_id' => $user->id,
                        'email' => $user->email,
                    ]);
                }
            }

            if (($validated['is_active'] ?? $vendor->is_active) && $vendor->marketplaceProducts()->count() === 0) {
                $this->assignAllActiveProductsToVendor($vendor);
            }

            \DB::commit();

            $response = [
                'vendor' => $vendor->fresh()->load('user'),
                'message' => 'Vendor updated successfully.'
            ];

            // If a temp password was generated (fallback case), include it in the response
            if (isset($tempPassword)) {
                $response['temporary_password'] = $tempPassword;
                $response['message'] = 'Vendor activated successfully. No password was found, a temporary password has been generated. Please share it with the vendor.';
            } elseif (isset($user)) {
                $response['message'] = 'Vendor activated successfully. They can now login with their original registration credentials.';
            }

            return response()->json($response);
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
        if ($request->filled('bank_rib') && !$request->filled('rib')) {
            $request->merge(['rib' => $request->input('bank_rib')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email:rfc,dns',
                'unique:vendors,email',
                'unique:users,email',
                function ($attribute, $value, $fail) {
                    if (preg_match('/\.([a-z]{2,})\.\1$/i', $value)) {
                        $fail('The email address contains a repeated extension (e.g., .com.com).');
                    }
                    if (str_contains($value, '..')) {
                        $fail('The email address cannot contain consecutive dots.');
                    }
                },
            ],
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'required|string',
            'company_name' => 'required|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'bank_name' => ['required', 'string', 'max:255', Rule::in(config('moroccan_banks'))],
            'rib' => ['required', 'string', 'max:34', 'regex:/^[0-9 ]+$/'],
        ]);

        $rib = preg_replace('/\s+/', '', $validated['rib']);

        $vendor = Vendor::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'phone' => $validated['phone'],
            'company_name' => $validated['company_name'],
            'address' => $validated['address'],
            'city' => $validated['city'],
            'bank_name' => $validated['bank_name'],
            'rib' => $rib,
            'is_active' => false,
            'commission_rate' => 10,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please wait for admin approval.',
            'vendor' => $vendor
        ], 201);
    }

    private function assignAllActiveProductsToVendor(Vendor $vendor): void
    {
        $productIds = Product::query()
            ->where('is_active', true)
            ->pluck('id');

        foreach ($productIds as $productId) {
            MarketplaceProduct::firstOrCreate(
                [
                    'product_id' => $productId,
                    'vendor_id' => $vendor->id,
                ],
                [
                    'is_active' => true,
                    'activated_at' => now(),
                ]
            );
        }
    }
}
