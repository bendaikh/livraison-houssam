import React from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CheckCircle, PhoneOff, Ban, Package, Landmark, Coins, CalendarDays } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export default function DeliveryPersonDashboard({ stats, period, setPeriod }) {
    const { formatCurrency } = useSettings();
    const daily = stats?.delivery_person?.today || {};
    const finance = stats?.delivery_person?.finance || {};
    const todoToday = stats?.delivery_person?.todo_today || [];
    const latestInvoice = stats?.delivery_person?.latest_invoice;

    const cards = [
        { label: 'Delivered', value: stats?.orders?.delivered || 0, icon: CheckCircle, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
        { label: 'No Response', value: stats?.orders?.no_response || 0, icon: PhoneOff, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
        { label: 'Refused / Cancelled', value: stats?.orders?.refused_cancelled || 0, icon: Ban, tone: 'text-rose-700 bg-rose-50 border-rose-100' },
        { label: 'Active Assigned', value: stats?.orders?.active_assigned || 0, icon: Package, tone: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Delivery Dashboard</h1>
                    <p className="text-slate-500 mt-1">Assigned orders, callbacks, and cash reconciliation.</p>
                </div>
                <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50">
                    {['daily', 'monthly', 'yearly'].map((value) => (
                        <button
                            key={value}
                            onClick={() => setPeriod(value)}
                            className={`px-5 py-2.5 rounded-xl font-medium capitalize text-sm transition-all duration-200 ${
                                period === value
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Collected Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(daily.collected || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Due To Admin Today</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{formatCurrency(daily.due_to_admin || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Earnings Today</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{formatCurrency(daily.earnings || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Unpaid Collected</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(finance.unpaid_collected || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Unpaid Due To Admin</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{formatCurrency(finance.unpaid_due_to_admin || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Unpaid Earnings</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{formatCurrency(finance.unpaid_earnings || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <h3 className="text-lg font-semibold text-slate-800">Delivery Trend</h3>
                            <p className="text-sm text-slate-500 mt-1">Assigned orders, delivered orders, and callbacks.</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stats?.charts || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="assigned" fill="#f97316" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="delivered" fill="#16a34a" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="callbacks" fill="#0f766e" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Today&apos;s Callbacks</h3>
                            <p className="text-sm text-slate-500 mt-1">Orders that must reappear in today&apos;s task list.</p>
                        </div>
                        <Link to="/orders?todo=today" className="text-sm font-semibold text-orange-700 hover:text-orange-800">
                            Open orders
                        </Link>
                    </div>
                    <div className="mt-5 space-y-3">
                        {todoToday.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                No delivery callbacks due today.
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
                                <p className="mt-3 text-sm text-slate-600">{order.delivery_status_note || 'No motif added yet.'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                            <Landmark size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Latest Invoice</h3>
                            <p className="text-sm text-slate-500">Daily billing generated for your delivered orders.</p>
                        </div>
                    </div>

                    {latestInvoice ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Date</span>
                                <span className="font-semibold text-slate-800">{new Date(latestInvoice.period_start).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Delivered orders</span>
                                <span className="font-semibold text-slate-800">{latestInvoice.total_orders}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Collected</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(latestInvoice.total_collected)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Commission</span>
                                <span className="font-semibold text-emerald-700">{formatCurrency(latestInvoice.total_commission)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Due to admin</span>
                                <span className="text-lg font-bold text-amber-700">{formatCurrency(latestInvoice.total_due_to_admin)}</span>
                            </div>
                            <div className="pt-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    latestInvoice.paid_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Coins size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">All-Time Finance</h3>
                            <p className="text-sm text-slate-500">Delivered cash split between you and admin.</p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                            <span className="font-medium text-slate-700">Total collected</span>
                            <span className="text-lg font-bold text-slate-900">{formatCurrency(finance.all_time_collected || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                            <span className="font-medium text-slate-700">Amount to give admin</span>
                            <span className="text-lg font-bold text-amber-700">{formatCurrency(finance.all_time_due_to_admin || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                            <span className="font-medium text-slate-700">Your earnings</span>
                            <span className="text-lg font-bold text-emerald-700">{formatCurrency(finance.all_time_earnings || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
