import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package, Users, ArrowUpRight, ArrowDownRight, Eye, Clock, CheckCircle, Store, UserPlus, TrendingDown, FileText, X } from 'lucide-react';

export default function Dashboard() {
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const [period, setPeriod] = useState('daily');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const isVendor = user?.role?.slug === 'vendor';

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get(`/dashboard?period=${period}`);
            console.log('Dashboard data received:', response.data);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error response:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const toRateNumber = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const formatRate = (value) => `${toRateNumber(value).toFixed(2)}%`;
    const rateTooltipFormatter = (value) => `${toRateNumber(value).toFixed(2)}%`;
    const chartTooltipStyle = {
        backgroundColor: '#fff',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: '12px 16px',
    };

    const statCards = [
        {
            title: 'Total Revenue',
            value: formatCurrency(stats?.revenue?.revenue || 0),
            suffix: '',
            icon: DollarSign,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50',
            iconBg: 'bg-emerald-500',
            change: '+12.5%',
            changeType: 'positive'
        },
        {
            title: 'Total Orders',
            value: stats?.orders?.total || 0,
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-indigo-600',
            bgGradient: 'from-blue-50 to-indigo-50',
            iconBg: 'bg-blue-500',
            change: '+8.2%',
            changeType: 'positive'
        },
        {
            title: 'Pending Orders',
            value: stats?.orders?.pending || 0,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-600',
            bgGradient: 'from-amber-50 to-orange-50',
            iconBg: 'bg-amber-500',
            change: '5 new',
            changeType: 'neutral'
        },
        {
            title: 'Confirmation Rate',
            value: formatRate(stats?.orders?.confirmation_rate ?? 0),
            icon: CheckCircle,
            gradient: 'from-cyan-500 to-sky-600',
            bgGradient: 'from-cyan-50 to-sky-50',
            iconBg: 'bg-cyan-500',
            change: 'Tracked',
            changeType: 'neutral'
        },
        {
            title: 'Delivery Rate',
            value: formatRate(stats?.orders?.delivery_rate ?? 0),
            icon: Package,
            gradient: 'from-emerald-500 to-lime-600',
            bgGradient: 'from-emerald-50 to-lime-50',
            iconBg: 'bg-emerald-500',
            change: 'Tracked',
            changeType: 'neutral'
        },
        ...(!isVendor ? [{
            title: 'Low Stock Items',
            value: stats?.low_stock_products?.length || 0,
            icon: AlertTriangle,
            gradient: 'from-rose-500 to-pink-600',
            bgGradient: 'from-rose-50 to-pink-50',
            iconBg: 'bg-rose-500',
            change: 'Needs attention',
            changeType: 'negative'
        }] : [])
    ];

    const getStatusColor = (status) => {
        const colors = {
            delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
            confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50">
                    {['daily', 'monthly', 'yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-5 py-2.5 rounded-xl font-medium capitalize text-sm transition-all duration-200 ${
                                period === p
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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

            {/* Charts Section */}
            {/* Status Cards - Order counts by status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* All Products */}
                {!isVendor && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="text-center">
                            <Package className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                            <p className="text-emerald-600 text-sm font-semibold">All Products</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats?.products?.total || 0}</p>
                        </div>
                    </div>
                )}
                {/* New Orders */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-center">
                        <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-blue-600 text-sm font-semibold">New</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{stats?.orders?.pending || 0}</p>
                    </div>
                </div>
                {/* Delivered Orders */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-center">
                        <Package className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-emerald-600 text-sm font-semibold">Delivered</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">{stats?.orders?.delivered || 0}</p>
                    </div>
                </div>
                {/* Confirmed Orders */}
                <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                    <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                        <p className="text-cyan-600 text-sm font-semibold">Confirmed</p>
                        <p className="text-2xl font-bold text-cyan-900 mt-1">{stats?.orders?.confirmed || 0}</p>
                    </div>
                </div>
                {/* In Delivery */}
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="text-center">
                        <Package className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-indigo-600 text-sm font-semibold">In Delivery</p>
                        <p className="text-2xl font-bold text-indigo-900 mt-1">{stats?.orders?.shipped || 0}</p>
                    </div>
                </div>
                {/* Returned Orders */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="text-center">
                        <ArrowDownRight className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-orange-600 text-sm font-semibold">Returned</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">{stats?.orders?.returned || 0}</p>
                    </div>
                </div>
                {/* Refused Orders */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="text-center">
                        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="text-red-600 text-sm font-semibold">Refused</p>
                        <p className="text-2xl font-bold text-red-900 mt-1">{stats?.orders?.refused || 0}</p>
                    </div>
                </div>
                {/* Cancelled Orders */}
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                    <div className="text-center">
                        <X className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                        <p className="text-rose-600 text-sm font-semibold">Cancelled</p>
                        <p className="text-2xl font-bold text-rose-900 mt-1">{stats?.orders?.cancelled || 0}</p>
                    </div>
                </div>
                {/* Waiting Confirmation */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-center">
                        <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        <p className="text-amber-600 text-sm font-semibold">Waiting</p>
                        <p className="text-2xl font-bold text-amber-900 mt-1">0</p>
                    </div>
                </div>
                {/* Cancelled Shipping */}
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                    <div className="text-center">
                        <X className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                        <p className="text-pink-600 text-sm font-semibold">Cancelled Shipping</p>
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
                            <h3 className="text-lg font-semibold text-slate-800">Sales Overview</h3>
                            <p className="text-sm text-slate-500 mt-1">Revenue trends over time</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-slate-600">Sales</span>
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
                            <h3 className="text-lg font-semibold text-slate-800">Orders Overview</h3>
                            <p className="text-sm text-slate-500 mt-1">Order volume analysis</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600">Orders</span>
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
                            <h3 className="text-lg font-semibold text-slate-800">Confirmation Rate</h3>
                            <p className="text-sm text-slate-500 mt-1">Percent of orders that reached a confirmed status for the selected period.</p>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                            <div>
                                <p className="text-lg font-semibold text-slate-800">{formatRate(confirmationRate)}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Current</p>
                            </div>
                            <span className="flex items-center space-x-1.5 text-sm text-slate-600">
                                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                                <span>Confirmation</span>
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
                            <h3 className="text-lg font-semibold text-slate-800">Delivery Rate</h3>
                            <p className="text-sm text-slate-500 mt-1">Percentage of orders successfully delivered during the chosen timeline.</p>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                            <div>
                                <p className="text-lg font-semibold text-slate-800">{formatRate(deliveryRate)}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Current</p>
                            </div>
                            <span className="flex items-center space-x-1.5 text-sm text-slate-600">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span>Delivery</span>
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
                            <h3 className="text-lg font-semibold text-slate-800">Low Stock Alerts</h3>
                            <p className="text-sm text-slate-500">{stats.low_stock_products.length} products need restocking</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden border border-rose-100">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">Product</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">SKU</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">Current Stock</th>
                                    <th className="text-left py-4 px-5 text-sm font-semibold text-slate-600">Min Stock</th>
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
                            <h3 className="text-lg font-semibold text-slate-800">Top Sellers</h3>
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
                                                <p className="text-xs text-slate-500">{vendor.products_count || 0} products</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-orange-600 text-sm">{formatCurrency(parseFloat(vendor.total_sales) || 0)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 py-4 text-sm">No seller data available</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Sellers Stats - Hidden from vendors */}
                {!isVendor && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Sellers</h3>
                            <Store className="text-purple-500" size={24} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Total Sellers</span>
                                <span className="text-lg font-bold text-slate-800">{stats?.vendors?.total || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Active Sellers</span>
                                <span className="text-lg font-bold text-emerald-600">{stats?.vendors?.active || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Total Commission</span>
                                <span className="text-lg font-bold text-purple-600">{formatCurrency(parseFloat(stats?.vendors?.total_commission) || 0)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Products</h3>
                        <Package className="text-indigo-500" size={24} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Total Products</span>
                            <span className="text-lg font-bold text-slate-800">{stats?.products?.total || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Active Products</span>
                            <span className="text-lg font-bold text-emerald-600">{stats?.products?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Out of Stock</span>
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
                                <h3 className="text-lg font-semibold text-slate-800">Top Selling Products</h3>
                                <p className="text-sm text-slate-500 mt-1">Best performers this period</p>
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
                                            <p className="text-xs text-slate-500">units sold</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">No sales data available</p>
                        )}
                    </div>
                </div>

                {/* Top Clients - Hidden from vendors */}
                {!isVendor && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800">Top Clients</h3>
                                    <p className="text-sm text-slate-500 mt-1">Highest spending customers</p>
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
                                                    <p className="text-sm text-slate-500">{client.order_count} orders</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800">{formatCurrency(parseFloat(client.total_spent) || 0)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 py-8">No client data available</p>
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
                            <h3 className="text-lg font-semibold text-slate-800">Recent Orders</h3>
                            <p className="text-sm text-slate-500 mt-1">Latest customer orders</p>
                        </div>
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                            <span>View All</span>
                            <ArrowUpRight size={16} />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Order #</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Client</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Total</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Date</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Action</th>
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
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Eye size={18} />
                                        </button>
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
