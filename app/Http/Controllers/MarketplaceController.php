<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Vendor;
use App\Models\MarketplaceProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceController extends Controller
{
    /**
     * Get all marketplace products with vendor assignments
     */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'marketplaceProducts.vendor']);

        // Filter to only show marketplace-active products if requested
        if ($request->has('is_marketplace_active') && $request->boolean('is_marketplace_active')) {
            $query->where('is_marketplace_active', true);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name or SKU
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $products = $query->paginate($request->get('per_page', 15));

        return response()->json($products);
    }

    /**
     * Get a single product with all vendor assignments
     */
    public function show(Product $product)
    {
        $product->load(['category', 'marketplaceProducts.vendor']);
        
        // Get available vendors (not yet assigned to this product)
        $assignedVendorIds = $product->marketplaceProducts->pluck('vendor_id')->toArray();
        $availableVendors = Vendor::where('is_active', true)
            ->whereNotIn('id', $assignedVendorIds)
            ->get();

        return response()->json([
            'product' => $product,
            'available_vendors' => $availableVendors,
        ]);
    }

    /**
     * Assign a product to a vendor
     */
    public function assignVendor(Request $request, Product $product)
    {
        $validated = $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'assigned_quantity' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        // Check if already assigned
        $existing = MarketplaceProduct::where('product_id', $product->id)
            ->where('vendor_id', $validated['vendor_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Product already assigned to this vendor',
            ], 422);
        }

        $marketplaceProduct = MarketplaceProduct::create([
            'product_id' => $product->id,
            'vendor_id' => $validated['vendor_id'],
            'commission_rate' => $validated['commission_rate'] ?? null,
            'assigned_quantity' => $validated['assigned_quantity'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'activated_at' => ($validated['is_active'] ?? true) ? now() : null,
        ]);

        $marketplaceProduct->load('vendor');

        return response()->json([
            'message' => 'Product assigned to vendor successfully',
            'data' => $marketplaceProduct,
        ], 201);
    }

    /**
     * Update vendor assignment
     */
    public function updateAssignment(Request $request, MarketplaceProduct $marketplaceProduct)
    {
        $validated = $request->validate([
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'assigned_quantity' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        // Track activation/deactivation
        if (isset($validated['is_active'])) {
            if ($validated['is_active'] && !$marketplaceProduct->is_active) {
                $validated['activated_at'] = now();
                $validated['deactivated_at'] = null;
            } elseif (!$validated['is_active'] && $marketplaceProduct->is_active) {
                $validated['deactivated_at'] = now();
            }
        }

        $marketplaceProduct->update($validated);
        $marketplaceProduct->load(['product', 'vendor']);

        return response()->json([
            'message' => 'Assignment updated successfully',
            'data' => $marketplaceProduct,
        ]);
    }

    /**
     * Toggle product activation for a vendor
     */
    public function toggleActivation(MarketplaceProduct $marketplaceProduct)
    {
        $newStatus = !$marketplaceProduct->is_active;
        
        $marketplaceProduct->update([
            'is_active' => $newStatus,
            'activated_at' => $newStatus ? now() : $marketplaceProduct->activated_at,
            'deactivated_at' => !$newStatus ? now() : null,
        ]);

        $marketplaceProduct->load(['product', 'vendor']);

        return response()->json([
            'message' => $newStatus ? 'Product activated for vendor' : 'Product deactivated for vendor',
            'data' => $marketplaceProduct,
        ]);
    }

    /**
     * Remove vendor assignment
     */
    public function removeAssignment(MarketplaceProduct $marketplaceProduct)
    {
        $marketplaceProduct->delete();

        return response()->json([
            'message' => 'Vendor assignment removed successfully',
        ]);
    }

    /**
     * Get all vendors with their assigned products
     */
    public function vendorProducts(Request $request)
    {
        $query = Vendor::with(['marketplaceProducts.product.category'])
            ->where('is_active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $vendors = $query->paginate($request->get('per_page', 15));

        return response()->json($vendors);
    }

    /**
     * Bulk assign products to a vendor
     */
    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'product_ids' => 'required|array',
            'product_ids.*' => 'exists:products,id',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $assigned = [];
        $skipped = [];

        foreach ($validated['product_ids'] as $productId) {
            $existing = MarketplaceProduct::where('product_id', $productId)
                ->where('vendor_id', $validated['vendor_id'])
                ->first();

            if ($existing) {
                $skipped[] = $productId;
                continue;
            }

            $assigned[] = MarketplaceProduct::create([
                'product_id' => $productId,
                'vendor_id' => $validated['vendor_id'],
                'commission_rate' => $validated['commission_rate'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'activated_at' => ($validated['is_active'] ?? true) ? now() : null,
            ]);
        }

        return response()->json([
            'message' => count($assigned) . ' products assigned successfully',
            'assigned' => count($assigned),
            'skipped' => count($skipped),
            'data' => $assigned,
        ]);
    }

    /**
     * Bulk toggle activation
     */
    public function bulkToggle(Request $request)
    {
        $validated = $request->validate([
            'marketplace_product_ids' => 'required|array',
            'marketplace_product_ids.*' => 'exists:marketplace_products,id',
            'is_active' => 'required|boolean',
        ]);

        $updated = MarketplaceProduct::whereIn('id', $validated['marketplace_product_ids'])
            ->update([
                'is_active' => $validated['is_active'],
                'activated_at' => $validated['is_active'] ? now() : DB::raw('activated_at'),
                'deactivated_at' => !$validated['is_active'] ? now() : null,
            ]);

        return response()->json([
            'message' => $updated . ' assignments updated successfully',
            'updated' => $updated,
        ]);
    }

    /**
     * Get marketplace statistics
     */
    public function statistics()
    {
        $stats = [
            'total_products' => Product::where('is_active', true)->count(),
            'assigned_products' => Product::whereHas('marketplaceProducts')->count(),
            'unassigned_products' => Product::where('is_active', true)
                ->whereDoesntHave('marketplaceProducts')->count(),
            'total_vendors' => Vendor::where('is_active', true)->count(),
            'active_assignments' => MarketplaceProduct::where('is_active', true)->count(),
            'inactive_assignments' => MarketplaceProduct::where('is_active', false)->count(),
            'top_vendors' => Vendor::withCount('marketplaceProducts')
                ->where('is_active', true)
                ->orderBy('marketplace_products_count', 'desc')
                ->limit(5)
                ->get(),
        ];

        return response()->json($stats);
    }
}
