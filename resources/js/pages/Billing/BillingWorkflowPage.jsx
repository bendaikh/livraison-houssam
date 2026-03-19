import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
    isAdminRole,
    isConfirmationAgentRole,
    isDeliveryPersonRole,
    isVendorRole,
} from '../../utils/roles';
import {
    ArrowRightLeft,
    Banknote,
    CheckCircle2,
    Clock3,
    Coins,
    Landmark,
    PackageCheck,
    RefreshCcw,
    Store,
    Truck,
    UserRoundCheck,
    Wallet,
} from 'lucide-react';

const WORKFLOWS = {
    delivery: {
        title: 'Delivery Billing',
        subtitle: 'Cash collection and return to admin',
        description: 'Track collected cash, delivery commission, and the balance that must be returned to admin.',
        tone: 'blue',
        entityLabel: 'Delivery person',
        emptyEntityLabel: 'All delivery people',
        openTitle: 'Open Cash Returns',
        openDescription: 'Delivery cash still pending settlement with admin.',
        paidTitle: 'Paid History',
        paidDescription: 'Settled delivery billing records kept as history.',
    },
    confirmation: {
        title: 'Confirmation Billing',
        subtitle: 'Salary per delivered order',
        description: 'Track delivered orders, commission per order, and salary invoices for confirmation agents.',
        tone: 'emerald',
        entityLabel: 'Confirmation agent',
        emptyEntityLabel: 'All confirmation agents',
        openTitle: 'Pending Salaries',
        openDescription: 'Confirmation salaries that still need to be paid.',
        paidTitle: 'Paid History',
        paidDescription: 'Paid salary invoices for confirmation agents.',
    },
    seller: {
        title: 'Seller Billing',
        subtitle: 'Revenue, profit, and payouts',
        description: 'Track seller revenue, profit after platform commission, pending payouts, and invoice history.',
        tone: 'orange',
        entityLabel: 'Seller',
        emptyEntityLabel: 'All sellers',
        openTitle: 'Pending Payouts',
        openDescription: 'Seller invoices that still need to be paid out.',
        paidTitle: 'Paid Invoices History',
        paidDescription: 'Payouts that have already been settled.',
    },
};

const EMPTY_DASHBOARD = {
    filters: {
        month: '',
        role: null,
        entity_id: null,
    },
    summary: {
        total_invoices: 0,
        open_invoices: 0,
        paid_invoices: 0,
        pending_payout_total: 0,
        pending_collection_total: 0,
        paid_total: 0,
        role_totals: {},
    },
    unpaid: [],
    paid: [],
};

function sumAmount(records, key) {
    return records.reduce((total, record) => total + Number(record[key] || 0), 0);
}

function getToneClasses(tone) {
    return {
        blue: {
            card: 'bg-blue-50 text-blue-800 border-blue-200',
            button: 'bg-blue-600 hover:bg-blue-700',
        },
        emerald: {
            card: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            button: 'bg-emerald-600 hover:bg-emerald-700',
        },
        orange: {
            card: 'bg-orange-50 text-orange-800 border-orange-200',
            button: 'bg-orange-600 hover:bg-orange-700',
        },
    }[tone];
}

function getDefaultBillingPath(roleSlug) {
    if (isAdminRole(roleSlug) || isVendorRole(roleSlug)) {
        return '/billing/sellers';
    }

    if (isDeliveryPersonRole(roleSlug)) {
        return '/billing/delivery';
    }

    if (isConfirmationAgentRole(roleSlug)) {
        return '/billing/confirmation';
    }

    return null;
}

