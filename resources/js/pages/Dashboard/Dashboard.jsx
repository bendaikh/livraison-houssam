import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package, Users, ArrowUpRight, ArrowDownRight, Eye, Clock, CheckCircle, Store, UserPlus, TrendingDown, FileText, X, Calendar } from 'lucide-react';
import ConfirmationAgentDashboard from './ConfirmationAgentDashboard';
import DeliveryPersonDashboard from './DeliveryPersonDashboard';
import { isConfirmationAgentRole, isDeliveryPersonRole } from '../../utils/roles';

export default function Dashboard() {
    const { t } = useTranslation();
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const [period, setPeriod] = useState('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const isVendor = user?.role?.slug === 'vendor';
    const isConfirmationAgent = isConfirmationAgentRole(user?.role?.slug);
    const isDeliveryPerson = isDeliveryPersonRole(user?.role?.slug);
    const hasCustomDates = Boolean(dateFrom || dateTo);

    useEffect(() => {
        fetchDashboardData();
    }, [period, dateFrom, dateTo]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('period', period);
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            const response = await api.get(`/dashboard?${params.toString()}`);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error response:', error.response?.data);
            setStats(null);
            setError(error.response?.data?.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodChange = (nextPeriod) => {
        setDateFrom('');
        setDateTo('');
        setPeriod(nextPeriod);
    };

    const clearDateFilters = () => {
        setDateFrom('');
        setDateTo('');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">{t('admin.common.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                <h1 className="text-xl font-semibold text-rose-900">{t('admin.dashboard.unavailable')}</h1>
                <p className="mt-2 text-sm">
                    {error}
                </p>
            </div>
        );
    }

    if (isConfirmationAgent) {
        return (
            <ConfirmationAgentDashboard
                stats={stats}
                period={period}
                setPeriod={handlePeriodChange}
                dateFrom={dateFrom}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDateTo={setDateTo}
                clearDateFilters={clearDateFilters}
            />
        );
    }

    if (isDeliveryPerson) {
        return (
            <DeliveryPersonDashboard
                stats={stats}
                period={period}
                setPeriod={handlePeriodChange}
                dateFrom={dateFrom}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDateTo={setDateTo}
                clearDateFilters={clearDateFilters}
            />
        );
    }

    const toRateNumber = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const formatRate = (value) => `${toRateNumber(value).toFixed(2)}%`;
    const rateTooltipFormatter = (value) => `${toRateNumber(value).toFixed(2)}%`;
    const formatShortDate = (value) => value
        ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Not generated yet';
    const chartTooltipStyle = {
        backgroundColor: '#fff',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: '12px 16px',
    };
    const sellerOverview = stats?.seller_overview || null;
    const sellerBilling = stats?.seller_billing || null;
    const latestSellerInvoice = sellerBilling?.latest_invoice || null;
    const kpis = stats?.kpis || {};
    const displayOrdersStats = isVendor && sellerOverview ? sellerOverview.orders : (stats?.orders || {});
    const displayRevenue = isVendor && sellerOverview
        ? sellerOverview.total_revenue || 0
        : (kpis.total_revenue ?? stats?.revenue?.revenue ?? 0);
    const displayProfit = isVendor && sellerOverview
        ? sellerOverview.total_profit || 0
        : (stats?.revenue?.profit || 0);
    const formatRateFromKpi = (value) => formatRate(value ?? stats?.orders?.conversion_rate ?? 0);
    const periodLabel = hasCustomDates
        ? t('admin.dashboard.customRange')
        : t(`admin.dashboard.${period}`);

    const statCards = isVendor
        ? [
            {
                title: t('admin.dashboard.totalRevenue'),
                value: formatCurrency(displayRevenue),
                suffix: '',
                icon: DollarSign,
                gradient: 'from-emerald-500 to-teal-600',
                bgGradient: 'from-emerald-50 to-teal-50',
                iconBg: 'bg-emerald-500',
                change: `${displayOrdersStats?.delivered || 0} ${t('admin.menu.delivered').toLowerCase()}`,
                changeType: 'neutral'
            },
            {
                title: t('admin.dashboard.totalOrders'),
                value: displayOrdersStats?.total || 0,
                icon: ShoppingCart,
                gradient: 'from-blue-500 to-indigo-600',
                bgGradient: 'from-blue-50 to-indigo-50',
                iconBg: 'bg-blue-500',
                change: periodLabel,
                changeType: 'neutral'
            },
            {
                title: t('admin.dashboard.totalProfit'),
                value: formatCurrency(displayProfit),
                icon: TrendingUp,
                gradient: 'from-violet-500 to-fuchsia-600',
                bgGradient: 'from-violet-50 to-fuchsia-50',
                iconBg: 'bg-violet-500',
                change: t('admin.dashboard.profitDesc'),
                changeType: 'positive'
            },
            {
                title: t('admin.dashboard.pendingOrders'),
                value: displayOrdersStats?.pending || 0,
                icon: Clock,
                gradient: 'from-amber-500 to-orange-600',
                bgGradient: 'from-amber-50 to-orange-50',
                iconBg: 'bg-amber-500',
                change: periodLabel,
                changeType: 'neutral'
            },
            {
                title: t('admin.dashboard.deliveredOrders'),
                value: displayOrdersStats?.delivered || 0,
                icon: Package,
                gradient: 'from-cyan-500 to-sky-600',
                bgGradient: 'from-cyan-50 to-sky-50',
                iconBg: 'bg-cyan-500',
                change: periodLabel,
                changeType: 'neutral'
            },
        ]
        : [
            { title: t('admin.dashboard.totalOrders'), value: kpis.total_orders ?? 0, icon: ShoppingCart, gradient: 'from-blue-500 to-indigo-600', bgGradient: 'from-blue-50 to-indigo-50', iconBg: 'bg-blue-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.dashboard.pendingOrders'), value: kpis.pending_orders ?? 0, icon: Clock, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-50 to-orange-50', iconBg: 'bg-amber-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.menu.confirmed'), value: kpis.confirmed_orders ?? 0, icon: CheckCircle, gradient: 'from-cyan-500 to-sky-600', bgGradient: 'from-cyan-50 to-sky-50', iconBg: 'bg-cyan-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.menu.shipped'), value: kpis.shipped_orders ?? 0, icon: Package, gradient: 'from-indigo-500 to-violet-600', bgGradient: 'from-indigo-50 to-violet-50', iconBg: 'bg-indigo-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.dashboard.deliveredOrders'), value: kpis.delivered_orders ?? 0, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-50 to-teal-50', iconBg: 'bg-emerald-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.menu.refused'), value: kpis.refused_orders ?? 0, icon: X, gradient: 'from-orange-500 to-red-600', bgGradient: 'from-orange-50 to-red-50', iconBg: 'bg-orange-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.menu.returned'), value: kpis.returned_orders ?? 0, icon: TrendingDown, gradient: 'from-pink-500 to-rose-600', bgGradient: 'from-pink-50 to-rose-50', iconBg: 'bg-pink-500', change: periodLabel, changeType: 'neutral' },
            { title: t('admin.dashboard.totalRevenue'), value: formatCurrency(kpis.total_revenue ?? 0), icon: DollarSign, gradient: 'from-emerald-500 to-lime-600', bgGradient: 'from-emerald-50 to-lime-50', iconBg: 'bg-emerald-500', change: t('admin.dashboard.deliveredRevenue'), changeType: 'positive' },
            { title: t('admin.dashboard.todayOrders'), value: kpis.today_orders ?? 0, icon: ShoppingCart, gradient: 'from-violet-500 to-fuchsia-600', bgGradient: 'from-violet-50 to-fuchsia-50', iconBg: 'bg-violet-500', change: t('admin.dashboard.today'), changeType: 'neutral' },
            { title: t('admin.dashboard.todayRevenue'), value: formatCurrency(kpis.today_revenue ?? 0), icon: DollarSign, gradient: 'from-teal-500 to-cyan-600', bgGradient: 'from-teal-50 to-cyan-50', iconBg: 'bg-teal-500', change: t('admin.dashboard.today'), changeType: 'neutral' },
            { title: t('admin.dashboard.conversionRate'), value: formatRateFromKpi(kpis.conversion_rate), icon: TrendingUp, gradient: 'from-slate-600 to-slate-800', bgGradient: 'from-slate-50 to-slate-100', iconBg: 'bg-slate-700', change: t('admin.dashboard.deliveredVsTotal'), changeType: 'neutral' },
            { title: t('admin.dashboard.lowStockItems'), value: stats?.low_stock_products?.length || 0, icon: AlertTriangle, gradient: 'from-rose-500 to-pink-600', bgGradient: 'from-rose-50 to-pink-50', iconBg: 'bg-rose-500', change: t('admin.dashboard.needsAttention'), changeType: 'negative' },
        ];

    const getStatusColor = (status) => {
        const colors = {
            delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
            confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
            reported: 'bg-sky-100 text-sky-700 border-sky-200',
            shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
        return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const chartData = stats?.charts || [];
    const confirmationRate = stats?.orders?.confirmation_rate ?? 0;
    const deliveryRate = stats?.orders?.delivery_rate ?? 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">{t('admin.menu.dashboard')}</h1>
                        <p className="text-slate-500 mt-1">{t('admin.dashboard.welcome')}, {user?.name}!</p>
                    </div>
                    <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50">
                        {['daily', 'monthly', 'yearly'].map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePeriodChange(p)}
                                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                                    !hasCustomDates && period === p
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {t(`admin.dashboard.${p}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{t('admin.dashboard.dateFrom')}</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{t('admin.dashboard.dateTo')}</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                    {hasCustomDates && (
                        <button
                            type="button"
                            onClick={clearDateFilters}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            {t('admin.dashboard.clearDates')}
                        </button>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <div 
                        key={index} 
                        className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-xl transition-all duration-300 group`}
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${stat.gradient} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                        
                        <div className="relative flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-600 mb-2">{stat.title}</p>
                                <div className="flex items-baseline space-x-1">
                                    <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                                    {stat.suffix && <span className="text-lg text-slate-500 font-medium">{stat.suffix}</span>}
                                </div>
                                <div className={`flex items-center mt-3 text-sm font-medium ${
                                    stat.changeType === 'positive' ? 'text-emerald-600' :
                                    stat.changeType === 'negative' ? 'text-rose-600' :
                                    'text-amber-600'
                                }`}>
                                    {stat.changeType === 'positive' && <ArrowUpRight size={16} className="mr-1" />}
                                    {stat.changeType === 'negative' && <ArrowDownRight size={16} className="mr-1" />}
                                    <span>{stat.change}</span>
                                </div>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                <stat.icon className="text-white" size={26} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isVendor && sellerBilling && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{t('admin.dashboard.commissionBilling')}</h2>
                            <p className="text-slate-500 mt-1">{t('admin.dashboard.commissionBillingDesc')}</p>
                        </div>
                        <div className="inline-flex items-center px-4 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                            {t('admin.dashboard.billingCadence')}: {sellerBilling.billing_frequency_label}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-emerald-700">{t('admin.dashboard.whatYouWillGet')}</p>
                                <DollarSign className="text-emerald-600" size={20} />
                            </div>
                            <p className="text-3xl font-bold text-emerald-900 mt-3">{formatCurrency(sellerBilling.estimated_payout || 0)}</p>
                            <p className="text-xs text-emerald-700 mt-2">{sellerBilling.unpaid_orders_count || 0} {t('admin.dashboard.deliveredUnpaidOrders')}</p>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-blue-700">{t('admin.dashboard.deliveredSales')}</p>
                                <ShoppingCart className="text-blue-600" size={20} />
                            </div>
                            <p className="text-3xl font-bold text-blue-900 mt-3">{formatCurrency(sellerBilling.gross_sales || 0)}</p>
                            <p className="text-xs text-blue-700 mt-2">{t('admin.dashboard.grossDeliveredSales')}</p>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-amber-700">{t('admin.dashboard.platformCommission')}</p>
                                <TrendingDown className="text-amber-600" size={20} />
                            </div>
                            <p className="text-3xl font-bold text-amber-900 mt-3">{formatCurrency(sellerBilling.commission_amount || 0)}</p>
                            <p className="text-xs text-amber-700 mt-2">{t('admin.dashboard.rate')}: {formatRate(sellerBilling.commission_rate || 0)}</p>
                        </div>

                        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-purple-700">{t('admin.dashboard.openBillingReports')}</p>
                                <FileText className="text-purple-600" size={20} />
                            </div>
                            <p className="text-3xl font-bold text-purple-900 mt-3">{sellerBilling.open_invoices || 0}</p>
                            <p className="text-xs text-purple-700 mt-2">{t('admin.dashboard.generatedReportsNotPaid')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.howItIsCalculated')}</h3>
                                <Store className="text-slate-500" size={20} />
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">{t('admin.dashboard.deliveredSales')}</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(sellerBilling.gross_sales || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">{t('admin.dashboard.platformCommission')}</span>
                                    <span className="font-semibold text-amber-700">-{formatCurrency(sellerBilling.commission_amount || 0)}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                                    <span className="font-semibold text-slate-900">{t('admin.dashboard.estimatedPayout')}</span>
                                    <span className="text-xl font-bold text-emerald-700">{formatCurrency(sellerBilling.estimated_payout || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.latestBillingReport')}</h3>
                                <CheckCircle className={latestSellerInvoice?.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'} size={20} />
                            </div>

                            {latestSellerInvoice ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('admin.dashboard.period')}</span>
                                        <span className="font-semibold text-slate-900">
                                            {formatShortDate(latestSellerInvoice.period_start)} - {formatShortDate(latestSellerInvoice.period_end)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('admin.dashboard.orders')}</span>
                                        <span className="font-semibold text-slate-900">{latestSellerInvoice.orders_count || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('admin.dashboard.payout')}</span>
                                        <span className="font-semibold text-emerald-700">{formatCurrency(latestSellerInvoice.settlement_amount || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('admin.dashboard.status')}</span>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                            latestSellerInvoice.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {latestSellerInvoice.status === 'paid' ? t('admin.dashboard.paid') : t('admin.dashboard.unpaid')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('admin.dashboard.generated')}</span>
                                        <span className="font-semibold text-slate-900">{formatShortDate(latestSellerInvoice.generated_at)}</span>
                                    </div>
                                    {latestSellerInvoice.paid_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">{t('admin.dashboard.paidOn')}</span>
                                            <span className="font-semibold text-slate-900">{formatShortDate(latestSellerInvoice.paid_at)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                                    {t('admin.dashboard.noBillingReport')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            {/* Status Cards - Order counts by status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* All Products */}
                {!isVendor && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="text-center">
                            <Package className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                            <p className="text-emerald-600 text-sm font-semibold">{t('admin.dashboard.allProducts')}</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats?.products?.total || 0}</p>
                        </div>
                    </div>
                )}
                {/* New Orders */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-center">
                        <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-blue-600 text-sm font-semibold">{t('admin.dashboard.new')}</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{displayOrdersStats?.pending || 0}</p>
                    </div>
                </div>
                {/* Delivered Orders */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-center">
                        <Package className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-emerald-600 text-sm font-semibold">{t('admin.dashboard.delivered')}</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">{displayOrdersStats?.delivered || 0}</p>
                    </div>
                </div>
                {/* Confirmed Orders */}
                <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                    <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                        <p className="text-cyan-600 text-sm font-semibold">{t('admin.dashboard.confirmed')}</p>
                        <p className="text-2xl font-bold text-cyan-900 mt-1">{displayOrdersStats?.confirmed || 0}</p>
                    </div>
                </div>
                {/* In Delivery */}
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="text-center">
                        <Package className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-indigo-600 text-sm font-semibold">{t('admin.dashboard.inDelivery')}</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">{displayOrdersStats?.shipped || 0}</p>
                    </div>
                </div>
                {/* Returned Orders */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="text-center">
                        <ArrowDownRight className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-orange-600 text-sm font-semibold">{t('admin.dashboard.returned')}</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">{displayOrdersStats?.returned || 0}</p>
                    </div>
                </div>
                {/* Refused Orders */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="text-center">
                        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="text-red-600 text-sm font-semibold">{t('admin.dashboard.refused')}</p>
                        <p className="text-2xl font-bold text-red-900 mt-1">{displayOrdersStats?.refused || 0}</p>
                    </div>
                </div>
                {/* Cancelled Orders */}
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                    <div className="text-center">
                        <X className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                        <p className="text-rose-600 text-sm font-semibold">{t('admin.dashboard.cancelled')}</p>
                        <p className="text-2xl font-bold text-rose-900 mt-1">{displayOrdersStats?.cancelled || 0}</p>
                    </div>
                </div>
                {/* Waiting Confirmation */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-center">
                        <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        <p className="text-amber-600 text-sm font-semibold">{t('admin.dashboard.waiting')}</p>
                        <p className="text-2xl font-bold text-amber-900 mt-1">0</p>
                    </div>
                </div>
                {/* Cancelled Shipping */}
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                    <div className="text-center">
                        <X className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                        <p className="text-pink-600 text-sm font-semibold">{t('admin.dashboard.cancelledShipping')}</p>
                        <p className="text-2xl font-bold text-pink-900 mt-1">0</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Sales Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.salesOverview')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.revenueTrends')}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-slate-600">{t('admin.dashboard.sales')}</span>
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fill="url(#salesGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.ordersOverview')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.orderVolume')}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600">{t('admin.dashboard.orders')}</span>
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData} barSize={40}>
                            <defs>
                                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                                    <stop offset="95%" stopColor="#059669" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Bar dataKey="orders" fill="url(#ordersGradient)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Confirmation Rate Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.confirmationRateChart')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.confirmationRateDesc')}</p>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                            <div>
                                <p className="text-lg font-semibold text-slate-800">{formatRate(confirmationRate)}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">{t('admin.dashboard.current')}</p>
                            </div>
                            <span className="flex items-center space-x-1.5 text-sm text-slate-600">
                                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                                <span>{t('admin.dashboard.confirmation')}</span>
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                            <Tooltip contentStyle={chartTooltipStyle} formatter={rateTooltipFormatter} />
                            <Line type="monotone" dataKey="confirmationRate" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 3, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Delivery Rate Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.deliveryRateChart')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.deliveryRateDesc')}</p>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                            <div>
                                <p className="text-lg font-semibold text-slate-800">{formatRate(deliveryRate)}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">{t('admin.dashboard.current')}</p>
                            </div>
                            <span className="flex items-center space-x-1.5 text-sm text-slate-600">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span>{t('admin.dashboard.delivery')}</span>
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                            <Tooltip contentStyle={chartTooltipStyle} formatter={rateTooltipFormatter} />
                            <Line type="monotone" dataKey="deliveryRate" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, strokeWidth: 3, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Low Stock Alert */}
            {!isVendor && stats?.low_stock_products?.length > 0 && (
                <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200/50 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/25">
                            <AlertTriangle className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.lowStockAlerts')}</h3>
                            <p className="text-sm text-slate-500">{stats.low_stock_products.length} {t('admin.dashboard.productsNeedRestocking')}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden border border-rose-100">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">{t('admin.dashboard.product')}</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">{t('admin.dashboard.sku')}</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">{t('admin.dashboard.currentStock')}</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">{t('admin.dashboard.minStock')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.low_stock_products.map((product, index) => (
                                    <tr key={product.id} className={`hover:bg-rose-50/50 transition-colors ${index !== stats.low_stock_products.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                        <td className="py-4 px-5 font-medium text-slate-800">{product.name}</td>
                                        <td className="py-4 px-5 text-slate-600 font-mono text-sm">{product.sku}</td>
                                        <td className="py-4 px-5">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-rose-100 text-rose-700">
                                                {product.stock_quantity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-600">{product.min_stock_quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Additional Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Sellers Stats - Hidden from vendors */}
                {!isVendor && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.topSellers')}</h3>
                            <Store className="text-orange-500" size={24} />
                        </div>
                        <div className="space-y-3">
                            {stats?.top_vendors?.length > 0 ? (
                                stats.top_vendors.slice(0, 3).map((vendor, index) => (
                                    <div key={vendor.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{vendor.name}</p>
                                                <p className="text-xs text-slate-500">{vendor.products_count || 0} {t('admin.dashboard.products')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-orange-600 text-sm">{formatCurrency(parseFloat(vendor.total_sales) || 0)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 py-4 text-sm">{t('admin.dashboard.noSellerData')}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Sellers Stats - Hidden from vendors */}
                {!isVendor && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.sellers')}</h3>
                            <Store className="text-purple-500" size={24} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">{t('admin.dashboard.totalSellers')}</span>
                                <span className="text-lg font-bold text-slate-800">{stats?.vendors?.total || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">{t('admin.dashboard.activeSellers')}</span>
                                <span className="text-lg font-bold text-emerald-600">{stats?.vendors?.active || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">{t('admin.dashboard.totalCommission')}</span>
                                <span className="text-lg font-bold text-purple-600">{formatCurrency(parseFloat(stats?.vendors?.total_commission) || 0)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.products')}</h3>
                        <Package className="text-indigo-500" size={24} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{t('admin.dashboard.totalProducts')}</span>
                            <span className="text-lg font-bold text-slate-800">{stats?.products?.total || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{t('admin.dashboard.activeProducts')}</span>
                            <span className="text-lg font-bold text-emerald-600">{stats?.products?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{t('admin.dashboard.outOfStock')}</span>
                            <span className="text-lg font-bold text-rose-600">{stats?.products?.out_of_stock || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Products & Top Clients */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.topSellingProducts')}</h3>
                                <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.bestPerformers')}</p>
                            </div>
                            <TrendingUp className="text-emerald-500" size={24} />
                        </div>
                    </div>
                    <div className="p-6">
                        {stats?.top_products?.length > 0 ? (
                            <div className="space-y-4">
                                {stats.top_products.map((product, index) => (
                                    <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{product.name}</p>
                                                <p className="text-sm text-slate-500">{product.sku}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800">{product.total_sold}</p>
                                            <p className="text-xs text-slate-500">{t('admin.dashboard.unitsSold')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">{t('admin.dashboard.noSalesData')}</p>
                        )}
                    </div>
                </div>

                {/* Top Clients - Hidden from vendors */}
                {!isVendor && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.topClients')}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.highestSpending')}</p>
                                </div>
                                <Users className="text-blue-500" size={24} />
                            </div>
                        </div>
                        <div className="p-6">
                            {stats?.top_clients?.length > 0 ? (
                                <div className="space-y-4">
                                    {stats.top_clients.map((client, index) => (
                                        <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{client.name}</p>
                                                    <p className="text-sm text-slate-500">{client.order_count} {t('admin.dashboard.orders')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800">{formatCurrency(parseFloat(client.total_spent) || 0)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 py-8">{t('admin.dashboard.noClientData')}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.dashboard.recentOrders')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('admin.dashboard.latestOrders')}</p>
                        </div>
                        <Link 
                            to={appPath('/orders')}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        >
                            <span>{t('admin.dashboard.viewAll')}</span>
                            <ArrowUpRight size={16} />
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.orderNumber')}</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.client')}</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.total')}</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.status')}</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.date')}</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">{t('admin.dashboard.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recent_orders?.map((order, index) => (
                                <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${index !== stats.recent_orders.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    <td className="py-4 px-6">
                                        <span className="font-semibold text-slate-800">{order.order_number}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
                                                {order.client?.name?.charAt(0)}
                                            </div>
                                            <span className="text-slate-700">{order.client?.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="font-semibold text-slate-800">{formatCurrency(order.total)}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${getStatusColor(order.status)}`}>
                                            {order.status === 'delivered' && <CheckCircle size={12} className="mr-1.5" />}
                                            {order.status === 'pending' && <Clock size={12} className="mr-1.5" />}
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-500">
                                        {new Date(order.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="py-4 px-6">
                                        <Link 
                                            to={appPath(`/orders/${order.id}`)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center"
                                            title={t('admin.dashboard.viewOrderDetails')}
                                        >
                                            <Eye size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
