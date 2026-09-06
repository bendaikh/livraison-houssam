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
    private const PLATFORM_CANCELLED_STATUS = 'cancelled';

    private const PLATFORM_PENDING_LEAD_STATUSES = [
        'pending',
        'reported',
        'no_response',
    ];

    private const PLATFORM_CONFIRMED_STATUS = 'confirmed';

    private const PLATFORM_SHIPPED_STATUSES = [
        'shipped',
        'out_for_delivery',
    ];

    private const PLATFORM_DELIVERED_STATUS = 'delivered';

    private const PLATFORM_RETURNED_STATUSES = [
        'returned',
        'return_requested',
    ];

    public function getStatistics(string $period = 'daily', $vendorId = null, ?string $dateFrom = null, ?string $dateTo = null)
    {
        $dateRange = $this->getDateRange($period, $dateFrom, $dateTo);

        return [
            'seller_overview' => $vendorId ? $this->getSellerOverviewStats($vendorId, $dateRange) : null,
            'platform_performance' => $this->getPlatformPerformanceStats($dateRange),
            'kpis' => $this->getBusinessKpis($vendorId, $dateRange),
            'sales' => $this->getSalesStats($dateRange, $vendorId),
            'orders' => $this->getOrdersStats($dateRange, $vendorId),
            'revenue' => $this->getRevenueStats($dateRange, $vendorId),
            'seller_billing' => $vendorId ? $this->getSellerBillingStats($vendorId) : null,
            'expenses' => $vendorId ? 0 : $this->getExpensesStats($dateRange), // Vendors don't see expenses
            'low_stock_products' => $vendorId ? [] : $this->getLowStockProducts(), // Vendors don't see stock
            'recent_orders' => $this->getRecentOrders($vendorId),
            'charts' => $this->getChartsData($period, $vendorId, $dateRange, $dateFrom || $dateTo),
            'clients' => $this->getClientsStats($dateRange, $vendorId),
            'vendors' => $vendorId ? [] : $this->getVendorsStats(), // Vendors don't see other vendors
            'products' => $this->getProductsStats($vendorId),
            'top_products' => $this->getTopProducts($dateRange, $vendorId),
            'top_clients' => $this->getTopClients($dateRange, $vendorId),
            'top_vendors' => $vendorId ? [] : $this->getTopVendors($dateRange), // Vendors don't see this
            'period' => $period,
            'date_from' => $dateRange['start']->toDateString(),
            'date_to' => $dateRange['end']->toDateString(),
        ];
    }

    public function getConfirmationAgentStatistics(string $period, User $user, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $dateRange = $this->getDateRange($period, $dateFrom, $dateTo);
        $baseQuery = Order::where('confirmation_agent_id', $user->id)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $commissionPerOrder = (float) $user->effective_commission_per_order;
        $inProgressStatuses = ['pending', 'reported', 'picked_up', 'ready_for_shipping', 'out_for_delivery', 'return_requested'];

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

    public function getPlatformPerformanceStats(array $dateRange): array
    {
        $current = $this->aggregatePlatformOrderMetrics($dateRange);
        $previousRange = $this->getPreviousDateRange($dateRange);
        $previous = $this->aggregatePlatformOrderMetrics($previousRange);

        return [
            ...$current,
            'rates' => $this->buildPlatformPerformanceRates($current),
            'trends' => $this->buildPlatformPerformanceTrends($current, $previous),
            'date_from' => $dateRange['start']->toDateString(),
            'date_to' => $dateRange['end']->toDateString(),
        ];
    }

    private function aggregatePlatformOrderMetrics(array $dateRange): array
    {
        $pendingLeadStatuses = $this->sqlInList(self::PLATFORM_PENDING_LEAD_STATUSES);
        $shippedStatuses = $this->sqlInList(self::PLATFORM_SHIPPED_STATUSES);
        $returnedStatuses = $this->sqlInList(self::PLATFORM_RETURNED_STATUSES);
        $confirmedStatus = self::PLATFORM_CONFIRMED_STATUS;
        $deliveredStatus = self::PLATFORM_DELIVERED_STATUS;
        $cancelledStatus = self::PLATFORM_CANCELLED_STATUS;

        $row = Order::query()
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->selectRaw('COUNT(*) as total_orders')
            ->selectRaw("SUM(CASE WHEN status = '{$cancelledStatus}' THEN 1 ELSE 0 END) as cancelled_orders")
            ->selectRaw("SUM(CASE WHEN status IN ({$pendingLeadStatuses}) THEN 1 ELSE 0 END) as pending_lead_orders")
            ->selectRaw("SUM(CASE WHEN status = '{$confirmedStatus}' THEN 1 ELSE 0 END) as confirmed_strict_orders")
            ->selectRaw("SUM(CASE WHEN status IN ({$shippedStatuses}) THEN 1 ELSE 0 END) as shipped_orders")
            ->selectRaw("SUM(CASE WHEN status = '{$deliveredStatus}' THEN 1 ELSE 0 END) as delivered_orders")
            ->selectRaw("SUM(CASE WHEN status IN ({$returnedStatuses}) THEN 1 ELSE 0 END) as returned_orders")
            ->selectRaw("SUM(CASE WHEN status = 'refused' THEN 1 ELSE 0 END) as refused_orders")
            ->first();

        $totalOrders = (int) ($row->total_orders ?? 0);
        $cancelledOrders = (int) ($row->cancelled_orders ?? 0);
        $pendingLeadOrders = (int) ($row->pending_lead_orders ?? 0);
        $confirmedStrictOrders = (int) ($row->confirmed_strict_orders ?? 0);
        $shippedOrders = (int) ($row->shipped_orders ?? 0);
        $deliveredOrders = (int) ($row->delivered_orders ?? 0);
        $expeditedOrders = $shippedOrders + $deliveredOrders;
        $confirmedPipelineOrders = $confirmedStrictOrders + $expeditedOrders;
        $confirmationDenominator = $pendingLeadOrders + $confirmedPipelineOrders;

        return [
            'total_orders' => $totalOrders,
            'cancelled_orders' => $cancelledOrders,
            'pending_lead_orders' => $pendingLeadOrders,
            'confirmed_strict_orders' => $confirmedStrictOrders,
            'shipped_orders' => $shippedOrders,
            'delivered_orders' => $deliveredOrders,
            'expedited_orders' => $expeditedOrders,
            'confirmed_pipeline_orders' => $confirmedPipelineOrders,
            'confirmation_denominator' => $confirmationDenominator,
            'delivery_denominator' => $confirmedPipelineOrders,
            'returned_orders' => (int) ($row->returned_orders ?? 0),
            'refused_orders' => (int) ($row->refused_orders ?? 0),
        ];
    }

    private function buildPlatformPerformanceRates(array $metrics): array
    {
        $confirmedPipelineOrders = (int) ($metrics['confirmed_pipeline_orders'] ?? 0);
        $confirmationDenominator = (int) ($metrics['confirmation_denominator'] ?? 0);
        $deliveredOrders = (int) ($metrics['delivered_orders'] ?? 0);
        $deliveryDenominator = (int) ($metrics['delivery_denominator'] ?? 0);
        $returnedOrders = (int) ($metrics['returned_orders'] ?? 0);
        $expeditedOrders = (int) ($metrics['expedited_orders'] ?? 0);
        $eligibleOrders = max(0, (int) ($metrics['total_orders'] ?? 0) - (int) ($metrics['cancelled_orders'] ?? 0));

        return [
            'confirmation_rate' => $this->calculateRate($confirmedPipelineOrders, $confirmationDenominator),
            'delivery_rate' => $this->calculateRate($deliveredOrders, $deliveryDenominator),
            'return_rate' => $this->calculateRate($returnedOrders, $eligibleOrders),
            'shipping_rate' => $this->calculateRate($expeditedOrders, $eligibleOrders),
            'success_rate' => $this->calculateRate(
                $deliveredOrders,
                $deliveredOrders + $returnedOrders + (int) ($metrics['refused_orders'] ?? 0)
            ),
        ];
    }

    private function buildPlatformPerformanceTrends(array $current, array $previous): array
    {
        $currentRates = $this->buildPlatformPerformanceRates($current);
        $previousRates = $this->buildPlatformPerformanceRates($previous);

        $trends = [];
        foreach ($currentRates as $key => $value) {
            $trends[$key] = round($value - ($previousRates[$key] ?? 0), 2);
        }

        return $trends;
    }

    private function getPreviousDateRange(array $dateRange): array
    {
        $start = $dateRange['start']->copy()->startOfDay();
        $end = $dateRange['end']->copy()->endOfDay();
        $days = max(1, (int) $start->diffInDays($end) + 1);

        $previousEnd = $start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($days - 1)->startOfDay();

        return [
            'start' => $previousStart,
            'end' => $previousEnd,
        ];
    }

    private function sqlInList(array $values): string
    {
        return collect($values)
            ->map(fn (string $value) => "'" . str_replace("'", "''", $value) . "'")
            ->implode(', ');
    }

    public function getSellerOverviewStats(int $vendorId, ?array $dateRange = null): array
    {
        $baseQuery = Order::where('vendor_id', $vendorId);
        if ($dateRange) {
            $baseQuery->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        }

        $profitOrders = (clone $baseQuery)->with(['items.product'])->get();

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

    public function getDeliveryPersonStatistics(string $period, User $user, ?string $dateFrom = null, ?string $dateTo = null): array
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

        $dateRange = $this->getDateRange($period, $dateFrom, $dateTo);
        $baseQuery = Order::where('delivery_person_id', $user->id)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $activeStatuses = ['confirmed', 'reported', 'picked_up', 'ready_for_shipping', 'shipped', 'out_for_delivery'];

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

    private function getDateRange(string $period, ?string $dateFrom = null, ?string $dateTo = null)
    {
        if ($dateFrom || $dateTo) {
            $start = $dateFrom
                ? Carbon::parse($dateFrom)->startOfDay()
                : Carbon::parse($dateTo)->startOfDay();
            $end = $dateTo
                ? Carbon::parse($dateTo)->endOfDay()
                : Carbon::parse($dateFrom)->endOfDay();

            if ($start->gt($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            return [
                'start' => $start,
                'end' => $end,
            ];
        }

        return match ($period) {
            'daily' => [
                'start' => Carbon::today()->startOfDay(),
                'end' => Carbon::today()->endOfDay(),
            ],
            'monthly' => [
                'start' => Carbon::now()->startOfMonth(),
                'end' => Carbon::now()->endOfDay(),
            ],
            'yearly' => [
                'start' => Carbon::now()->startOfYear(),
                'end' => Carbon::now()->endOfDay(),
            ],
            default => [
                'start' => Carbon::today()->startOfDay(),
                'end' => Carbon::today()->endOfDay(),
            ],
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

    private function getBusinessKpis($vendorId = null, ?array $dateRange = null): array
    {
        $baseQuery = Order::query();
        if ($vendorId) {
            $baseQuery->where('vendor_id', $vendorId);
        }
        if ($dateRange) {
            $baseQuery->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        }

        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $todayBase = Order::query();
        if ($vendorId) {
            $todayBase->where('vendor_id', $vendorId);
        }
        $todayQuery = $todayBase->whereBetween('created_at', [$todayStart, $todayEnd]);
        $deliveredQuery = (clone $baseQuery)->where('status', 'delivered');

        $totalOrders = (clone $baseQuery)->count();
        $deliveredOrders = (clone $deliveredQuery)->count();

        return [
            'total_orders' => $totalOrders,
            'pending_orders' => (clone $baseQuery)->where('status', 'pending')->count(),
            'confirmed_orders' => (clone $baseQuery)->where('status', 'confirmed')->count(),
            'shipped_orders' => (clone $baseQuery)->where('status', 'shipped')->count(),
            'delivered_orders' => $deliveredOrders,
            'refused_orders' => (clone $baseQuery)->where('status', 'refused')->count(),
            'returned_orders' => (clone $baseQuery)->where('status', 'returned')->count(),
            'cancelled_orders' => (clone $baseQuery)->where('status', 'cancelled')->count(),
            'total_revenue' => (float) (clone $deliveredQuery)->sum('total'),
            'today_orders' => (clone $todayQuery)->count(),
            'today_revenue' => (float) (clone $todayQuery)->where('status', 'delivered')->sum('total'),
            'conversion_rate' => $this->calculateRate($deliveredOrders, $totalOrders),
        ];
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
        $refused = (clone $baseQuery)->where('status', 'refused')->count();
        $returned = (clone $baseQuery)->where('status', 'returned')->count();
        
        $confirmationCount = $confirmed + $shipped + $delivered;

        return [
            'total' => $totalOrders,
            'pending' => $pending,
            'confirmed' => $confirmed,
            'shipped' => $shipped,
            'delivered' => $delivered,
            'cancelled' => $cancelled,
            'refused' => $refused,
            'returned' => $returned,
            'confirmation_rate' => $this->calculateRate($confirmationCount, $totalOrders),
            'delivery_rate' => $this->calculateRate($delivered, $totalOrders),
            'conversion_rate' => $this->calculateRate($delivered, $totalOrders),
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

    private function getChartsData(string $period, $vendorId = null, ?array $dateRange = null, bool $hasCustomDates = false)
    {
        if ($hasCustomDates && $dateRange) {
            $days = max(1, (int) $dateRange['start']->diffInDays($dateRange['end']) + 1);

            if ($days <= 1) {
                return $this->getHourlyChartData($vendorId, $dateRange['start']);
            }

            if ($days <= 62) {
                return $this->getDailyChartDataForRange($dateRange, $vendorId);
            }

            return $this->getMonthlyChartDataForRange($dateRange, $vendorId);
        }

        if ($period === 'daily') {
            return $this->getHourlyChartData($vendorId);
        }

        if ($period === 'yearly') {
            return $this->getMonthlyChartData($vendorId);
        }

        return $this->getDailyChartData(Carbon::now()->daysInMonth, $vendorId);
    }

    private function getHourlyChartData($vendorId = null, ?Carbon $day = null)
    {
        $data = [];
        $baseDay = ($day ?? Carbon::today())->copy()->startOfDay();

        for ($i = 0; $i < 24; $i++) {
            $hourStart = $baseDay->copy()->addHours($i);
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

    private function getDailyChartDataForRange(array $dateRange, $vendorId = null)
    {
        $data = [];
        $cursor = $dateRange['start']->copy()->startOfDay();
        $end = $dateRange['end']->copy()->startOfDay();

        while ($cursor->lte($end)) {
            $ordersBase = Order::whereDate('created_at', $cursor);
            if ($vendorId) {
                $ordersBase->where('vendor_id', $vendorId);
            }

            $salesQuery = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered']);
            $totalOrders = (clone $ordersBase)->count();
            $confirmedOrders = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered'])->count();
            $deliveredOrders = (clone $ordersBase)->where('status', 'delivered')->count();

            $data[] = [
                'label' => $cursor->format('M d'),
                'sales' => $salesQuery->sum('total'),
                'orders' => $totalOrders,
                'confirmationRate' => $this->calculateRate($confirmedOrders, $totalOrders),
                'deliveryRate' => $this->calculateRate($deliveredOrders, $totalOrders),
            ];

            $cursor->addDay();
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

    private function getMonthlyChartDataForRange(array $dateRange, $vendorId = null)
    {
        $data = [];
        $cursor = $dateRange['start']->copy()->startOfMonth();
        $end = $dateRange['end']->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $ordersBase = Order::whereYear('created_at', $cursor->year)
                ->whereMonth('created_at', $cursor->month);
            if ($vendorId) {
                $ordersBase->where('vendor_id', $vendorId);
            }

            $salesQuery = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered']);
            $totalOrders = (clone $ordersBase)->count();
            $confirmedOrders = (clone $ordersBase)->whereIn('status', ['confirmed', 'shipped', 'delivered'])->count();
            $deliveredOrders = (clone $ordersBase)->where('status', 'delivered')->count();

            $data[] = [
                'label' => $cursor->format('M Y'),
                'sales' => $salesQuery->sum('total'),
                'orders' => $totalOrders,
                'confirmationRate' => $this->calculateRate($confirmedOrders, $totalOrders),
                'deliveryRate' => $this->calculateRate($deliveredOrders, $totalOrders),
            ];

            $cursor->addMonth();
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

        $days = $period === 'monthly' ? Carbon::now()->daysInMonth : 1;
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

        $days = $period === 'monthly' ? Carbon::now()->daysInMonth : 1;
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
