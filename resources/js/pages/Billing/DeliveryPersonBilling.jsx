import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { isAdminRole, isDeliveryPersonRole } from '../../utils/roles';

export default function DeliveryPersonBilling() {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const [billings, setBillings] = useState([]);
    const [deliveryPeople, setDeliveryPeople] = useState([]);
    const [expandedBillingIds, setExpandedBillingIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7),
        delivery_person_id: '',
    });

    const isAdmin = isAdminRole(user?.role?.slug);
    const canView = isAdmin || isDeliveryPersonRole(user?.role?.slug);

    const fetchBillings = async () => {
        if (!canView) return;

        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.month) params.append('month', `${filters.month}-01`);
            if (isAdmin && filters.delivery_person_id) params.append('delivery_person_id', filters.delivery_person_id);

            const response = await api.get(`/delivery-billings?${params.toString()}`);
            setBillings(response.data || []);
        } catch (error) {
            console.error('Error fetching delivery billings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveryPeople = async () => {
        if (!isAdmin) return;

        try {
            const response = await api.get('/delivery-persons');
            setDeliveryPeople(response.data || []);
        } catch (error) {
            console.error('Error fetching delivery people:', error);
        }
    };

    useEffect(() => {
        fetchBillings();
    }, [filters.month, filters.delivery_person_id, canView]);

    useEffect(() => {
        fetchDeliveryPeople();
    }, [isAdmin]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            await api.post('/delivery-billings/generate', {
                month: filters.month ? `${filters.month}-01` : undefined,
                delivery_person_id: filters.delivery_person_id || undefined,
            });
            await fetchBillings();
        } catch (error) {
            console.error('Error generating delivery billing:', error);
            alert('Failed to generate delivery invoice.');
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkPaid = async (billingId) => {
        try {
            await api.patch(`/delivery-billings/${billingId}/mark-paid`);
            await fetchBillings();
        } catch (error) {
            console.error('Error marking delivery billing as paid:', error);
            alert('Failed to mark invoice as paid.');
        }
    };

    const visibleBillings = useMemo(() => (
        billings.filter((billing) => Number(billing.total_orders || 0) > 0)
    ), [billings]);

    const summary = useMemo(() => {
        return visibleBillings.reduce((acc, billing) => {
            acc.orders += Number(billing.total_orders || 0);
            acc.collected += Number(billing.total_collected || 0);
            acc.commission += Number(billing.total_commission || 0);
            acc.due += Number(billing.total_due_to_admin || 0);
            acc.pending += billing.paid_at ? 0 : Number(billing.total_due_to_admin || 0);
            return acc;
        }, { orders: 0, collected: 0, commission: 0, due: 0, pending: 0 });
    }, [visibleBillings]);

    const toggleBillingDetails = (billingId) => {
        setExpandedBillingIds((prev) => (
            prev.includes(billingId)
                ? prev.filter((id) => id !== billingId)
                : [...prev, billingId]
        ));
    };

    if (isAdmin) {
        return <Navigate to="/billing?role=delivery" replace />;
    }

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-900">Delivery Billing</h1>
                <p className="text-slate-500 mt-2">You do not have access to this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Delivery Billing</h1>
                    <p className="text-slate-500 mt-1">
                        {isAdmin ? 'Track daily delivery invoices and lock orders after payment.' : 'Track your daily invoices and payout status.'}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Daily Invoices'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Delivered Orders</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{summary.orders}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Collected</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(summary.collected)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Commission</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{formatCurrency(summary.commission)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Due To Admin</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{formatCurrency(summary.due)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Unpaid Balance</p>
                    <p className="text-3xl font-bold text-rose-700 mt-2">{formatCurrency(summary.pending)}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
                        <input
                            type="month"
                            value={filters.month}
                            onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                        />
                    </div>
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery person</label>
                            <select
                                value={filters.delivery_person_id}
                                onChange={(event) => setFilters((prev) => ({ ...prev, delivery_person_id: event.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                            >
                                <option value="">All delivery people</option>
                                {deliveryPeople.map((person) => (
                                    <option key={person.id} value={person.id}>{person.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery Person</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Orders</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Collected</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Commission</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Due Admin</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                            {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-slate-500">Loading invoices...</td>
                            </tr>
                        ) : visibleBillings.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-slate-500">No invoices found for this period.</td>
                            </tr>
                        ) : visibleBillings.map((billing) => {
                            const isExpanded = expandedBillingIds.includes(billing.id);
                            const deliveredOrders = billing.orders || [];

                            return (
                                <React.Fragment key={billing.id}>
                                    <tr>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{billing.delivery_person?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(billing.period_start).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <button
                                                type="button"
                                                onClick={() => toggleBillingDetails(billing.id)}
                                                className="inline-flex items-center gap-2 font-semibold text-slate-800 hover:text-slate-950"
                                            >
                                                <span>{billing.total_orders}</span>
                                                <span className="text-xs text-slate-500">
                                                    {isExpanded ? 'Hide orders' : 'Show orders'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(billing.total_collected)}</td>
                                        <td className="px-6 py-4 text-sm text-emerald-700 font-semibold">{formatCurrency(billing.total_commission)}</td>
                                        <td className="px-6 py-4 text-sm text-amber-700 font-semibold">{formatCurrency(billing.total_due_to_admin)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                billing.paid_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {billing.paid_at ? 'Paid' : 'Pending'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                {!billing.paid_at && (
                                                    <button
                                                        onClick={() => handleMarkPaid(billing.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={isAdmin ? 8 : 7} className="px-6 py-5">
                                                {deliveredOrders.length === 0 ? (
                                                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                                        No delivered orders are attached to this invoice yet.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {deliveredOrders.map((order) => (
                                                            <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
                                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                                    <div>
                                                                        <p className="font-semibold text-slate-900">{order.order_number}</p>
                                                                        <p className="text-sm text-slate-500">
                                                                            {order.client?.name || 'Client'} • {order.client?.phone || '-'}
                                                                        </p>
                                                                        <p className="text-xs text-slate-400 mt-1">
                                                                            Delivered {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '-'}
                                                                        </p>
                                                                        {order.confirmation_agent?.name && (
                                                                            <p className="text-xs text-slate-500 mt-1">
                                                                                Confirmation agent: {order.confirmation_agent.name}
                                                                            </p>
                                                                        )}
                                                                        {order.delivery_status_note && (
                                                                            <p className="mt-2 text-sm text-rose-700 whitespace-pre-wrap">
                                                                                Motif: {order.delivery_status_note}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full lg:min-w-[420px]">
                                                                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                                            <p className="text-xs text-slate-500">Collected</p>
                                                                            <p className="font-semibold text-slate-900">{formatCurrency(order.collected_amount || 0)}</p>
                                                                        </div>
                                                                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                                                                            <p className="text-xs text-emerald-600">Commission</p>
                                                                            <p className="font-semibold text-emerald-700">{formatCurrency(order.delivery_person_commission || 0)}</p>
                                                                        </div>
                                                                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                                                                            <p className="text-xs text-amber-600">Due to admin</p>
                                                                            <p className="font-semibold text-amber-700">{formatCurrency(order.amount_due_to_admin || 0)}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
