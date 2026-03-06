<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Expense;
use App\Models\Client;
use App\Models\Vendor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getStatistics(string $period = 'daily', $vendorId = null)
    {
        $dateRange = $this->getDateRange($period);
        
        // Check if there are any orders in the date range
        $ordersInRange = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        if ($vendorId) {
            $ordersInRange->where('vendor_id', $vendorId);
        }
        
        // If no orders in range, expand to show all orders
        if ($ordersInRange->count() === 0) {
            $dateRange = [
                'start' => Order::min('created_at') ?: Carbon::now()->subYear(),
                'end' => Carbon::now(),
            ];
        }

        return [
            'sales' => $this->getSalesStats($dateRange, $vendorId),
            'orders' => $this->getOrdersStats($dateRange, $vendorId),
            'revenue' => $this->getRevenueStats($dateRange, $vendorId),
            'expenses' => $vendorId ? 0 : $this->getExpensesStats($dateRange), // Vendors don't see expenses
            'low_stock_products' => $vendorId ? [] : $this->getLowStockProducts(), // Vendors don't see stock
            'recent_orders' => $this->getRecentOrders($vendorId),
            'charts' => $this->getChartsData($period, $vendorId),
            'clients' => $this->getClientsStats($dateRange, $vendorId),
            'vendors' => $vendorId ? [] : $this->getVendorsStats(), // Vendors don't see other vendors
            'products' => $this->getProductsStats($vendorId),
            'top_products' => $this->getTopProducts($dateRange, $vendorId),
            'top_clients' => $this->getTopClients($dateRange, $vendorId),
            'top_vendors' => $vendorId ? [] : $this->getTopVendors($dateRange), // Vendors don't see this
        ];
    }

    private function getDateRange(string $period)
    {
        return match($period) {
            'daily' => [
                'start' => Carbon::now()->subDays(7),
                'end' => Carbon::now(),
            ],
            'monthly' => [
                'start' => Carbon::now()->startOfMonth(),
                'end' => Carbon::now(),
            ],
            'yearly' => [
                'start' => Carbon::now()->startOfYear(),
                'end' => Carbon::now(),
            ],
            default => [
                'start' => Carbon::now()->subDays(7),
                'end' => Carbon::now(),
            ]
        };
    }

    private function getSalesStats(array $dateRange, $vendorId = null)
    {
        $query = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('status', ['confirmed', 'shipped', 'delivered']);
        
        if ($vendorId) {
            $query->where('vendor_id', $vendorId);
        }
        
        return $query->sum('total');
    }

    private function getOrdersStats(array $dateRange, $vendorId = null)
    {
        $baseQuery = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        
        if ($vendorId) {
            $baseQuery->where('vendor_id', $vendorId);
        }
        
        $totalOrders = (clone $baseQuery)->count();
        $pending = (clone $baseQuery)->where('status', 'pending')->count();
        $confirmed = (clone $baseQuery)->where('status', 'confirmed')->count();
        $shipped = (clone $baseQuery)->where('status', 'shipped')->count();
        $delivered = (clone $baseQuery)->where('status', 'delivered')->count();
        $cancelled = (clone $baseQuery)->where('status', 'cancelled')->count();
        
        $confirmationCount = $confirmed + $shipped + $delivered;

        return [
            'total' => $totalOrders,
            'pending' => $pending,
            'confirmed' => $confirmed,
            'shipped' => $shipped,
            'delivered' => $delivered,
            'cancelled' => $cancelled,
            'confirmation_rate' => $this->calculateRate($confirmationCount, $totalOrders),
            'delivery_rate' => $this->calculateRate($delivered, $totalOrders),
            'by_source' => (clone $baseQuery)
                ->select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->get(),
        ];
    }

    private function getRevenueStats(array $dateRange, $vendorId = null)
    {
        $revenueQuery = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('status', ['confirmed', 'shipped', 'delivered']);
        
        if ($vendorId) {
            $revenueQuery->where('vendor_id', $vendorId);
        }
        
        $revenue = $revenueQuery->sum('total');

        $expenses = $vendorId ? 0 : Expense::whereBetween('expense_date', [$dateRange['start'], $dateRange['end']])
            ->sum('amount');

        return [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'profit' => $revenue - $expenses,
        ];
    }

    private function getExpensesStats(array $dateRange)
    {
        return Expense::whereBetween('expense_date', [$dateRange['start'], $dateRange['end']])
            ->sum('amount');
    }

    private function getLowStockProducts()
    {
        return Product::whereColumn('stock_quantity', '<=', 'min_stock_quantity')
            ->where('is_active', true)
            ->with('category')
            ->limit(10)
            ->get();
    }

    private function getRecentOrders($vendorId = null)
    {
        $query = Order::with(['client', 'items.product'])
            ->orderBy('created_at', 'desc')
            ->limit(10);
        
        if ($vendorId) {
            $query->where('vendor_id', $vendorId);
        }
        
        return $query->get();
    }

    private function getChartsData(string $period, $vendorId = null)
    {
        $days = match($period) {
            'daily' => 24, // hours
            'monthly' => 30,
            'yearly' => 12,
            default => 7
        };

        if ($period === 'daily') {
            return $this->getHourlyChartData($vendorId);
        } elseif ($period === 'yearly') {
            return $this->getMonthlyChartData($vendorId);
        }

        return $this->getDailyChartData($days, $vendorId);
    }

    private function getHourlyChartData($vendorId = null)
    {
        $data = [];
        for ($i = 23; $i >= 0; $i--) {
            $hourStart = Carbon::now()->subHours($i);
            $hourEnd = $hourStart->copy()->addHour();

            $ordersBase = Order::whereBetween('created_at', [$hourStart, $hourEnd]);
            if ($vendorId) {
                $ordersBase->where('vendor_id', $vendorId);
            }

            $salesQuery = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered']);
            $totalOrders = (clone $ordersBase)->count();
            $confirmedOrders = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered'])->count();
            $deliveredOrders = (clone $ordersBase)->where('status', 'delivered')->count();

            $data[] = [
                'label' => $hourStart->format('H:00'),
                'sales' => $salesQuery->sum('total'),
                'orders' => $totalOrders,
                'confirmationRate' => $this->calculateRate($confirmedOrders, $totalOrders),
                'deliveryRate' => $this->calculateRate($deliveredOrders, $totalOrders),
            ];
        }
        return $data;
    }

    private function getDailyChartData(int $days, $vendorId = null)
    {
        $data = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $ordersBase = Order::whereDate('created_at', $day);
            if ($vendorId) {
                $ordersBase->where('vendor_id', $vendorId);
            }

            $salesQuery = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered']);
            $totalOrders = (clone $ordersBase)->count();
            $confirmedOrders = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered'])->count();
            $deliveredOrders = (clone $ordersBase)->where('status', 'delivered')->count();

            $data[] = [
                'label' => $day->format('M d'),
                'sales' => $salesQuery->sum('total'),
                'orders' => $totalOrders,
                'confirmationRate' => $this->calculateRate($confirmedOrders, $totalOrders),
                'deliveryRate' => $this->calculateRate($deliveredOrders, $totalOrders),
            ];
        }
        return $data;
    }

    private function getMonthlyChartData($vendorId = null)
    {
        $data = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $ordersBase = Order::whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month);
            if ($vendorId) {
                $ordersBase->where('vendor_id', $vendorId);
            }

            $salesQuery = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered']);
            $totalOrders = (clone $ordersBase)->count();
            $confirmedOrders = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered'])->count();
            $deliveredOrders = (clone $ordersBase)->where('status', 'delivered')->count();

            $data[] = [
                'label' => $month->format('M Y'),
                'sales' => $salesQuery->sum('total'),
                'orders' => $totalOrders,
                'confirmationRate' => $this->calculateRate($confirmedOrders, $totalOrders),
                'deliveryRate' => $this->calculateRate($deliveredOrders, $totalOrders),
            ];
        }
        return $data;
    }

    private function calculateRate(int $numerator, int $denominator): float
    {
        if ($denominator === 0) {
            return 0.0;
        }

        return round(($numerator / $denominator) * 100, 2);
    }

    private function getClientsStats(array $dateRange, $vendorId = null)
    {
        $totalQuery = Client::query();
        $newQuery = Client::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        $activeQuery = Client::whereHas('orders', function ($query) use ($dateRange, $vendorId) {
            $query->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
            if ($vendorId) {
                $query->where('vendor_id', $vendorId);
            }
        });
        
        // If vendor, filter clients who have ordered from them
        if ($vendorId) {
            $totalQuery->whereHas('orders', function ($query) use ($vendorId) {
                $query->where('vendor_id', $vendorId);
            });
            $newQuery->whereHas('orders', function ($query) use ($vendorId) {
                $query->where('vendor_id', $vendorId);
            });
        }
        
        return [
            'total' => $totalQuery->count(),
            'new' => $newQuery->count(),
            'active' => $activeQuery->count(),
        ];
    }

    private function getVendorsStats()
    {
        return [
            'total' => Vendor::count(),
            'active' => Vendor::where('is_active', true)->count(),
            'total_commission' => Vendor::sum('total_commission'),
        ];
    }

    private function getProductsStats($vendorId = null)
    {
        if ($vendorId) {
            // For vendors, show their marketplace products
            $vendor = Vendor::find($vendorId);
            if (!$vendor) {
                return [
                    'total' => 0,
                    'active' => 0,
                    'low_stock' => 0,
                    'out_of_stock' => 0,
                ];
            }
            
            $marketplaceProducts = $vendor->marketplaceProducts();
            
            return [
                'total' => $marketplaceProducts->count(),
                'active' => (clone $marketplaceProducts)->where('is_active', true)->count(),
                'low_stock' => 0, // Vendors don't manage stock directly
                'out_of_stock' => 0,
            ];
        }
        
        // Admin view
        return [
            'total' => Product::count(),
            'active' => Product::where('is_active', true)->count(),
            'low_stock' => Product::whereColumn('stock_quantity', '<=', 'min_stock_quantity')
                ->where('is_active', true)
                ->count(),
            'out_of_stock' => Product::where('stock_quantity', 0)
                ->where('is_active', true)
                ->count(),
        ];
    }

    private function getTopProducts(array $dateRange, $vendorId = null)
    {
        $query = Product::select(
                'products.id',
                'products.name',
                'products.price',
                'products.stock_quantity',
                'products.category_id',
                'products.images',
                'products.is_active',
                DB::raw('SUM(order_items.quantity) as total_sold')
            )
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered']);
        
        if ($vendorId) {
            $query->where('orders.vendor_id', $vendorId);
        }
        
        return $query->groupBy('products.id', 'products.name', 'products.price', 'products.stock_quantity', 'products.category_id', 'products.images', 'products.is_active')
            ->orderBy('total_sold', 'desc')
            ->limit(5)
            ->get();
    }

    private function getTopClients(array $dateRange, $vendorId = null)
    {
        $query = Client::select(
                'clients.id',
                'clients.name',
                'clients.email',
                'clients.phone',
                'clients.address',
                DB::raw('COUNT(orders.id) as order_count'),
                DB::raw('SUM(orders.total) as total_spent')
            )
            ->join('orders', 'clients.id', '=', 'orders.client_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered']);
        
        if ($vendorId) {
            $query->where('orders.vendor_id', $vendorId);
        }
        
        return $query->groupBy('clients.id', 'clients.name', 'clients.email', 'clients.phone', 'clients.address')
            ->orderBy('total_spent', 'desc')
            ->limit(5)
            ->get();
    }

    private function getTopVendors(array $dateRange)
    {
        return Vendor::select(
                'vendors.id',
                'vendors.name',
                'vendors.email',
                'vendors.phone',
                'vendors.address',
                'vendors.commission_rate',
                'vendors.total_commission',
                'vendors.is_active',
                DB::raw('SUM(orders.total) as total_sales')
            )
            ->join('orders', 'vendors.id', '=', 'orders.vendor_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered'])
            ->groupBy('vendors.id', 'vendors.name', 'vendors.email', 'vendors.phone', 'vendors.address', 'vendors.commission_rate', 'vendors.total_commission', 'vendors.is_active')
            ->orderBy('total_sales', 'desc')
            ->limit(5)
            ->get();
    }
}
