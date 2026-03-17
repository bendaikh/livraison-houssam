<?php

namespace App\Services;

use App\Models\ConfirmationAgentBilling;
use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\Product;
use App\Models\Expense;
use App\Models\Client;
use App\Models\SellerBilling;
use App\Models\Setting;
use App\Models\Vendor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
                'start' => $vendorId
                    ? (Order::where('vendor_id', $vendorId)->min('created_at') ?: Carbon::now()->subYear())
                    : (Order::min('created_at') ?: Carbon::now()->subYear()),
                'end' => Carbon::now(),
            ];
        }

        return [
            'seller_overview' => $vendorId ? $this->getSellerOverviewStats($vendorId) : null,
            'sales' => $this->getSalesStats($dateRange, $vendorId),
            'orders' => $this->getOrdersStats($dateRange, $vendorId),
            'revenue' => $this->getRevenueStats($dateRange, $vendorId),
            'seller_billing' => $vendorId ? $this->getSellerBillingStats($vendorId) : null,
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
                'profit' => (clone $baseQuery)->where('status', 'delivered')->count() * $commissionPerOrder,
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
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned', 'no_response'])
                    ->orderBy('callback_date')
                    ->limit(10)
                    ->get(),
                'callbacks_upcoming' => Order::where('confirmation_agent_id', $user->id)
                    ->whereDate('callback_date', '>', Carbon::today())
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned', 'no_response'])
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

    public function getSellerOverviewStats(int $vendorId): array
    {
        $baseQuery = Order::where('vendor_id', $vendorId);
        $profitOrders = Order::where('vendor_id', $vendorId)->with(['items.product'])->get();

        return [
            'orders' => [
                'total' => (clone $baseQuery)->count(),
                'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
                'confirmed' => (clone $baseQuery)->where('status', 'confirmed')->count(),
                'shipped' => (clone $baseQuery)->where('status', 'shipped')->count(),
                'delivered' => (clone $baseQuery)->where('status', 'delivered')->count(),
                'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
                'refused' => (clone $baseQuery)->where('status', 'refused')->count(),
                'returned' => (clone $baseQuery)->where('status', 'returned')->count(),
            ],
            'total_revenue' => (float) (clone $baseQuery)->sum('total'),
            'total_profit' => (float) $profitOrders->sum(fn (Order $order) => $this->calculateSellerOrderProfit($order)),
        ];
    }

    public function getDeliveryPersonStatistics(string $period, User $user): array
    {
        if (
            !Schema::hasColumn('orders', 'collected_amount')
            || !Schema::hasColumn('orders', 'delivery_person_commission')
            || !Schema::hasColumn('orders', 'amount_due_to_admin')
            || !Schema::hasTable('delivery_person_billings')
        ) {
            return [
                'sales' => 0,
                'orders' => [
                    'total' => 0,
                    'active_assigned' => 0,
                    'delivered' => 0,
                    'no_response' => 0,
                    'refused_cancelled' => 0,
                    'returned' => 0,
                    'by_source' => [],
                ],
                'revenue' => ['revenue' => 0, 'expenses' => 0, 'profit' => 0],
                'expenses' => 0,
                'low_stock_products' => [],
                'recent_orders' => [],
                'charts' => [],
                'clients' => ['total' => 0, 'new' => 0, 'active' => 0],
                'vendors' => [],
                'products' => ['total' => 0, 'active' => 0],
                'top_products' => [],
                'top_clients' => [],
                'top_vendors' => [],
                'delivery_person' => [
                    'today' => ['delivered' => 0, 'collected' => 0, 'due_to_admin' => 0, 'earnings' => 0],
                    'todo_today' => [],
                    'callbacks_upcoming' => 0,
                    'finance' => [
                        'unpaid_collected' => 0,
                        'unpaid_due_to_admin' => 0,
                        'unpaid_earnings' => 0,
                        'all_time_collected' => 0,
                        'all_time_due_to_admin' => 0,
                        'all_time_earnings' => 0,
                    ],
                    'latest_invoice' => null,
                ],
            ];
        }

        $dateRange = $this->getDateRange($period);
        $baseQuery = Order::where('delivery_person_id', $user->id)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $activeStatuses = ['confirmed', 'picked_up', 'ready_for_shipping', 'shipped', 'out_for_delivery'];

        $currentMonthStart = Carbon::now()->startOfMonth();
        $currentMonthEnd = Carbon::now()->endOfMonth();
        $unpaidDeliveredQuery = Order::where('delivery_person_id', $user->id)
            ->where('status', 'delivered')
            ->whereBetween('delivered_at', [$currentMonthStart, $currentMonthEnd])
            ->whereDoesntHave('deliveryPersonBillings', function ($query) {
                $query->whereNotNull('delivery_person_billings.paid_at');
            });

        return [
            'sales' => (clone $baseQuery)->where('status', 'delivered')->sum('collected_amount'),
            'orders' => [
                'total' => (clone $baseQuery)->count(),
                'active_assigned' => Order::where('delivery_person_id', $user->id)
                    ->whereIn('status', $activeStatuses)
                    ->count(),
                'delivered' => (clone $baseQuery)->where('status', 'delivered')->count(),
                'no_response' => (clone $baseQuery)->where('status', 'no_response')->count(),
                'refused_cancelled' => (clone $baseQuery)->whereIn('status', ['refused', 'cancelled'])->count(),
                'returned' => (clone $baseQuery)->where('status', 'returned')->count(),
                'by_source' => (clone $baseQuery)
                    ->select('source', DB::raw('count(*) as count'))
                    ->groupBy('source')
                    ->get(),
            ],
            'revenue' => [
                'revenue' => (clone $baseQuery)->where('status', 'delivered')->sum('collected_amount'),
                'expenses' => 0,
                'profit' => (clone $baseQuery)->where('status', 'delivered')->sum('delivery_person_commission'),
            ],
            'expenses' => 0,
            'low_stock_products' => [],
            'recent_orders' => Order::with(['client', 'items.product'])
                ->where('delivery_person_id', $user->id)
                ->latest()
                ->limit(10)
                ->get(),
            'charts' => $this->getDeliveryPersonChartData($period, $user->id),
            'clients' => [
                'total' => Client::whereHas('orders', function ($query) use ($user) {
                    $query->where('delivery_person_id', $user->id);
                })->count(),
                'new' => Client::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                    ->whereHas('orders', function ($query) use ($user) {
                        $query->where('delivery_person_id', $user->id);
                    })
                    ->count(),
                'active' => Client::whereHas('orders', function ($query) use ($user, $dateRange) {
                    $query->where('delivery_person_id', $user->id)
                        ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
                })->count(),
            ],
            'vendors' => [],
            'products' => [
                'total' => Product::where('is_active', true)->count(),
                'active' => Product::where('is_active', true)->count(),
            ],
            'top_products' => $this->getTopProductsForDeliveryPerson($dateRange, $user->id),
            'top_clients' => $this->getTopClientsForDeliveryPerson($dateRange, $user->id),
            'top_vendors' => [],
            'delivery_person' => [
                'today' => [
                    'delivered' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->count(),
                    'collected' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->sum('collected_amount'),
                    'due_to_admin' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->sum('amount_due_to_admin'),
                    'earnings' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->whereBetween('delivered_at', [$todayStart, $todayEnd])
                        ->sum('delivery_person_commission'),
                ],
                'todo_today' => Order::with(['client', 'items.product'])
                    ->where('delivery_person_id', $user->id)
                    ->whereDate('callback_date', '<=', Carbon::today())
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned', 'no_response'])
                    ->orderBy('callback_date')
                    ->limit(10)
                    ->get(),
                'callbacks_upcoming' => Order::where('delivery_person_id', $user->id)
                    ->whereDate('callback_date', '>', Carbon::today())
                    ->whereNotIn('status', ['delivered', 'cancelled', 'refused', 'returned', 'no_response'])
                    ->count(),
                'finance' => [
                    'unpaid_collected' => (clone $unpaidDeliveredQuery)->sum('collected_amount'),
                    'unpaid_due_to_admin' => (clone $unpaidDeliveredQuery)->sum('amount_due_to_admin'),
                    'unpaid_earnings' => (clone $unpaidDeliveredQuery)->sum('delivery_person_commission'),
                    'all_time_collected' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->sum('collected_amount'),
                    'all_time_due_to_admin' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->sum('amount_due_to_admin'),
                    'all_time_earnings' => Order::where('delivery_person_id', $user->id)
                        ->where('status', 'delivered')
                        ->sum('delivery_person_commission'),
                ],
                'latest_invoice' => DeliveryPersonBilling::with('paidBy')
                    ->where('delivery_person_id', $user->id)
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
        $profitQuery = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->where('status', 'delivered');
        
        if ($vendorId) {
            $revenueQuery->where('vendor_id', $vendorId);
            $profitQuery->where('vendor_id', $vendorId);
        }
        
        $revenue = $revenueQuery->sum('total');
        $expenses = $vendorId ? 0 : Expense::whereBetween('expense_date', [$dateRange['start'], $dateRange['end']])
            ->sum('amount');
        $profit = $this->calculateOrderProfitTotal($profitQuery) - $expenses;

        return [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'profit' => $profit,
        ];
    }

    public function getSellerBillingStats(int $vendorId): array
    {
        $vendor = Vendor::find($vendorId);

        if (!$vendor) {
            return [
                'billing_frequency' => 'weekly',
                'billing_frequency_label' => 'Weekly',
                'commission_rate' => 0,
                'unpaid_orders_count' => 0,
                'gross_sales' => 0,
                'commission_amount' => 0,
                'estimated_payout' => 0,
                'open_invoices' => 0,
                'latest_invoice' => null,
            ];
        }

        $unpaidDeliveredOrders = Order::where('vendor_id', $vendorId)
            ->where('status', 'delivered');

        if ($this->sellerBillingTablesExist()) {
            $unpaidDeliveredOrders->whereDoesntHave('sellerBillings', function ($query) {
                $query->whereNotNull('seller_billings.paid_at');
            });
        }

        $grossSales = (float) (clone $unpaidDeliveredOrders)->sum('total');
        $commissionAmount = (float) (clone $unpaidDeliveredOrders)->sum('commission_amount');
        $openInvoices = 0;
        $latestInvoice = null;

        if ($this->sellerBillingTablesExist()) {
            $openInvoices = SellerBilling::where('vendor_id', $vendorId)
                ->whereNull('paid_at')
                ->where('delivered_orders_count', '>', 0)
                ->count();

            $latestBilling = SellerBilling::with('paidBy')
                ->where('vendor_id', $vendorId)
                ->where('delivered_orders_count', '>', 0)
                ->latest('period_start')
                ->first();

            if ($latestBilling) {
                $latestInvoice = [
                    'period_start' => $latestBilling->period_start?->toDateString(),
                    'period_end' => $latestBilling->period_end?->toDateString(),
                    'orders_count' => (int) $latestBilling->delivered_orders_count,
                    'gross_amount' => (float) $latestBilling->gross_sales,
                    'fee_amount' => (float) $latestBilling->commission_amount,
                    'settlement_amount' => (float) $latestBilling->net_amount,
                    'status' => $latestBilling->paid_at ? 'paid' : 'unpaid',
                    'generated_at' => $latestBilling->generated_at?->toIso8601String(),
                    'paid_at' => $latestBilling->paid_at?->toIso8601String(),
                    'paid_by_name' => $latestBilling->paidBy?->name,
                ];
            }
        }

        return [
            'billing_frequency' => $vendor->billing_frequency ?: 'weekly',
            'billing_frequency_label' => ($vendor->billing_frequency ?: 'weekly') === 'twice_weekly' ? 'Twice weekly' : 'Weekly',
            'commission_rate' => (float) ($vendor->commission_rate ?? 0),
            'unpaid_orders_count' => (clone $unpaidDeliveredOrders)->count(),
            'gross_sales' => $grossSales,
            'commission_amount' => $commissionAmount,
            'estimated_payout' => $grossSales - $commissionAmount,
            'open_invoices' => $openInvoices,
            'latest_invoice' => $latestInvoice,
        ];
    }

    private function calculateOrderProfitTotal(Builder $query): float
    {
        $fulfillmentCost = (float) Setting::get('order_fulfillment_cost', 10);

        return (float) $query
            ->with(['items.product'])
            ->get()
            ->sum(fn (Order $order) => $order->calculateProfit($fulfillmentCost));
    }

    private function calculateSellerOrderProfit(Order $order): float
    {
        $itemsProfit = $order->items->sum(function ($item) {
            $quantity = (float) ($item->quantity ?? 0);
            $sellTotal = (float) ($item->price ?? 0) * $quantity;
            $productCost = (float) ($item->product?->getOrderCostAmount() ?? 0) * $quantity;

            return $sellTotal - $productCost;
        });

        return (float) $itemsProfit
            - (float) ($order->shipping_cost ?? 0)
            - (float) ($order->discount ?? 0);
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

    private function sellerBillingTablesExist(): bool
    {
        return Schema::hasTable('seller_billings')
            && Schema::hasTable('seller_billing_order');
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

    private function getDeliveryPersonChartData(string $period, int $userId): array
    {
        if ($period === 'yearly') {
            $data = [];
            for ($i = 11; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $base = Order::where('delivery_person_id', $userId)
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month);

                $data[] = [
                    'label' => $month->format('M Y'),
                    'assigned' => (clone $base)->count(),
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
            $base = Order::where('delivery_person_id', $userId)
                ->whereDate('created_at', $day);

            $data[] = [
                'label' => $day->format('M d'),
                'assigned' => (clone $base)->count(),
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

    private function getTopProductsForDeliveryPerson(array $dateRange, int $userId)
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.delivery_person_id', $userId)
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

    private function getTopClientsForDeliveryPerson(array $dateRange, int $userId)
    {
        return Client::whereHas('orders', function ($query) use ($dateRange, $userId) {
            $query->where('delivery_person_id', $userId)
                ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        })
            ->withCount(['orders as orders_count' => function ($query) use ($dateRange, $userId) {
                $query->where('delivery_person_id', $userId)
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
                'active' => (clone $marketplaceProducts)
                    ->wherePivot('is_active', true)
                    ->where('products.is_active', true)
                    ->count(),
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
