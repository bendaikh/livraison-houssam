<?php

namespace App\Services;

use App\Models\ConfirmationAgentBilling;
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

    public function getConfirmationAgentStatistics(string $period, User $user): array
    {
        $dateRange = $this->getDateRange($period);
        $baseQuery = Order::where('confirmation_agent_id', $user->id)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $commissionPerOrder = (float) $user->effective_commission_per_order;
        $inProgressStatuses = ['pending', 'picked_up', 'ready_for_shipping', 'out_for_delivery', 'return_requested'];

        $currentMonthStart = Carbon::now()->startOfMonth();
        $currentMonthEnd = Carbon::now()->endOfMonth();
        $currentMonthDeliveredQuery = Order::where('confirmation_agent_id', $user->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$currentMonthStart, $currentMonthEnd]);
        $currentMonthUnpaidDeliveredQuery = Order::where('confirmation_agent_id', $user->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$currentMonthStart, $currentMonthEnd])
            ->whereDoesntHave('confirmationBillings', function ($query) {
                $query->whereNotNull('confirmation_agent_billings.paid_at');
            });
        $currentMonthDelivered = (clone $currentMonthDeliveredQuery)->count();
        $currentMonthUnpaidDelivered = (clone $currentMonthUnpaidDeliveredQuery)->count();

        return [
            'sales' => (clone $baseQuery)->where('status', 'delivered')->sum('total'),
            'orders' => [
                'total' => (clone $baseQuery)->count(),
                'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
                'confirmed' => (clone $baseQuery)->where('status', 'confirmed')->count(),
                'in_progress' => (clone $baseQuery)->whereIn('status', $inProgressStatuses)->count(),
                'shipped' => (clone $baseQuery)->where('status', 'shipped')->count(),
                'delivered' => (clone $baseQuery)->where('status', 'delivered')->count(),
                'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
                'refused' => (clone $baseQuery)->where('status', 'refused')->count(),
                'returned' => (clone $baseQuery)->where('status', 'returned')->count(),
                'by_source' => (clone $baseQuery)
                    ->select('source', DB::raw('count(*) as count'))
                    ->groupBy('source')
                    ->get(),
            ],
            'revenue' => [
                'revenue' => (clone $baseQuery)->where('status', 'delivered')->sum('total'),
                'expenses' => 0,
                'profit' => (clone $baseQuery)->where('status', 'delivered')->sum('total'),
            ],
            'expenses' => 0,
            'low_stock_products' => [],
            'recent_orders' => Order::with(['client', 'items.product'])
                ->where('confirmation_agent_id', $user->id)
                ->latest()
                ->limit(10)
                ->get(),
            'charts' => $this->getConfirmationAgentDailyChartData($period, $user->id),
            'clients' => [
                'total' => Client::whereHas('orders', function ($query) use ($user) {
                    $query->where('confirmation_agent_id', $user->id);
                })->count(),
                'new' => Client::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                    ->whereHas('orders', function ($query) use ($user) {
                        $query->where('confirmation_agent_id', $user->id);
                    })
                    ->count(),
                'active' => Client::whereHas('orders', function ($query) use ($user, $dateRange) {
                    $query->where('confirmation_agent_id', $user->id)
                        ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
                })->count(),
            ],
            'vendors' => [],
            'products' => [
                'total' => Product::where('is_active', true)->count(),
                'active' => Product::where('is_active', true)->count(),
            ],
            'top_products' => $this->getTopProductsForConfirmationAgent($dateRange, $user->id),
            'top_clients' => $this->getTopClientsForConfirmationAgent($dateRange, $user->id),
            'top_vendors' => [],
            'confirmation_agent' => [
                'today' => [
                    'delivered' => Order::where('confirmation_agent_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->count(),
                    'earnings' => Order::where('confirmation_agent_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->count() * $commissionPerOrder,
                ],
                'todo_today' => Order::with(['client', 'items.product'])
                    ->where('confirmation_agent_id', $user->id)
                    ->whereDate('callback_date', '<=', Carbon::today())
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned'])
                    ->orderBy('callback_date')
                    ->limit(10)
                    ->get(),
                'callbacks_upcoming' => Order::where('confirmation_agent_id', $user->id)
                    ->whereDate('callback_date', '>', Carbon::today())
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned'])
                    ->count(),
                'commission' => [
                    'per_order' => $commissionPerOrder,
                    'current_month_delivered' => $currentMonthDelivered,
                    'current_month_total' => $currentMonthDelivered * $commissionPerOrder,
                    'current_month_unpaid_delivered' => $currentMonthUnpaidDelivered,
                    'current_month_unpaid_total' => $currentMonthUnpaidDelivered * $commissionPerOrder,
                    'current_month_paid_reset' => $currentMonthUnpaidDelivered === 0,
                ],
                'latest_invoice' => ConfirmationAgentBilling::with('paidBy')
                    ->where('user_id', $user->id)
                    ->latest('period_start')
                    ->first(),
            ],
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

    private function getConfirmationAgentDailyChartData(string $period, int $userId): array
    {
        if ($period === 'yearly') {
            $data = [];
            for ($i = 11; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $base = Order::where('confirmation_agent_id', $userId)
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month);

                $data[] = [
                    'label' => $month->format('M Y'),
                    'orders' => (clone $base)->count(),
                    'delivered' => (clone $base)->where('status', 'delivered')->count(),
                    'callbacks' => (clone $base)->whereNotNull('callback_date')->count(),
                ];
            }

            return $data;
        }

        $days = $period === 'monthly' ? 30 : 7;
        $data = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $base = Order::where('confirmation_agent_id', $userId)
                ->whereDate('created_at', $day);

            $data[] = [
                'label' => $day->format('M d'),
                'orders' => (clone $base)->count(),
                'delivered' => (clone $base)->where('status', 'delivered')->count(),
                'callbacks' => (clone $base)->whereDate('callback_date', $day)->count(),
            ];
        }

        return $data;
    }

    private function getTopProductsForConfirmationAgent(array $dateRange, int $userId)
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.confirmation_agent_id', $userId)
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->select(
                'order_items.product_id',
                DB::raw('COALESCE(products.name, order_items.product_name, "Product") as name'),
                DB::raw('SUM(order_items.quantity) as total_quantity')
            )
            ->groupBy('order_items.product_id', 'products.name', 'order_items.product_name')
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get();
    }

    private function getTopClientsForConfirmationAgent(array $dateRange, int $userId)
    {
        return Client::whereHas('orders', function ($query) use ($dateRange, $userId) {
            $query->where('confirmation_agent_id', $userId)
                ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        })
            ->withCount(['orders as orders_count' => function ($query) use ($dateRange, $userId) {
                $query->where('confirmation_agent_id', $userId)
                    ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
            }])
            ->orderByDesc('orders_count')
            ->limit(5)
            ->get();
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
