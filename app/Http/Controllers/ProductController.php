<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'vendor']);

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
            'images.*' => 'image|max:2048',
        ]);

        // Set price to company_price if not provided
        if (!isset($validated['price']) && isset($validated['company_price'])) {
            $validated['price'] = $validated['company_price'];
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

        return response()->json($product->load(['category', 'vendor']), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load(['category', 'vendor', 'stockMovements.user']));
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
            'weight' => 'nullable|numeric|min:0',
            'weight_unit' => 'nullable|string',
            'images' => 'nullable|array',
        ]);

        // Set price to company_price if not provided
        if (!isset($validated['price']) && isset($validated['company_price'])) {
            $validated['price'] = $validated['company_price'];
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

        return response()->json($product->load(['category', 'vendor']));
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
