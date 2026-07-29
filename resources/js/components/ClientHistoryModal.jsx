import React, { useEffect, useState } from 'react';
import {
    X,
    History,
    Package,
    Store,
    Flag,
    RotateCcw,
    ShieldCheck,
    Users,
    Calendar,
    ShoppingBag,
    AlertTriangle,
} from 'lucide-react';
import api from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

function formatStatus(status) {
    return String(status || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status) {
    const map = {
        delivered: 'bg-emerald-100 text-emerald-800',
        cancelled: 'bg-rose-100 text-rose-800',
        refused: 'bg-rose-100 text-rose-800',
        returned: 'bg-orange-100 text-orange-800',
        return_requested: 'bg-orange-100 text-orange-800',
        pending: 'bg-amber-100 text-amber-800',
        confirmed: 'bg-blue-100 text-blue-800',
        shipped: 'bg-indigo-100 text-indigo-800',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
}

function reliabilityBanner(reliability, t) {
    if (reliability === 'trusted') {
        return {
            className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            icon: ShieldCheck,
            title: t('admin.clientIntelligence.trustedTitle'),
            subtitle: t('admin.clientIntelligence.trustedSubtitle'),
        };
    }
    if (reliability === 'warning') {
        return {
            className: 'border-amber-200 bg-amber-50 text-amber-950',
            icon: AlertTriangle,
            title: t('admin.clientIntelligence.warningTitle'),
            subtitle: t('admin.clientIntelligence.warningSubtitle'),
        };
    }
    return {
        className: 'border-slate-200 bg-slate-50 text-slate-800',
        icon: History,
        title: t('admin.clientIntelligence.normalTitle'),
        subtitle: t('admin.clientIntelligence.normalSubtitle'),
    };
}

export function ClientIntelligenceIndicators({ summary, onOpenHistory, compact = false }) {
    const { t } = useTranslation();
    const indicators = summary?.indicators || {};
    const reliability = summary?.reliability || 'normal';

    const historyButtonClass = {
        trusted: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        warning: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
        normal: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    }[reliability] || 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

    return (
        <div className={`inline-flex items-center ${compact ? 'gap-0.5' : 'gap-1'} flex-wrap`}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenHistory?.();
                }}
                title={t('admin.clientIntelligence.viewHistory')}
                aria-label={t('admin.clientIntelligence.viewHistory')}
                className={`inline-flex items-center justify-center rounded-md border transition-colors ${compact ? 'h-6 w-6' : 'h-7 w-7'} ${historyButtonClass}`}
            >
                <History size={compact ? 12 : 14} />
            </button>

            {indicators.high_cancel_rate && (
                <span
                    title={t('admin.clientIntelligence.highCancelTooltip', { rate: summary?.cancel_rate ?? 0 })}
                    className={`inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                >
                    <Flag size={compact ? 11 : 13} />
                </span>
            )}

            {indicators.high_return_rate && (
                <span
                    title={t('admin.clientIntelligence.highReturnTooltip', { rate: summary?.return_rate ?? 0 })}
                    className={`inline-flex items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-700 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                >
                    <RotateCcw size={compact ? 11 : 13} />
                </span>
            )}

            {indicators.multi_seller && (
                <span
                    title={t('admin.clientIntelligence.multiSellerTooltip', { count: summary?.sellers_count ?? 0 })}
                    className={`inline-flex items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                >
                    <Users size={compact ? 11 : 13} />
                </span>
            )}

            {indicators.trusted && (
                <span
                    title={t('admin.clientIntelligence.trustedTooltip')}
                    className={`inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                >
                    <ShieldCheck size={compact ? 11 : 13} />
                </span>
            )}
        </div>
    );
}

export default function ClientHistoryModal({ isOpen, phone, clientName, onClose }) {
    const { t } = useTranslation();
    const { formatCurrency } = useSettings();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!isOpen || !phone) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/client-intelligence', { params: { phone } });
                if (!cancelled) {
                    setProfile(response.data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.message || t('admin.clientIntelligence.loadFailed'));
                    setProfile(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [isOpen, phone, t]);

    if (!isOpen) {
        return null;
    }

    const banner = reliabilityBanner(profile?.reliability || 'normal', t);
    const BannerIcon = banner.icon;
    const displayName = clientName
        || profile?.client_names?.[0]
        || t('admin.clientIntelligence.unknownClient');

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto flex items-start sm:items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col my-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <History size={18} className="text-slate-500 flex-shrink-0" />
                            <h2 className="text-lg font-semibold text-slate-900 truncate">
                                {t('admin.clientIntelligence.title')}
                            </h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 truncate">
                            {displayName}
                            {phone ? ` · ${phone}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={t('admin.clientIntelligence.close')}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 py-4 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {error}
                        </div>
                    )}

                    {!loading && !error && profile && (
                        <>
                            <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${banner.className}`}>
                                <BannerIcon size={20} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm">{banner.title}</p>
                                    <p className="text-xs mt-0.5 opacity-80">{banner.subtitle}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {[
                                    { label: t('admin.clientIntelligence.totalOrders'), value: profile.total_orders },
                                    { label: t('admin.clientIntelligence.delivered'), value: profile.delivered_orders },
                                    { label: t('admin.clientIntelligence.cancelled'), value: profile.cancelled_orders },
                                    { label: t('admin.clientIntelligence.returned'), value: profile.returned_orders },
                                    { label: t('admin.clientIntelligence.totalSpent'), value: formatCurrency(profile.total_spent || 0) },
                                    { label: t('admin.clientIntelligence.sellers'), value: profile.sellers_count },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                                        <p className="mt-1 text-base font-semibold text-slate-900">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="rounded-lg border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('admin.clientIntelligence.firstOrder')}
                                        </p>
                                        <p className="text-sm font-medium text-slate-800">{formatDate(profile.first_order_at)}</p>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('admin.clientIntelligence.latestOrder')}
                                        </p>
                                        <p className="text-sm font-medium text-slate-800">{formatDate(profile.latest_order_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {(profile.indicators?.high_cancel_rate
                                || profile.indicators?.high_return_rate
                                || profile.indicators?.multi_seller
                                || profile.indicators?.trusted) && (
                                <div className="flex flex-wrap gap-2">
                                    {profile.indicators.high_cancel_rate && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                                            <Flag size={12} />
                                            {t('admin.clientIntelligence.highCancelBadge', { rate: profile.cancel_rate })}
                                        </span>
                                    )}
                                    {profile.indicators.high_return_rate && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                                            <RotateCcw size={12} />
                                            {t('admin.clientIntelligence.highReturnBadge', { rate: profile.return_rate })}
                                        </span>
                                    )}
                                    {profile.indicators.multi_seller && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                            <Users size={12} />
                                            {t('admin.clientIntelligence.multiSellerBadge', { count: profile.sellers_count })}
                                        </span>
                                    )}
                                    {profile.indicators.trusted && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                            <ShieldCheck size={12} />
                                            {t('admin.clientIntelligence.trustedBadge')}
                                        </span>
                                    )}
                                </div>
                            )}

                            <section>
                                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <ShoppingBag size={15} className="text-slate-500" />
                                    {t('admin.clientIntelligence.orderTimeline')}
                                </h3>
                                {(!profile.timeline || profile.timeline.length === 0) ? (
                                    <p className="text-sm text-slate-500">{t('admin.clientIntelligence.noOrders')}</p>
                                ) : (
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {profile.timeline.map((order) => (
                                            <div
                                                key={order.id}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {order.order_number}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {formatDate(order.created_at)}
                                                        {order.vendor_name ? ` · ${order.vendor_name}` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusBadgeClass(order.status)}`}>
                                                        {formatStatus(order.status)}
                                                    </span>
                                                    <p className="mt-1 text-xs font-semibold text-slate-800">
                                                        {formatCurrency(order.total || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <section>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Package size={15} className="text-slate-500" />
                                        {t('admin.clientIntelligence.productsOrdered')}
                                    </h3>
                                    {(!profile.products || profile.products.length === 0) ? (
                                        <p className="text-sm text-slate-500">{t('admin.clientIntelligence.noProducts')}</p>
                                    ) : (
                                        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {profile.products.map((product) => (
                                                <li
                                                    key={product.name}
                                                    className="flex items-center justify-between gap-2 text-sm rounded-md bg-slate-50 px-2.5 py-1.5"
                                                >
                                                    <span className="truncate text-slate-800">{product.name}</span>
                                                    <span className="flex-shrink-0 text-xs font-semibold text-slate-500">
                                                        ×{product.quantity}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Store size={15} className="text-slate-500" />
                                        {t('admin.clientIntelligence.sellersShops')}
                                    </h3>
                                    {(!profile.sellers || profile.sellers.length === 0) ? (
                                        <p className="text-sm text-slate-500">{t('admin.clientIntelligence.noSellers')}</p>
                                    ) : (
                                        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {profile.sellers.map((seller) => (
                                                <li
                                                    key={seller.id}
                                                    className="flex items-center justify-between gap-2 text-sm rounded-md bg-slate-50 px-2.5 py-1.5"
                                                >
                                                    <span className="truncate text-slate-800">{seller.name}</span>
                                                    <span className="flex-shrink-0 text-xs font-semibold text-slate-500">
                                                        {t('admin.clientIntelligence.ordersCount', { count: seller.orders_count })}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
