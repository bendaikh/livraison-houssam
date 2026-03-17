import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { isAdminRole } from '../../utils/roles';
import {
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

const DEFAULT_ROLE = 'delivery';

const WORKFLOWS = {
    delivery: {
        label: 'Delivery billing',
        subtitle: 'Cash collection workflow',
        description: 'Delivery persons collect money, keep their commission, and return the rest to admin.',
        icon: Truck,
        tone: 'blue',
        emptyEntityLabel: 'All delivery persons',
        entityLabel: 'Delivery person',
    },
    confirmation: {
        label: 'Confirmation billing',
        subtitle: 'Salary workflow',
        description: 'Confirmation agents are paid by delivered order count and commission per order.',
        icon: UserRoundCheck,
        tone: 'emerald',
        emptyEntityLabel: 'All confirmation agents',
        entityLabel: 'Confirmation agent',
    },
    seller: {
        label: 'Seller billing',
        subtitle: 'Payout workflow',
        description: 'Sellers are paid on their configured cadence after platform commission is deducted.',
        icon: Store,
        tone: 'orange',
        emptyEntityLabel: 'All sellers',
        entityLabel: 'Seller',
    },
};

const EMPTY_DASHBOARD = {
    summary: {
        total_invoices: 0,
        open_invoices: 0,
        paid_invoices: 0,
        pending_payout_total: 0,
        pending_collection_total: 0,
        paid_total: 0,
    },
    unpaid: [],
    paid: [],
};

function normalizeCollection(payload) {
    return payload?.data || payload || [];
}

function sumAmount(records, key) {
    return records.reduce((total, record) => total + Number(record[key] || 0), 0);
}

function getToneClasses(tone) {
    return {
        blue: {
            tab: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
            chip: 'bg-blue-50 text-blue-700 border-blue-200',
            card: 'bg-blue-50 text-blue-800 border-blue-200',
            button: 'bg-blue-600 hover:bg-blue-700',
        },
        emerald: {
            tab: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
            chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            card: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            button: 'bg-emerald-600 hover:bg-emerald-700',
        },
        orange: {
            tab: 'bg-orange-600 text-white shadow-lg shadow-orange-500/20',
            chip: 'bg-orange-50 text-orange-700 border-orange-200',
            card: 'bg-orange-50 text-orange-800 border-orange-200',
            button: 'bg-orange-600 hover:bg-orange-700',
        },
    }[tone];
}

export default function AdminBillingDashboard() {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialRole = WORKFLOWS[searchParams.get('role')] ? searchParams.get('role') : DEFAULT_ROLE;
    const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
    const [filters, setFilters] = useState({
        month: searchParams.get('month')?.slice(0, 7) || new Date().toISOString().slice(0, 7),
        role: initialRole,
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

    const canView = isAdminRole(user?.role?.slug);
    const workflow = WORKFLOWS[filters.role] || WORKFLOWS[DEFAULT_ROLE];
    const toneClasses = getToneClasses(workflow.tone);
    const activeEntities = entities[filters.role] || [];

    const records = useMemo(() => [...dashboard.unpaid, ...dashboard.paid], [dashboard.unpaid, dashboard.paid]);

    const sectionSummary = useMemo(() => {
        if (filters.role === 'delivery') {
            return [
                {
                    icon: Wallet,
                    label: 'Collected',
                    value: formatCurrency(sumAmount(records, 'gross_amount')),
                },
                {
                    icon: Coins,
                    label: 'Commission',
                    value: formatCurrency(sumAmount(records, 'fee_amount')),
                },
                {
                    icon: Landmark,
                    label: 'To return',
                    value: formatCurrency(sumAmount(records, 'settlement_amount')),
                },
                {
                    icon: Clock3,
                    label: 'Open cash returns',
                    value: dashboard.summary.open_invoices,
                },
            ];
        }

        if (filters.role === 'confirmation') {
            return [
                {
                    icon: PackageCheck,
                    label: 'Delivered orders',
                    value: records.reduce((total, record) => total + Number(record.orders_count || 0), 0),
                },
                {
                    icon: Wallet,
                    label: 'Total salary',
                    value: formatCurrency(sumAmount(records, 'settlement_amount')),
                },
                {
                    icon: CheckCircle2,
                    label: 'Paid invoices',
                    value: dashboard.summary.paid_invoices,
                },
                {
                    icon: Clock3,
                    label: 'Open salaries',
                    value: dashboard.summary.open_invoices,
                },
            ];
        }

        return [
            {
                icon: Wallet,
                label: 'Sales',
                value: formatCurrency(sumAmount(records, 'gross_amount')),
            },
            {
                icon: Coins,
                label: 'Commission',
                value: formatCurrency(sumAmount(records, 'fee_amount')),
            },
            {
                icon: Landmark,
                label: 'To pay',
                value: formatCurrency(sumAmount(records, 'settlement_amount')),
            },
            {
                icon: Clock3,
                label: 'Open payouts',
                value: dashboard.summary.open_invoices,
            },
        ];
    }, [dashboard.summary.open_invoices, dashboard.summary.paid_invoices, filters.role, formatCurrency, records]);

    const fetchDashboard = async () => {
        if (!canView) {
            return;
        }

        try {
            setLoading(true);
            const response = await api.get('/billing', {
                params: {
                    month: filters.month ? `${filters.month}-01` : undefined,
                    role: filters.role,
                    entity_id: filters.entity_id || undefined,
                },
            });

            setDashboard({
                ...EMPTY_DASHBOARD,
                ...response.data,
            });
        } catch (error) {
            console.error('Error fetching billing dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntities = async () => {
        if (!canView) {
            return;
        }

        try {
            const [sellerResponse, confirmationResponse, deliveryResponse] = await Promise.all([
                api.get('/vendors', { params: { per_page: 500 } }),
                api.get('/confirmation-agents'),
                api.get('/delivery-persons'),
            ]);

            setEntities({
                seller: normalizeCollection(sellerResponse.data.data || sellerResponse.data).map((seller) => ({
                    id: seller.id,
                    name: seller.name,
                })),
                confirmation: normalizeCollection(confirmationResponse.data).map((agent) => ({
                    id: agent.id,
                    name: agent.name,
                })),
                delivery: normalizeCollection(deliveryResponse.data).map((person) => ({
                    id: person.id,
                    name: person.name,
                })),
            });
        } catch (error) {
            console.error('Error fetching billing filter options:', error);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [canView, filters.month, filters.role, filters.entity_id]);

    useEffect(() => {
        const nextParams = {
            month: filters.month,
            role: filters.role,
        };

        if (filters.entity_id) {
            nextParams.entity_id = filters.entity_id;
        }

        setSearchParams(nextParams, { replace: true });
    }, [filters.month, filters.role, filters.entity_id, setSearchParams]);

    useEffect(() => {
        fetchEntities();
    }, [canView]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const response = await api.post('/billing/generate', {
                month: filters.month ? `${filters.month}-01` : undefined,
                role: filters.role,
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
            await fetchDashboard();
        } catch (error) {
            console.error('Error marking billing as paid:', error);
            alert('Failed to mark billing as paid.');
        } finally {
            setMarkingKey('');
        }
    };

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
                    <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
                    <p className="text-slate-500 mt-1">Clear admin workflows for delivery cash, confirmation salaries, and seller payouts.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 ${toneClasses.button}`}
                >
                    <RefreshCcw size={18} className={generating ? 'animate-spin' : ''} />
                    <span>{generating ? 'Generating...' : 'Generate This Workflow'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {Object.entries(WORKFLOWS).map(([role, config]) => {
                    const Icon = config.icon;
                    const active = filters.role === role;
                    const colors = getToneClasses(config.tone);

                    return (
                        <button
                            key={role}
                            onClick={() => setFilters((prev) => ({ ...prev, role, entity_id: '' }))}
                            className={`text-left rounded-2xl border px-5 py-4 transition-all ${
                                active
                                    ? colors.tab
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2">
                                        <Icon size={18} />
                                        <span className="font-semibold">{config.label}</span>
                                    </div>
                                    <p className={`text-sm mt-2 ${active ? 'text-white/90' : 'text-slate-500'}`}>{config.subtitle}</p>
                                </div>
                                <div className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'border-white/30 text-white' : colors.chip}`}>
                                    {role === 'delivery' ? 'Collected / Commission / To return' : role === 'confirmation' ? 'Delivered / Rate / Salary' : 'Sales / Commission / To pay'}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className={`rounded-3xl border p-6 ${toneClasses.card}`}>
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">{workflow.subtitle}</p>
                        <h2 className="text-2xl font-bold mt-2">{workflow.label}</h2>
                        <p className="text-sm mt-2 max-w-2xl">{workflow.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0 xl:min-w-[720px]">
                        {sectionSummary.map((item) => (
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

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-700">Current language</p>
                        <p className="text-xs text-slate-500 mt-2">
                            {filters.role === 'delivery' && 'Collected, Commission, To return'}
                            {filters.role === 'confirmation' && 'Delivered orders, Commission per order, Total salary'}
                            {filters.role === 'seller' && 'Sales, Commission, To pay'}
                        </p>
                    </div>
                </div>
            </div>

            <WorkflowSection
                role={filters.role}
                title="Unpaid"
                description="Open records that still need to be settled."
                records={dashboard.unpaid}
                loading={loading}
                markingKey={markingKey}
                onMarkPaid={handleMarkPaid}
                formatCurrency={formatCurrency}
                paid={false}
            />

            <WorkflowSection
                role={filters.role}
                title="Paid History"
                description="Settled records kept as invoice history."
                records={dashboard.paid}
                loading={loading}
                markingKey={markingKey}
                onMarkPaid={handleMarkPaid}
                formatCurrency={formatCurrency}
                paid
            />
        </div>
    );
}

function WorkflowSection({ role, title, description, records, loading, markingKey, onMarkPaid, formatCurrency, paid }) {
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
                />
            )}
        </div>
    );
}

function DeliveryBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No delivery billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Delivery person', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Date', render: (record) => <span className="text-sm text-slate-600">{formatSingleDate(record.period_start)}</span> },
                { key: 'gross_amount', label: 'Collected', render: (record) => <AmountCell value={record.gross_amount} formatCurrency={formatCurrency} /> },
                { key: 'fee_amount', label: 'Commission', render: (record) => <AmountCell value={record.fee_amount} formatCurrency={formatCurrency} tone="emerald" /> },
                { key: 'settlement_amount', label: 'To return', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="blue" /> },
            ]}
            paid={paid}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function ConfirmationBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No confirmation billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Confirmation agent', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Period', render: (record) => <span className="text-sm text-slate-600">{formatPeriodRange(record.period_start, record.period_end)}</span> },
                { key: 'orders_count', label: 'Delivered orders', render: (record) => <span className="font-semibold text-slate-900">{record.orders_count}</span> },
                { key: 'rate_amount', label: 'Commission / order', render: (record) => <AmountCell value={record.rate_amount} formatCurrency={formatCurrency} /> },
                { key: 'settlement_amount', label: 'Total salary', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="emerald" /> },
            ]}
            paid={paid}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function SellerBillingTable({ records, loading, paid, markingKey, onMarkPaid, formatCurrency }) {
    return (
        <DataTable
            loading={loading}
            records={records}
            emptyMessage="No seller billing records in this section."
            columns={[
                { key: 'entity_name', label: 'Seller', render: (record) => <TableTitle title={record.entity_name} subtitle={record.calculation_label} /> },
                { key: 'period', label: 'Period', render: (record) => <span className="text-sm text-slate-600">{formatPeriodRange(record.period_start, record.period_end)}</span> },
                { key: 'frequency_label', label: 'Billing cadence', render: (record) => <span className="text-sm font-medium text-slate-700">{record.frequency_label}</span> },
                { key: 'gross_amount', label: 'Sales', render: (record) => <AmountCell value={record.gross_amount} formatCurrency={formatCurrency} /> },
                { key: 'fee_amount', label: 'Commission', render: (record) => <AmountCell value={record.fee_amount} formatCurrency={formatCurrency} tone="orange" /> },
                { key: 'settlement_amount', label: 'To pay', render: (record) => <AmountCell value={record.settlement_amount} formatCurrency={formatCurrency} tone="emerald" /> },
            ]}
            paid={paid}
            markingKey={markingKey}
            onMarkPaid={onMarkPaid}
        />
    );
}

function DataTable({ loading, records, emptyMessage, columns, paid, markingKey, onMarkPaid }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-white">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                            >
                                {column.label}
                            </th>
                        ))}
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {paid ? 'Paid on' : 'Action'}
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
                                ) : (
                                    <button
                                        onClick={() => onMarkPaid(record)}
                                        disabled={markingKey === record.key}
                                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                                    >
                                        {markingKey === record.key ? 'Saving...' : 'Mark Paid'}
                                    </button>
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
            <div className="font-medium text-slate-900">{title}</div>
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        </div>
    );
}

function AmountCell({ value, formatCurrency, tone = 'slate' }) {
    const toneClasses = {
        slate: 'text-slate-900',
        emerald: 'text-emerald-700',
        blue: 'text-blue-700',
        orange: 'text-orange-700',
    };

    return <span className={`font-semibold ${toneClasses[tone]}`}>{formatCurrency(value || 0)}</span>;
}

function formatSingleDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatPeriodRange(start, end) {
    const formattedStart = new Date(start).toLocaleDateString();
    const formattedEnd = new Date(end).toLocaleDateString();

    return formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;
}
