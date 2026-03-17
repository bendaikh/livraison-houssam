<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'vendor', 'marketplaceProducts'])
            ->withSum([
                'orderItems as sold_units' => function ($orderItemsQuery) {
                    $orderItemsQuery
                        ->join('orders', 'orders.id', '=', 'order_items.order_id')
                        ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered']);
                }
            ], 'quantity')
            ->addSelect([
                'admin_unit_profit' => DB::raw('COALESCE(company_price, price, 0) - COALESCE(vendor_price, cost_price, 0)')
            ]);

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('sku', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->has('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'min_stock_quantity');
        }

        $perPage = $request->get('per_page', 15);
        $products = $query->latest()->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products,sku',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'price' => 'nullable|numeric|min:0',
            'company_price' => 'required|numeric|min:0',
            'vendor_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'min_stock_quantity' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'weight' => 'nullable|numeric|min:0',
            'weight_unit' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'image|max:10240',
            'seller_scope' => 'nullable|in:all,specific',
            'seller_ids' => 'nullable|array',
            'seller_ids.*' => 'exists:vendors,id',
        ]);

        // Keep the legacy price field aligned with the selling price shown in order flows.
        if (!isset($validated['price'])) {
            if (isset($validated['company_price'])) {
                $validated['price'] = $validated['company_price'];
            } elseif (isset($validated['vendor_price'])) {
                $validated['price'] = $validated['vendor_price'];
            }
        }

        // Handle image uploads
        if ($request->hasFile('images')) {
            $images = [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');
                $images[] = $path;
            }
            $validated['images'] = $images;
        }

        $product = Product::create($validated);

        // Assign product visibility to sellers (marketplace)
        $this->syncMarketplaceAssignments($product, $request, true);

        return response()->json($product->load(['category', 'vendor']), 201);
    }

    public function show(Product $product)
    {
        return response()->json(
            $product->load([
                'category',
                'vendor',
                'stockMovements.user',
                'marketplaceProducts.vendor',
            ])
        );
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'sku' => 'string|unique:products,sku,' . $product->id,
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'price' => 'nullable|numeric|min:0',
            'company_price' => 'numeric|min:0',
            'vendor_price' => 'numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'integer|min:0',
            'min_stock_quantity' => 'integer|min:0',
            'is_active' => 'boolean',
            'is_marketplace_active' => 'boolean',
            'weight' => 'nullable|numeric|min:0',
            'weight_unit' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'image|max:10240',
            'seller_scope' => 'nullable|in:all,specific',
            'seller_ids' => 'nullable|array',
            'seller_ids.*' => 'exists:vendors,id',
        ]);

        // Keep the legacy price field aligned with the selling price shown in order flows.
        if (!isset($validated['price'])) {
            if (isset($validated['company_price'])) {
                $validated['price'] = $validated['company_price'];
            } elseif (isset($validated['vendor_price'])) {
                $validated['price'] = $validated['vendor_price'];
            }
        }

        // Handle new image uploads
        if ($request->hasFile('images')) {
            $images = $product->images ?? [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');
                $images[] = $path;
            }
            $validated['images'] = $images;
        }

        $product->update($validated);

        // Update seller assignments only when provided (avoid side-effects on simple updates)
        if ($request->has('seller_scope') || $request->has('seller_ids')) {
            $this->syncMarketplaceAssignments($product, $request);
        }

        return response()->json($product->load(['category', 'vendor']));
    }

    /**
     * Sync marketplace assignments for a product based on request input.
     *
     * @param  Product  $product
     * @param  Request  $request
     * @param  bool  $fallbackToAll  When true (on store), default to assigning all active sellers if no mode provided.
     */
    private function syncMarketplaceAssignments(Product $product, Request $request, bool $fallbackToAll = false): void
    {
        $mode = $request->input('seller_scope');

        // On creation, default to "all" so the product is visible to every active seller unless specified otherwise
        if (!$mode && $fallbackToAll) {
            $mode = 'all';
        }

        if (!in_array($mode, ['all', 'specific'], true)) {
            return; // No seller assignment requested
        }

        $sellerIds = $request->input('seller_ids', []);

        $targetVendorIds = $mode === 'all'
            ? Vendor::where('is_active', true)->pluck('id')->all()
            : array_values(array_unique(array_map('intval', $sellerIds)));

        $existingAssignments = $product->marketplaceProducts()->get()->keyBy('vendor_id');
        $now = now();
        $syncPayload = [];

        foreach ($targetVendorIds as $vendorId) {
            $existing = $existingAssignments->get($vendorId);

            $syncPayload[$vendorId] = [
                'is_active' => $existing?->is_active ?? true,
                'commission_rate' => $existing?->commission_rate ?? null,
                'assigned_quantity' => $existing?->assigned_quantity ?? 0,
                'activated_at' => $existing?->activated_at ?? $now,
                'deactivated_at' => $existing?->deactivated_at ?? null,
            ];
        }

        // Sync assignments (detach those not selected)
        $product->marketplaceVendors()->sync($syncPayload);

        $product->update([
            'is_marketplace_active' => count($targetVendorIds) > 0,
        ]);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function deleteImage(Product $product, Request $request)
    {
        $validated = $request->validate([
            'image_path' => 'required|string',
        ]);

        $images = $product->images ?? [];
        $images = array_filter($images, fn($img) => $img !== $validated['image_path']);
        
        $product->update(['images' => array_values($images)]);

        // Delete from storage
        if (Storage::disk('public')->exists($validated['image_path'])) {
            Storage::disk('public')->delete($validated['image_path']);
        }

        return response()->json(['message' => 'Image deleted successfully']);
    }
}
