import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateAdminProductProfit, getAdminProductSellPrice } from '../../utils/profit';
import { 
    TrendingUp, TrendingDown, Award, Target, Calendar,
    Filter, ArrowRight, DollarSign, ShoppingBag, Zap, BarChart3
} from 'lucide-react';

// Add print styles
const printStyles = `
    @media print {
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
        }
        
        /* Hide all sidebars and navigation */
        aside,
        nav,
        header,
        [class*="sidebar"],
        [class*="nav-"],
        [class*="menu"],
        .fixed,
        .sticky {
            display: none !important;
        }
        
        /* Main content takes full width */
        main,
        [role="main"],
        .main-content,
        .content,
        #app,
        body > div {
            margin: 0 !important;
            padding: 20mm !important;
            width: 100% !important;
            max-width: 100% !important;
        }
        
        /* Hide export button when printing */
        button {
            display: none !important;
        }
        
        /* Allow links to be visible but not print */
        a {
            color: #333 !important;
            text-decoration: none !important;
        }
        
        /* Preserve gradients */
        [class*="gradient"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Optimize shadows for print */
        [class*="shadow"] {
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Table optimization */
        table {
            page-break-inside: avoid;
            width: 100% !important;
        }
        
        thead {
            page-break-after: avoid;
        }
        
        tr {
            page-break-inside: avoid;
        }
        
        /* Card styling for print */
        .rounded-2xl {
            border-radius: 8px !important;
        }
        
        /* Ensure text is readable */
        p, h1, h2, h3, h4, h5, h6, span, div {
            orphans: 3 !important;
            widows: 3 !important;
        }
        
        /* Remove hover states */
        *:hover {
            background: inherit !important;
            color: inherit !important;
        }
    }
    
    @page {
        margin: 0;
        size: A4;
    }
`;

