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
    public function getStatistics(string $period = 'daily')
    {
        $dateRange = $this->getDateRange($period);

        return [
            'sales' => $this->getSalesStats($dateRange),
            'orders' => $this->getOrdersStats($dateRange),
            'revenue' => $this->getRevenueStats($dateRange),
            'expenses' => $this->getExpensesStats($dateRange),
            'low_stock_products' => $this->getLowStockProducts(),
            'recent_orders' => $this->getRecentOrders(),
            'charts' => $this->getChartsData($period),
            'clients' => $this->getClientsStats($dateRange),
            'vendors' => $this->getVendorsStats(),
            'products' => $this->getProductsStats(),
            'top_products' => $this->getTopProducts($dateRange),
            'top_clients' => $this->getTopClients($dateRange),
            'top_vendors' => $this->getTopVendors($dateRange),
        ];
    }

    private function getDateRange(string $period)
    {
        return match($period) {
            'daily' => [
                'start' => Carbon::today(),
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
                'start' => Carbon::today(),
                'end' => Carbon::now(),
            ]
        };
    }

    private function getSalesStats(array $dateRange)
    {
        return Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('status', ['confirmed', 'shipped', 'delivered'])
            ->sum('total');
    }

    private function getOrdersStats(array $dateRange)
    {
        return [
            'total' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])->count(),
            'pending' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->where('status', 'pending')->count(),
            'confirmed' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->where('status', 'confirmed')->count(),
            'shipped' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->where('status', 'shipped')->count(),
            'delivered' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->where('status', 'delivered')->count(),
            'cancelled' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->where('status', 'cancelled')->count(),
            'by_source' => Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->get(),
        ];
    }

    private function getRevenueStats(array $dateRange)
    {
        $revenue = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('status', ['confirmed', 'shipped', 'delivered'])
            ->sum('total');

        $expenses = Expense::whereBetween('expense_date', [$dateRange['start'], $dateRange['end']])
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

    private function getRecentOrders()
    {
        return Order::with(['client', 'items.product'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
    }

    private function getChartsData(string $period)
    {
        $days = match($period) {
            'daily' => 24, // hours
            'monthly' => 30,
            'yearly' => 12,
            default => 7
        };

        if ($period === 'daily') {
            return $this->getHourlyChartData();
        } elseif ($period === 'yearly') {
            return $this->getMonthlyChartData();
        }

        return $this->getDailyChartData($days);
    }

    private function getHourlyChartData()
    {
        $data = [];
        for ($i = 23; $i >= 0; $i--) {
            $hour = Carbon::now()->subHours($i);
            $sales = Order::whereBetween('created_at', [$hour, $hour->copy()->addHour()])
                ->whereIn('status', ['confirmed', 'shipped', 'delivered'])
                ->sum('total');
            
            $data[] = [
                'label' => $hour->format('H:00'),
                'sales' => $sales,
                'orders' => Order::whereBetween('created_at', [$hour, $hour->copy()->addHour()])->count(),
            ];
        }
        return $data;
    }

    private function getDailyChartData(int $days)
    {
        $data = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $sales = Order::whereDate('created_at', $day)
                ->whereIn('status', ['confirmed', 'shipped', 'delivered'])
                ->sum('total');
            
            $data[] = [
                'label' => $day->format('M d'),
                'sales' => $sales,
                'orders' => Order::whereDate('created_at', $day)->count(),
            ];
        }
        return $data;
    }

    private function getMonthlyChartData()
    {
        $data = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $sales = Order::whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->whereIn('status', ['confirmed', 'shipped', 'delivered'])
                ->sum('total');
            
            $data[] = [
                'label' => $month->format('M Y'),
                'sales' => $sales,
                'orders' => Order::whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)->count(),
            ];
        }
        return $data;
    }

    private function getClientsStats(array $dateRange)
    {
        return [
            'total' => Client::count(),
            'new' => Client::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])->count(),
            'active' => Client::whereHas('orders', function ($query) use ($dateRange) {
                $query->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
            })->count(),
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

    private function getProductsStats()
    {
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

    private function getTopProducts(array $dateRange)
    {
        return Product::select('products.*', DB::raw('SUM(order_items.quantity) as total_sold'))
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered'])
            ->groupBy('products.id')
            ->orderBy('total_sold', 'desc')
            ->limit(5)
            ->get();
    }

    private function getTopClients(array $dateRange)
    {
        return Client::select('clients.*', DB::raw('COUNT(orders.id) as order_count'), DB::raw('SUM(orders.total) as total_spent'))
            ->join('orders', 'clients.id', '=', 'orders.client_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered'])
            ->groupBy('clients.id')
            ->orderBy('total_spent', 'desc')
            ->limit(5)
            ->get();
    }

    private function getTopVendors(array $dateRange)
    {
        return Vendor::select('vendors.*', DB::raw('SUM(orders.total) as total_sales'))
            ->join('orders', 'vendors.id', '=', 'orders.vendor_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('orders.status', ['confirmed', 'shipped', 'delivered'])
            ->groupBy('vendors.id')
            ->orderBy('total_sales', 'desc')
            ->limit(5)
            ->get();
    }
}
