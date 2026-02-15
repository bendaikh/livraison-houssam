<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function addStock(int $productId, int $quantity, ?float $unitCost = null, ?string $note = null, ?string $reference = null)
    {
        return DB::transaction(function () use ($productId, $quantity, $unitCost, $note, $reference) {
            $product = Product::findOrFail($productId);
            $previousStock = $product->stock_quantity;
            $newStock = $previousStock + $quantity;

            $product->update(['stock_quantity' => $newStock]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'user_id' => Auth::id(),
                'type' => 'in',
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'unit_cost' => $unitCost,
                'note' => $note,
                'reference' => $reference,
            ]);

            return $movement;
        });
    }

    public function removeStock(int $productId, int $quantity, ?string $note = null, ?string $reference = null, ?int $orderId = null)
    {
        return DB::transaction(function () use ($productId, $quantity, $note, $reference, $orderId) {
            $product = Product::findOrFail($productId);
            $previousStock = $product->stock_quantity;

            if ($previousStock < $quantity) {
                throw new \Exception('Insufficient stock. Available: ' . $previousStock);
            }

            $newStock = $previousStock - $quantity;
            $product->update(['stock_quantity' => $newStock]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'user_id' => Auth::id(),
                'order_id' => $orderId,
                'type' => 'out',
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'note' => $note,
                'reference' => $reference,
            ]);

            // Check for low stock and create notification
            if ($product->isLowStock()) {
                $this->createLowStockNotification($product);
            }

            return $movement;
        });
    }

    public function adjustStock(int $productId, int $newQuantity, ?string $note = null)
    {
        return DB::transaction(function () use ($productId, $newQuantity, $note) {
            $product = Product::findOrFail($productId);
            $previousStock = $product->stock_quantity;
            $difference = $newQuantity - $previousStock;

            $product->update(['stock_quantity' => $newQuantity]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'user_id' => Auth::id(),
                'type' => 'adjustment',
                'quantity' => abs($difference),
                'previous_stock' => $previousStock,
                'new_stock' => $newQuantity,
                'note' => $note ?? 'Stock adjustment',
            ]);

            if ($product->isLowStock()) {
                $this->createLowStockNotification($product);
            }

            return $movement;
        });
    }

    public function deductStockForOrder(int $orderId)
    {
        $order = \App\Models\Order::with('items.product')->findOrFail($orderId);

        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                $this->removeStock(
                    $item->product_id,
                    $item->quantity,
                    "Stock deduction for order #{$order->order_number}",
                    $order->order_number,
                    $order->id
                );
            }
        });
    }

    private function createLowStockNotification(Product $product)
    {
        // Create notification for admin users
        $adminRole = \App\Models\Role::where('slug', 'admin')->first();
        
        if ($adminRole) {
            $admins = \App\Models\User::where('role_id', $adminRole->id)
                ->where('is_active', true)
                ->get();

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'low_stock',
                    'title' => 'Low Stock Alert',
                    'message' => "Product '{$product->name}' is running low on stock. Current: {$product->stock_quantity}, Minimum: {$product->min_stock_quantity}",
                    'data' => [
                        'product_id' => $product->id,
                        'current_stock' => $product->stock_quantity,
                        'min_stock' => $product->min_stock_quantity,
                    ],
                ]);
            }
        }
    }

    public function getStockHistory(int $productId, ?string $type = null, ?string $startDate = null, ?string $endDate = null)
    {
        $query = StockMovement::where('product_id', $productId)
            ->with(['user', 'order']);

        if ($type) {
            $query->where('type', $type);
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getLowStockProducts()
    {
        return Product::whereColumn('stock_quantity', '<=', 'min_stock_quantity')
            ->where('is_active', true)
            ->with(['category', 'vendor'])
            ->orderBy('stock_quantity', 'asc')
            ->get();
    }
}