export default function ProfitDashboard() {
    const { t } = useTranslation();
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 'month', 'week'
    const [sortBy, setSortBy] = useState('profit'); // 'profit', 'units', 'margin'
    const isVendor = user?.role?.slug === 'vendor';

    useEffect(() => {
        // Add print styles to document
        const style = document.createElement('style');
        style.textContent = printStyles;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        if (!isVendor) {
            fetchProducts();
        } else {
            setLoading(false);
        }
    }, [isVendor]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/products', { params: { per_page: 1000 } });
            setProducts(response.data.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSoldUnits = (product) => {
        const value = parseFloat(product.sold_units ?? 0);
        return Number.isFinite(value) ? value : 0;
    };

    const profitProducts = useMemo(() => {
        if (isVendor) {
            return [];
        }

        let filtered = products
            .map((product) => {
                const soldUnits = getSoldUnits(product);
                const unitProfit = calculateAdminProductProfit(product);
                const sellerPrice = getAdminProductSellPrice(product);

                return {
                    ...product,
                    soldUnits,
                    unitProfit,
                    totalProfit: soldUnits * unitProfit,
                    profitMargin: unitProfit > 0 && sellerPrice > 0
                        ? (unitProfit / sellerPrice) * 100
                        : 0,
                };
            })
            .filter((product) => product.soldUnits > 0);

        // Sort based on selected option
        filtered.sort((a, b) => {
            if (sortBy === 'profit') {
                return b.totalProfit - a.totalProfit;
            } else if (sortBy === 'units') {
                return b.soldUnits - a.soldUnits;
            } else if (sortBy === 'margin') {
                return b.profitMargin - a.profitMargin;
            }
            return 0;
        });

        return filtered;
    }, [products, isVendor, sortBy]);

    const profitSummary = useMemo(() => {
        if (isVendor) {
            return null;
        }

        const summary = profitProducts.reduce((acc, product) => {
            acc.totalSoldUnits += product.soldUnits;
            acc.totalProfit += product.totalProfit;
            acc.totalRevenue += product.soldUnits * getAdminProductSellPrice(product);

            if (!acc.bestProduct || product.totalProfit > acc.bestProduct.totalProfit) {
                acc.bestProduct = product;
            }
            if (!acc.worstProduct || product.totalProfit < acc.worstProduct.totalProfit) {
                acc.worstProduct = product;
            }

            return acc;
        }, {
            totalSoldUnits: 0,
            totalProfit: 0,
            totalRevenue: 0,
            bestProduct: null,
            worstProduct: null,
        });

        summary.averageProfitPerUnit = summary.totalSoldUnits > 0
            ? summary.totalProfit / summary.totalSoldUnits
            : 0;
        summary.profitMargin = summary.totalRevenue > 0
            ? (summary.totalProfit / summary.totalRevenue) * 100
            : 0;

        return summary;
    }, [profitProducts, isVendor]);

    if (isVendor) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <ShoppingBag size={48} className="mx-auto text-slate-400 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">{t('admin.profitDashboard.notAvailable')}</h2>
                    <p className="text-slate-600 mt-2">{t('admin.profitDashboard.adminOnlyMessage')}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">{t('admin.profitDashboard.loadingProfit')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {t('admin.profitDashboard.title')}
                </h1>
                <p className="text-slate-600 mt-2">
                    {t('admin.profitDashboard.subtitle')}
                </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Profit */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <DollarSign size={24} className="text-emerald-600" />
                        </div>
                        <TrendingUp size={20} className="text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700 mb-1">{t('admin.profitDashboard.totalProfit')}</p>
                    <p className="text-3xl font-bold text-emerald-900">
                        {formatCurrency(profitSummary?.totalProfit || 0)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-2">
                        {profitSummary?.profitMargin.toFixed(1)}% {t('admin.profitDashboard.marginOnSales')}
                    </p>
                </div>

                {/* Units Sold */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg border border-blue-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <ShoppingBag size={24} className="text-blue-600" />
                        </div>
                        <Zap size={20} className="text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-blue-700 mb-1">{t('admin.profitDashboard.unitsSold')}</p>
                    <p className="text-3xl font-bold text-blue-900">
                        {profitSummary?.totalSoldUnits || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                        {profitSummary?.totalSoldUnits > 0 ? `${t('admin.profitDashboard.avgPerUnit')} ${formatCurrency(profitSummary.averageProfitPerUnit)}` : t('admin.profitDashboard.noSalesYet')}
                    </p>
                </div>

                {/* Average Profit Per Unit */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow-lg border border-violet-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-violet-100 rounded-xl">
                            <Target size={24} className="text-violet-600" />
                        </div>
                        <BarChart3 size={20} className="text-violet-600" />
                    </div>
                    <p className="text-sm font-medium text-violet-700 mb-1">{t('admin.profitDashboard.avgProfitPerUnit')}</p>
                    <p className="text-3xl font-bold text-violet-900">
                        {formatCurrency(profitSummary?.averageProfitPerUnit || 0)}
                    </p>
                    <p className="text-xs text-violet-600 mt-2">
                        {t('admin.profitDashboard.perUnitSold')}
                    </p>
                </div>

                {/* Best Performing SKU */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border border-amber-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <Award size={24} className="text-amber-600" />
                        </div>
                        <TrendingUp size={20} className="text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-amber-700 mb-1">{t('admin.profitDashboard.topPerformer')}</p>
                    <p className="text-2xl font-bold text-amber-900">
                        {profitSummary?.bestProduct?.sku || '--'}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                        {profitSummary?.bestProduct
                            ? `${formatCurrency(profitSummary.bestProduct.totalProfit)} ${t('admin.profitDashboard.profit')}`
                            : t('admin.profitDashboard.noDataAvailable')}
                    </p>
                </div>
            </div>

            {/* Filters and Sort */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSortBy('profit')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                sortBy === 'profit'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {t('admin.profitDashboard.sortByProfit')}
                        </button>
                        <button
                            onClick={() => setSortBy('units')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                sortBy === 'units'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {t('admin.profitDashboard.sortByUnits')}
                        </button>
                        <button
                            onClick={() => setSortBy('margin')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                sortBy === 'margin'
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {t('admin.profitDashboard.sortByMargin')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Profit Table */}
            {profitProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
                    <ShoppingBag size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">{t('admin.profitDashboard.noSalesData')}</h3>
                    <p className="text-slate-600">{t('admin.profitDashboard.noSalesDataDesc')}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl shadow-lg border border-slate-200/50">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.sku')}</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.productName')}</th>
                                    <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.unitsSold')}</th>
                                    <th className="text-right py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.unitProfit')}</th>
                                    <th className="text-right py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.profitMargin')}</th>
                                    <th className="text-right py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">{t('admin.profitDashboard.totalProfit')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {profitProducts.map((product, index) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg inline-flex items-center space-x-2">
                                                <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold rounded">
                                                    {index + 1}
                                                </span>
                                                <span>{product.sku}</span>
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <button
                                                onClick={() => navigate(appPath(`/products/${product.id}`))}
                                                className="font-semibold text-slate-800 hover:text-emerald-600 transition-colors flex items-center space-x-2 group/name"
                                            >
                                                <span>{product.name}</span>
                                                <ArrowRight size={16} className="opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-center">
                                                <span className="text-sm font-bold text-slate-800 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg inline-block">
                                                    {product.soldUnits}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`py-4 px-6 text-right`}>
                                            <span className={`font-semibold text-sm px-3 py-1.5 rounded-lg inline-block ${
                                                product.unitProfit >= 0
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {formatCurrency(product.unitProfit)}
                                            </span>
                                        </td>
                                        <td className={`py-4 px-6 text-right`}>
                                            <span className={`font-semibold text-sm px-3 py-1.5 rounded-lg inline-block ${
                                                product.profitMargin >= 0
                                                    ? 'bg-violet-100 text-violet-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {product.profitMargin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className={`py-4 px-6 text-right`}>
                                            <span className={`font-bold text-base px-3 py-1.5 rounded-lg inline-block ${
                                                product.totalProfit >= 0
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {formatCurrency(product.totalProfit)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary Cards at Bottom */}
            {profitProducts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Revenue */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border border-slate-200/50 p-6">
                        <p className="text-sm font-medium text-slate-600 mb-2">{t('admin.profitDashboard.totalRevenue')}</p>
                        <p className="text-3xl font-bold text-slate-800">
                            {formatCurrency(profitSummary?.totalRevenue || 0)}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">{t('admin.profitDashboard.fromAllSoldUnits')}</p>
                    </div>

                    {/* Total Cost */}
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg border border-red-200/50 p-6">
                        <p className="text-sm font-medium text-red-600 mb-2">{t('admin.profitDashboard.totalCost')}</p>
                        <p className="text-3xl font-bold text-red-900">
                            {formatCurrency((profitSummary?.totalRevenue || 0) - (profitSummary?.totalProfit || 0))}
                        </p>
                        <p className="text-xs text-red-600 mt-2">{t('admin.profitDashboard.costOfGoodsSold')}</p>
                    </div>

                    {/* Profit Summary */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200/50 p-6">
                        <p className="text-sm font-medium text-emerald-600 mb-2">{t('admin.profitDashboard.netProfit')}</p>
                        <p className="text-3xl font-bold text-emerald-900">
                            {formatCurrency(profitSummary?.totalProfit || 0)}
                        </p>
                        <p className="text-xs text-emerald-600 mt-2">{t('admin.profitDashboard.revenueMinusCost')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
