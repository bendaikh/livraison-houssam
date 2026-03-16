import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { isAdminRole, isConfirmationAgentRole } from '../../utils/roles';

export default function ConfirmationAgentBilling() {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const [billings, setBillings] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7),
        user_id: '',
    });

    const isAdmin = isAdminRole(user?.role?.slug);
    const canView = isAdmin || isConfirmationAgentRole(user?.role?.slug);

    const fetchBillings = async () => {
        if (!canView) return;

        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.month) params.append('month', `${filters.month}-01`);
            if (isAdmin && filters.user_id) params.append('user_id', filters.user_id);

            const response = await api.get(`/confirmation-billings?${params.toString()}`);
            setBillings(response.data || []);
        } catch (error) {
            console.error('Error fetching confirmation billings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        if (!isAdmin) return;

        try {
            const response = await api.get('/confirmation-agents');
            setAgents(response.data || []);
        } catch (error) {
            console.error('Error fetching confirmation agents:', error);
        }
    };

    useEffect(() => {
        fetchBillings();
    }, [filters.month, filters.user_id, canView]);

    useEffect(() => {
        fetchAgents();
    }, [isAdmin]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            await api.post('/confirmation-billings/generate', {
                month: filters.month ? `${filters.month}-01` : undefined,
                user_id: filters.user_id || undefined,
            });
            await fetchBillings();
        } catch (error) {
            console.error('Error generating billing:', error);
            alert('Failed to generate billing report.');
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkPaid = async (billingId) => {
        try {
            await api.patch(`/confirmation-billings/${billingId}/mark-paid`);
            await fetchBillings();
        } catch (error) {
            console.error('Error marking billing as paid:', error);
            alert('Failed to mark invoice as paid.');
        }
    };

    const summary = useMemo(() => {
        return billings.reduce((acc, billing) => {
            acc.total += Number(billing.total_amount || 0);
            acc.delivered += Number(billing.delivered_orders_count || 0);
            acc.pending += billing.paid_at ? 0 : Number(billing.total_amount || 0);
            return acc;
        }, { total: 0, delivered: 0, pending: 0 });
    }, [billings]);

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-900">Confirmation Billing</h1>
                <p className="text-slate-500 mt-2">You do not have access to this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Confirmation Billing</h1>
                    <p className="text-slate-500 mt-1">
                        {isAdmin ? 'Generate invoices and mark them as paid.' : 'Track your monthly invoices and commission.'}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Invoice'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Delivered Orders</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{summary.delivered}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Invoice Total</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(summary.total)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">Unpaid Balance</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{formatCurrency(summary.pending)}</p>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent</label>
                            <select
                                value={filters.user_id}
                                onChange={(event) => setFilters((prev) => ({ ...prev, user_id: event.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                            >
                                <option value="">All confirmation agents</option>
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
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
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Agent</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Delivered</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Commission</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                            {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">Loading invoices...</td>
                            </tr>
                        ) : billings.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">No invoices found for this period.</td>
                            </tr>
                        ) : billings.map((billing) => (
                            <tr key={billing.id}>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{billing.user?.name || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {new Date(billing.period_start).toLocaleDateString()} - {new Date(billing.period_end).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{billing.delivered_orders_count}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(billing.commission_per_order)}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatCurrency(billing.total_amount)}</td>
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