export default function BillingWorkflowPage({ role }) {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = isAdminRole(user?.role?.slug);
    const canView = isAdmin
        || (role === 'seller' && isVendorRole(user?.role?.slug))
        || (role === 'delivery' && isDeliveryPersonRole(user?.role?.slug))
        || (role === 'confirmation' && isConfirmationAgentRole(user?.role?.slug));
    const redirectPath = getDefaultBillingPath(user?.role?.slug);
    const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
    const [filters, setFilters] = useState({
        month: searchParams.get('month')?.slice(0, 7) || new Date().toISOString().slice(0, 7),
        entity_id: searchParams.get('entity_id') || '',
    });
    const [entities, setEntities] = useState({
        seller: [],
        confirmation: [],
        delivery: [],
    });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [markingKey, setMarkingKey] = useState('');
    const [sellerSnapshot, setSellerSnapshot] = useState(null);

    const workflow = WORKFLOWS[role] || WORKFLOWS.delivery;
    const toneClasses = getToneClasses(workflow.tone);
    const activeEntities = entities[role] || [];
    const records = useMemo(() => [...dashboard.unpaid, ...dashboard.paid], [dashboard.unpaid, dashboard.paid]);

    const summaryCards = useMemo(() => {
        if (role === 'delivery') {
            return [
                { icon: Wallet, label: 'Collected Cash', value: formatCurrency(sumAmount(records, 'gross_amount')) },
                { icon: Coins, label: 'Commission', value: formatCurrency(sumAmount(records, 'fee_amount')) },
                { icon: Landmark, label: 'Cash To Return', value: formatCurrency(sumAmount(records, 'settlement_amount')) },
                { icon: ArrowRightLeft, label: 'Pending Returns', value: dashboard.summary.open_invoices },
            ];
        }

        if (role === 'confirmation') {
            return [
                { icon: PackageCheck, label: 'Delivered Orders', value: records.reduce((total, record) => total + Number(record.orders_count || 0), 0) },
                { icon: Wallet, label: 'Total Salary', value: formatCurrency(sumAmount(records, 'settlement_amount')) },
                { icon: Clock3, label: 'Pending Salary', value: formatCurrency(sumAmount(dashboard.unpaid, 'settlement_amount')) },
                { icon: CheckCircle2, label: 'Paid Invoices', value: dashboard.summary.paid_invoices },
            ];
        }

        const sellerRevenue = !isAdmin && sellerSnapshot
            ? sellerSnapshot.totalRevenue
            : sumAmount(records, 'gross_amount');
        const sellerProfit = !isAdmin && sellerSnapshot
            ? sellerSnapshot.totalProfit
            : sumAmount(records, 'settlement_amount');
        const sellerPendingPayout = !isAdmin && sellerSnapshot
            ? sellerSnapshot.pendingPayout
            : sumAmount(dashboard.unpaid, 'settlement_amount');

        return [
            { icon: Wallet, label: 'Total Revenue', value: formatCurrency(sellerRevenue) },
            { icon: Banknote, label: 'Total Profit', value: formatCurrency(sellerProfit) },
            { icon: Landmark, label: 'Pending Payout', value: formatCurrency(sellerPendingPayout) },
            { icon: CheckCircle2, label: 'Paid Invoices', value: dashboard.summary.paid_invoices },
        ];
    }, [dashboard.summary.open_invoices, dashboard.summary.paid_invoices, dashboard.unpaid, formatCurrency, isAdmin, records, role, sellerSnapshot]);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        const fetchEntities = async () => {
            try {
                const [sellerResponse, confirmationResponse, deliveryResponse] = await Promise.all([
                    api.get('/vendors', { params: { per_page: 500 } }),
                    api.get('/confirmation-agents'),
                    api.get('/delivery-persons'),
                ]);

                setEntities({
                    seller: (sellerResponse.data?.data || []).map((seller) => ({ id: seller.id, name: seller.name })),
                    confirmation: (confirmationResponse.data || []).map((agent) => ({ id: agent.id, name: agent.name })),
                    delivery: (deliveryResponse.data || []).map((person) => ({ id: person.id, name: person.name })),
                });
            } catch (error) {
                console.error('Error fetching billing entities:', error);
            }
        };

        fetchEntities();
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin || !canView || role !== 'seller') {
            setSellerSnapshot(null);
            return;
        }

        const fetchSellerSnapshot = async () => {
            try {
                const response = await api.get('/dashboard');
                setSellerSnapshot({
                    totalRevenue: Number(response.data?.seller_overview?.total_revenue || 0),
                    totalProfit: Number(response.data?.seller_overview?.total_profit || 0),
                    pendingPayout: Number(response.data?.seller_billing?.estimated_payout || 0),
                });
            } catch (error) {
                console.error('Error fetching seller billing overview:', error);
                setSellerSnapshot(null);
            }
        };

        fetchSellerSnapshot();
    }, [canView, isAdmin, role]);

    useEffect(() => {
        if (!canView || !role) {
            setLoading(false);
            return;
        }

        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const response = await api.get('/billing', {
                    params: {
                        month: filters.month ? `${filters.month}-01` : undefined,
                        role,
                        entity_id: isAdmin ? (filters.entity_id || undefined) : undefined,
                    },
                });

                setDashboard({
                    ...EMPTY_DASHBOARD,
                    ...response.data,
                });
            } catch (error) {
                console.error('Error fetching billing records:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [canView, filters.month, filters.entity_id, isAdmin, role]);

    useEffect(() => {
        if (!canView || !role) {
            return;
        }

        const nextParams = { month: filters.month };

        if (isAdmin && filters.entity_id) {
            nextParams.entity_id = filters.entity_id;
        }

        setSearchParams(nextParams, { replace: true });
    }, [canView, filters.month, filters.entity_id, isAdmin, role, setSearchParams]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const response = await api.post('/billing/generate', {
                month: filters.month ? `${filters.month}-01` : undefined,
                role,
                entity_id: filters.entity_id || undefined,
            });

            setDashboard({
                ...EMPTY_DASHBOARD,
                ...response.data,
            });
        } catch (error) {
            console.error('Error generating billing records:', error);
            alert('Failed to generate billing records.');
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkPaid = async (record) => {
        try {
            setMarkingKey(record.key);
            await api.patch(`/billing/${record.role}/${record.source_id}/mark-paid`);
            const response = await api.get('/billing', {
                params: {
                    month: filters.month ? `${filters.month}-01` : undefined,
                    role,
                    entity_id: isAdmin ? (filters.entity_id || undefined) : undefined,
                },
            });
            setDashboard({
                ...EMPTY_DASHBOARD,
                ...response.data,
            });
        } catch (error) {
            console.error('Error marking billing as paid:', error);
            alert('Failed to mark billing as paid.');
        } finally {
            setMarkingKey('');
        }
    };

    if (!canView && redirectPath) {
        return <Navigate to={redirectPath} replace />;
    }

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
                <p className="text-slate-500 mt-2">You do not have access to this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{workflow.title}</h1>
                    <p className="text-slate-500 mt-1">{workflow.description}</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 ${toneClasses.button}`}
                    >
                        <RefreshCcw size={18} className={generating ? 'animate-spin' : ''} />
                        <span>{generating ? 'Generating...' : `Generate ${workflow.title}`}</span>
                    </button>
                )}
            </div>

            <div className={`rounded-3xl border p-6 ${toneClasses.card}`}>
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">{workflow.subtitle}</p>
                        <h2 className="text-2xl font-bold mt-2">{workflow.title}</h2>
                        <p className="text-sm mt-2 max-w-2xl">{workflow.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0 xl:min-w-[720px]">
                        {summaryCards.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 text-slate-900">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-600">{item.label}</p>
                                    <item.icon size={18} className="text-slate-500" />
                                </div>
                                <p className="text-2xl font-bold mt-3">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{workflow.entityLabel}</label>
                            <select
                                value={filters.entity_id}
                                onChange={(event) => setFilters((prev) => ({ ...prev, entity_id: event.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                            >
                                <option value="">{workflow.emptyEntityLabel}</option>
                                {activeEntities.map((entity) => (
                                    <option key={entity.id} value={entity.id}>{entity.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-700">Current language</p>
                        <p className="text-xs text-slate-500 mt-2">
                            {role === 'delivery' && 'Collected cash, commission, and money to return to admin.'}
                            {role === 'confirmation' && 'Delivered orders, salary per order, and paid invoice history.'}
                            {role === 'seller' && (isAdmin
                                ? 'Revenue, profit after commission, pending payout, and paid invoices.'
                                : 'Revenue and profit reflect seller performance. Pending payout reflects unpaid delivered orders.')}
                        </p>
                    </div>
                </div>
            </div>

            <WorkflowSection
                role={role}
                title={workflow.openTitle}
                description={workflow.openDescription}
                records={dashboard.unpaid}
                loading={loading}
                markingKey={markingKey}
                onMarkPaid={handleMarkPaid}
                formatCurrency={formatCurrency}
                canManage={isAdmin}
                paid={false}
            />

            <WorkflowSection
                role={role}
                title={workflow.paidTitle}
                description={workflow.paidDescription}
                records={dashboard.paid}
                loading={loading}
                markingKey={markingKey}
                onMarkPaid={handleMarkPaid}
                formatCurrency={formatCurrency}
                canManage={isAdmin}
                paid
            />
        </div>
    );
}

function WorkflowSection({ role, title, description, records, loading, markingKey, onMarkPaid, formatCurrency, canManage, paid }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>

            {role === 'delivery' && (
                <DeliveryBillingTable
                    records={records}
                    loading={loading}
                    paid={paid}
                    markingKey={markingKey}
                    onMarkPaid={onMarkPaid}
                    formatCurrency={formatCurrency}
                    canManage={canManage}
                />
            )}

            {role === 'confirmation' && (
                <ConfirmationBillingTable
                    records={records}
                    loading={loading}
                    paid={paid}
                    markingKey={markingKey}
                    onMarkPaid={onMarkPaid}
                    formatCurrency={formatCurrency}
                    canManage={canManage}
                />
            )}

            {role === 'seller' && (
                <SellerBillingTable
                    records={records}
                    loading={loading}
                    paid={paid}
                    markingKey={markingKey}
                    onMarkPaid={onMarkPaid}
                    formatCurrency={formatCurrency}
                    canManage={canManage}
                />
            )}
        </div>
    );
}

function DeliveryBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency, canManage }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No delivery billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Delivery person', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Date', render: (record) => <span className="text-sm text-slate-600">{formatSingleDate(record.period_start)}</span> },
                { key: 'gross_amount', label: 'Collected Cash', render: (record) => <AmountCell value={record.gross_amount} formatCurrency={formatCurrency} /> },
                { key: 'fee_amount', label: 'Commission', render: (record) => <AmountCell value={record.fee_amount} formatCurrency={formatCurrency} tone="emerald" /> },
                { key: 'settlement_amount', label: 'Cash To Return', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="blue" /> },
            ]}
            paid={paid}
            canManage={canManage}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function ConfirmationBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency, canManage }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No confirmation billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Confirmation agent', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Period', render: (record) => <span className="text-sm text-slate-600">{formatPeriodRange(record.period_start, record.period_end)}</span> },
                { key: 'orders_count', label: 'Delivered Orders', render: (record) => <span className="font-semibold text-slate-900">{record.orders_count}</span> },
                { key: 'rate_amount', label: 'Rate / Order', render: (record) => <AmountCell value={record.rate_amount} formatCurrency={formatCurrency} /> },
                { key: 'settlement_amount', label: 'Salary', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="emerald" /> },
            ]}
            paid={paid}
            canManage={canManage}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function SellerBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency, canManage }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No seller billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Seller', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Period', render: (record) => <span className="text-sm text-slate-600">{formatPeriodRange(record.period_start, record.period_end)}</span> },
                { key: 'frequency_label', label: 'Billing cadence', render: (record) => <span className="text-sm font-medium text-slate-700">{record.frequency_label}</span> },
                { key: 'gross_amount', label: 'Revenue', render: (record) => <AmountCell value={record.gross_amount} formatCurrency={formatCurrency} /> },
                { key: 'fee_amount', label: 'Platform Fee', render: (record) => <AmountCell value={record.fee_amount} formatCurrency={formatCurrency} tone="orange" /> },
                { key: 'settlement_amount', label: 'Profit', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="emerald" /> },
            ]}
            paid={paid}
            canManage={canManage}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function DataTable({ loading, records, emptyMessage, columns, paid, canManage, markingKey, onMarkPaid }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-white">
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {column.label}
                            </th>
                        ))}
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {paid ? 'Paid On' : canManage ? 'Action' : 'Status'}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-5 py-8 text-center text-slate-500">Loading records...</td>
                        </tr>
                    ) : records.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-5 py-8 text-center text-slate-500">{emptyMessage}</td>
                        </tr>
                    ) : records.map((record) => (
                        <tr key={record.key} className="align-top">
                            {columns.map((column) => (
                                <td key={column.key} className="px-5 py-4">
                                    {column.render(record)}
                                </td>
                            ))}
                            <td className="px-5 py-4">
                                {paid ? (
                                    <span className="text-sm text-slate-600">
                                        {record.paid_at ? new Date(record.paid_at).toLocaleString() : '-'}
                                    </span>
                                ) : canManage ? (
                                    <button
                                        onClick={() => onMarkPaid(record)}
                                        disabled={markingKey === record.key}
                                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                                    >
                                        {markingKey === record.key ? 'Saving...' : 'Mark Paid'}
                                    </button>
                                ) : (
                                    <StatusBadge status={record.status} />
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TableTitle({ title, subtitle }) {
    return (
        <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
    );
}

function AmountCell({ value, formatCurrency, tone = 'slate' }) {
    const toneClass = {
        slate: 'text-slate-900',
        blue: 'text-blue-700',
        emerald: 'text-emerald-700',
        orange: 'text-orange-700',
    }[tone];

    return <span className={`text-sm font-semibold ${toneClass}`}>{formatCurrency(value || 0)}</span>;
}

function StatusBadge({ status }) {
    const paid = status === 'paid';

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {paid ? 'Paid' : 'Pending'}
        </span>
    );
}

function formatSingleDate(date) {
    if (!date) {
        return '-';
    }

    return new Date(date).toLocaleDateString();
}

function formatPeriodRange(start, end) {
    if (!start || !end) {
        return '-';
    }

    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
}
