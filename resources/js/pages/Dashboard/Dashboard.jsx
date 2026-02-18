import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package, Users, ArrowUpRight, ArrowDownRight, Eye, Clock, CheckCircle, Store, UserPlus, TrendingDown } from 'lucide-react';

export default function Dashboard() {
    const { formatCurrency } = useSettings();
    const [period, setPeriod] = useState('daily');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get(`/dashboard?period=${period}`);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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
            title: 'Low Stock Items',
            value: stats?.low_stock_products?.length || 0,
            icon: AlertTriangle,
            gradient: 'from-rose-500 to-pink-600',
            bgGradient: 'from-rose-50 to-pink-50',
            iconBg: 'bg-rose-500',
            change: 'Needs attention',
            changeType: 'negative'
        },
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
                        <AreaChart data={stats?.charts || []}>
                            <defs>
                                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                    padding: '12px 16px'
                                }} 
                            />
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
                        <BarChart data={stats?.charts || []} barSize={40}>
                            <defs>
                                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                                    <stop offset="95%" stopColor="#059669" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                    padding: '12px 16px'
                                }} 
                            />
                            <Bar dataKey="orders" fill="url(#ordersGradient)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Low Stock Alert */}
            {stats?.low_stock_products?.length > 0 && (
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
                {/* Clients Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Clients</h3>
                        <Users className="text-blue-500" size={24} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Total Clients</span>
                            <span className="text-lg font-bold text-slate-800">{stats?.clients?.total || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">New This Period</span>
                            <span className="text-lg font-bold text-emerald-600">{stats?.clients?.new || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Active Clients</span>
                            <span className="text-lg font-bold text-blue-600">{stats?.clients?.active || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Vendors Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Vendors</h3>
                        <Store className="text-purple-500" size={24} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Total Vendors</span>
                            <span className="text-lg font-bold text-slate-800">{stats?.vendors?.total || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Active Vendors</span>
                            <span className="text-lg font-bold text-emerald-600">{stats?.vendors?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Total Commission</span>
                            <span className="text-lg font-bold text-purple-600">{formatCurrency(parseFloat(stats?.vendors?.total_commission) || 0)}</span>
                        </div>
                    </div>
                </div>

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

                {/* Top Clients */}
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
