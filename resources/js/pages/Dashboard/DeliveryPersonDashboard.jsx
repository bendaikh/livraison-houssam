import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CheckCircle, PhoneOff, Ban, Package, Landmark, Coins, CalendarDays, RotateCcw } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { appPath } from '../../constants/appPaths';

export default function DeliveryPersonDashboard({ stats, period, setPeriod }) {
    const { formatCurrency } = useSettings();
    const [isDarkMode, setIsDarkMode] = useState(() => (
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ));

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setIsDarkMode(root.classList.contains('dark'));
        });

        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const daily = stats?.delivery_person?.today || {};
    const finance = stats?.delivery_person?.finance || {};
    const todoToday = stats?.delivery_person?.todo_today || [];
    const latestInvoice = stats?.delivery_person?.latest_invoice;

    const surfaceCardClass = isDarkMode
        ? 'rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-lg shadow-black/10'
        : 'rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm';
    const statCardClass = isDarkMode
        ? 'rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/10'
        : 'rounded-2xl border border-slate-200 bg-white p-5';
    const insetCardClass = isDarkMode
        ? 'rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3'
        : 'rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3';
    const rowCardClass = isDarkMode
        ? 'flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3'
        : 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';
    const emptyStateClass = isDarkMode
        ? 'rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400'
        : 'rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500';
    const chartTickColor = isDarkMode ? '#94a3b8' : '#64748b';
    const chartGridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const tooltipStyle = {
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
        borderRadius: '14px',
        color: isDarkMode ? '#e2e8f0' : '#0f172a',
        boxShadow: isDarkMode ? '0 12px 32px rgba(2, 6, 23, 0.35)' : '0 12px 32px rgba(15, 23, 42, 0.08)',
    };

    const cards = [
        {
            label: 'Delivered',
            value: stats?.orders?.delivered || 0,
            icon: CheckCircle,
            tone: isDarkMode ? 'border-emerald-900 bg-emerald-950/50 text-emerald-200' : 'border-emerald-100 bg-emerald-50 text-emerald-700',
        },
        {
            label: 'No Response',
            value: stats?.orders?.no_response || 0,
            icon: PhoneOff,
            tone: isDarkMode ? 'border-amber-900 bg-amber-950/50 text-amber-200' : 'border-amber-100 bg-amber-50 text-amber-700',
        },
        {
            label: 'Refused / Cancelled',
            value: stats?.orders?.refused_cancelled || 0,
            icon: Ban,
            tone: isDarkMode ? 'border-rose-900 bg-rose-950/50 text-rose-200' : 'border-rose-100 bg-rose-50 text-rose-700',
        },
        {
            label: 'Returned',
            value: stats?.orders?.returned || 0,
            icon: RotateCcw,
            tone: isDarkMode ? 'border-fuchsia-900 bg-fuchsia-950/50 text-fuchsia-200' : 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700',
        },
        {
            label: 'Active Assigned',
            value: stats?.orders?.active_assigned || 0,
            icon: Package,
            tone: isDarkMode ? 'border-cyan-900 bg-cyan-950/50 text-cyan-200' : 'border-cyan-100 bg-cyan-50 text-cyan-700',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Delivery Dashboard</h1>
                    <p className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assigned orders, callbacks, and cash reconciliation.</p>
                </div>
                <div className={isDarkMode ? 'flex items-center rounded-2xl border border-slate-800 bg-slate-900/80 p-1.5 shadow-lg shadow-black/10' : 'flex items-center rounded-2xl border border-slate-200/50 bg-white p-1.5 shadow-sm'}>
                    {['daily', 'monthly', 'yearly'].map((value) => (
                        <button
                            key={value}
                            onClick={() => setPeriod(value)}
                            className={`px-5 py-2.5 rounded-xl font-medium capitalize text-sm transition-all duration-200 ${
                                period === value
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                                    : isDarkMode
                                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collected Today</p>
                    <p className={`mt-2 text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(daily.collected || 0)}</p>
                </div>
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due To Admin Today</p>
                    <p className="mt-2 text-3xl font-bold text-amber-500">{formatCurrency(daily.due_to_admin || 0)}</p>
                </div>
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Earnings Today</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-500">{formatCurrency(daily.earnings || 0)}</p>
                </div>
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unpaid Collected</p>
                    <p className={`mt-2 text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(finance.unpaid_collected || 0)}</p>
                </div>
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unpaid Due To Admin</p>
                    <p className="mt-2 text-3xl font-bold text-amber-500">{formatCurrency(finance.unpaid_due_to_admin || 0)}</p>
                </div>
                <div className={statCardClass}>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unpaid Earnings</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-500">{formatCurrency(finance.unpaid_earnings || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {cards.map((card) => (
                    <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
                        <div className="flex items-center justify-between">
                            <card.icon size={22} />
                            <span className="text-2xl font-bold">{card.value}</span>
                        </div>
                        <p className="mt-4 text-sm font-semibold">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className={surfaceCardClass}>
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Delivery Trend</h3>
                            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assigned orders, delivered orders, and callbacks.</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stats?.charts || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDarkMode ? 'rgba(51, 65, 85, 0.22)' : 'rgba(226, 232, 240, 0.35)' }} />
                            <Bar dataKey="assigned" fill="#f97316" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="delivered" fill="#16a34a" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="callbacks" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={surfaceCardClass}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Today&apos;s Callbacks</h3>
                            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Orders that must reappear in today&apos;s task list.</p>
                        </div>
                        <Link to={`${appPath('/orders')}?todo=today`} className="text-sm font-semibold text-orange-500 hover:text-orange-400">
                            Open orders
                        </Link>
                    </div>
                    <div className="mt-5 space-y-3">
                        {todoToday.length === 0 ? (
                            <div className={emptyStateClass}>
                                No delivery callbacks due today.
                            </div>
                        ) : todoToday.map((order) => (
                            <div key={order.id} className={isDarkMode ? 'rounded-xl border border-slate-800 bg-slate-950/60 p-4' : 'rounded-xl border border-slate-200 p-4'}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{order.order_number}</p>
                                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{order.client?.name || 'Client'} • {order.client?.phone || '-'}</p>
                                    </div>
                                    <span className={isDarkMode ? 'inline-flex items-center gap-1 rounded-full bg-amber-950/70 px-2.5 py-1 text-xs font-semibold text-amber-200' : 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'}>
                                        <CalendarDays size={14} />
                                        {order.callback_date ? new Date(order.callback_date).toLocaleDateString() : 'Today'}
                                    </span>
                                </div>
                                <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{order.delivery_status_note || 'No motif added yet.'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className={surfaceCardClass}>
                    <div className="flex items-center gap-3">
                        <div className={isDarkMode ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-950/70 text-amber-300' : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700'}>
                            <Landmark size={22} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Latest Invoice</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Daily billing generated for your delivered orders.</p>
                        </div>
                    </div>

                    {latestInvoice ? (
                        <div className={`mt-5 ${insetCardClass}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Date</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{new Date(latestInvoice.period_start).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Delivered orders</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{latestInvoice.total_orders}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collected</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatCurrency(latestInvoice.total_collected)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Commission</span>
                                <span className="font-semibold text-emerald-500">{formatCurrency(latestInvoice.total_commission)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due to admin</span>
                                <span className="text-lg font-bold text-amber-500">{formatCurrency(latestInvoice.total_due_to_admin)}</span>
                            </div>
                            <div className="pt-2">
                                <span className={latestInvoice.paid_at
                                    ? (isDarkMode ? 'inline-flex items-center rounded-full bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-200' : 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700')
                                    : (isDarkMode ? 'inline-flex items-center rounded-full bg-amber-950/70 px-3 py-1 text-xs font-semibold text-amber-200' : 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700')
                                }>
                                    {latestInvoice.paid_at ? 'Paid' : 'Pending payment'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={`mt-5 ${emptyStateClass}`}>
                            No invoice has been generated yet for your account.
                        </div>
                    )}
                </div>

                <div className={surfaceCardClass}>
                    <div className="flex items-center gap-3">
                        <div className={isDarkMode ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/70 text-emerald-300' : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'}>
                            <Coins size={22} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>All-Time Finance</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Delivered cash split between you and admin.</p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-3">
                        <div className={rowCardClass}>
                            <span className={isDarkMode ? 'font-medium text-slate-300' : 'font-medium text-slate-700'}>Total collected</span>
                            <span className={isDarkMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-slate-900'}>{formatCurrency(finance.all_time_collected || 0)}</span>
                        </div>
                        <div className={rowCardClass}>
                            <span className={isDarkMode ? 'font-medium text-slate-300' : 'font-medium text-slate-700'}>Amount to give admin</span>
                            <span className="text-lg font-bold text-amber-500">{formatCurrency(finance.all_time_due_to_admin || 0)}</span>
                        </div>
                        <div className={rowCardClass}>
                            <span className={isDarkMode ? 'font-medium text-slate-300' : 'font-medium text-slate-700'}>Your earnings</span>
                            <span className="text-lg font-bold text-emerald-500">{formatCurrency(finance.all_time_earnings || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
