import React from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CheckCircle, Clock, Package, Truck, XCircle, Wallet, CalendarDays, PhoneCall } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { appPath } from '../../constants/appPaths';

export default function ConfirmationAgentDashboard({ stats, period, setPeriod }) {
    const { formatCurrency } = useSettings();
    const daily = stats?.confirmation_agent?.today || {};
    const commission = stats?.confirmation_agent?.commission || {};
    const todoToday = stats?.confirmation_agent?.todo_today || [];
    const latestInvoice = stats?.confirmation_agent?.latest_invoice;

    const cards = [
        { label: 'Confirmed', value: stats?.orders?.confirmed || 0, icon: CheckCircle, tone: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
        { label: 'In Progress', value: stats?.orders?.in_progress || 0, icon: Clock, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
        { label: 'Shipped', value: stats?.orders?.shipped || 0, icon: Truck, tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
        { label: 'Delivered', value: stats?.orders?.delivered || 0, icon: Package, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
        { label: 'Cancelled', value: stats?.orders?.cancelled || 0, icon: XCircle, tone: 'text-rose-700 bg-rose-50 border-rose-100' },
        { label: 'Refused', value: stats?.orders?.refused || 0, icon: XCircle, tone: 'text-orange-700 bg-orange-50 border-orange-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Confirmation Dashboard</h1>
                    <p className="text-slate-500 mt-1">Your assigned orders, callbacks, and earnings.</p>
                </div>
                <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50">
                    {['daily', 'monthly', 'yearly'].map((value) => (
                        <button
                            key={value}
                            onClick={() => setPeriod(value)}
                            className={`px-5 py-2.5 rounded-xl font-medium capitalize text-sm transition-all duration-200 ${
                                period === value
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Delivered Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{daily.delivered || 0}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Earnings Today</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{formatCurrency(daily.earnings || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Current Month Commission</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(commission.current_month_total || 0)}</p>
                    <p className="text-xs text-slate-500 mt-2">
                        {commission.current_month_delivered || 0} delivered x {formatCurrency(commission.per_order || 0)}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                        Unpaid: {formatCurrency(commission.current_month_unpaid_total || 0)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
                        <div className="flex items-center justify-between">
                            <card.icon size={22} />
                            <span className="text-2xl font-bold">{card.value}</span>
                        </div>
                        <p className="text-sm font-semibold mt-4">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Performance Trend</h3>
                            <p className="text-sm text-slate-500 mt-1">Assigned orders, delivered orders, and callbacks.</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stats?.charts || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#0f766e" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="delivered" fill="#16a34a" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="callbacks" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Today&apos;s Follow-Ups</h3>
                            <p className="text-sm text-slate-500 mt-1">Orders due today or overdue.</p>
                        </div>
                        <Link to={`${appPath('/orders')}?todo=today`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                            Open orders
                        </Link>
                    </div>
                    <div className="mt-5 space-y-3">
                        {todoToday.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                No follow-up calls due today.
                            </div>
                        ) : todoToday.map((order) => (
                            <div key={order.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-800">{order.order_number}</p>
                                        <p className="text-sm text-slate-500">{order.client?.name || 'Client'} • {order.client?.phone || '-'}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                                        <CalendarDays size={14} />
                                        {order.callback_date ? new Date(order.callback_date).toLocaleDateString() : 'Today'}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="text-slate-500">{order.city || order.client?.city || '-'}</span>
                                    <Link to={appPath(`/orders/${order.id}/edit`)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800">
                                        <PhoneCall size={14} />
                                        Open workflow
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Wallet size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Invoice Snapshot</h3>
                            <p className="text-sm text-slate-500">Latest generated monthly billing report.</p>
                        </div>
                    </div>

                    {latestInvoice ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Period</span>
                                <span className="font-semibold text-slate-800">
                                    {new Date(latestInvoice.period_start).toLocaleDateString()} - {new Date(latestInvoice.period_end).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Delivered</span>
                                <span className="font-semibold text-slate-800">{latestInvoice.delivered_orders_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Commission / order</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(latestInvoice.commission_per_order)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Total</span>
                                <span className="text-lg font-bold text-emerald-700">{formatCurrency(latestInvoice.total_amount)}</span>
                            </div>
                            <div className="pt-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    latestInvoice.paid_at
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {latestInvoice.paid_at ? 'Paid' : 'Pending payment'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                            No invoice has been generated yet for your account.
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <h3 className="text-lg font-semibold text-slate-800">Order Sources</h3>
                    <p className="text-sm text-slate-500 mt-1">Assigned order mix for the selected period.</p>
                    <div className="mt-5 space-y-3">
                        {(stats?.orders?.by_source || []).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                No source data in this period.
                            </div>
                        ) : (stats.orders.by_source || []).map((row) => (
                            <div key={row.source} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                                <span className="font-medium text-slate-700 capitalize">{String(row.source).replace('_', ' ')}</span>
                                <span className="text-lg font-bold text-slate-900">{row.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
