<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
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
            'email' => 'required|email|unique:vendors,email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'commission_rate' => 'required|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $vendor = Vendor::create($validated);

        return response()->json($vendor, 201);
    }

    public function show(Vendor $vendor)
    {
        return response()->json([
            'vendor' => $vendor,
            'products' => $vendor->products()->with('category')->get(),
            'orders' => $vendor->orders()->with(['client', 'items.product'])->latest()->limit(20)->get(),
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
            'email' => 'email|unique:vendors,email,' . $vendor->id,
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'company_name' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'commission_rate' => 'numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $vendor->update($validated);

        return response()->json($vendor);
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
}
