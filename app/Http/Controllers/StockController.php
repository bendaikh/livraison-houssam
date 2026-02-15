<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(
        private StockService $stockService
    ) {}

    public function addStock(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'unit_cost' => 'nullable|numeric|min:0',
            'note' => 'nullable|string',
            'reference' => 'nullable|string',
        ]);

        $movement = $this->stockService->addStock(
            $validated['product_id'],
            $validated['quantity'],
            $validated['unit_cost'] ?? null,
            $validated['note'] ?? null,
            $validated['reference'] ?? null
        );

        return response()->json($movement->load(['product', 'user']), 201);
    }

    public function removeStock(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'note' => 'nullable|string',
            'reference' => 'nullable|string',
        ]);

        try {
            $movement = $this->stockService->removeStock(
                $validated['product_id'],
                $validated['quantity'],
                $validated['note'] ?? null,
                $validated['reference'] ?? null
            );

            return response()->json($movement->load(['product', 'user']), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function adjustStock(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'new_quantity' => 'required|integer|min:0',
            'note' => 'nullable|string',
        ]);

        $movement = $this->stockService->adjustStock(
            $validated['product_id'],
            $validated['new_quantity'],
            $validated['note'] ?? null
        );

        return response()->json($movement->load(['product', 'user']), 201);
    }

    public function history(Request $request)
    {
        $query = StockMovement::with(['product', 'user', 'order']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $movements = $query->latest()->paginate($perPage);

        return response()->json($movements);
    }

    public function lowStock()
    {
        $products = $this->stockService->getLowStockProducts();
        return response()->json($products);
    }
}
