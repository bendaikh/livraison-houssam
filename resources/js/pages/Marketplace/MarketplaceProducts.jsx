import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    Package, Store, Users, Search, Filter, Plus, X, Check, 
    ToggleLeft, ToggleRight, Edit, Trash2, TrendingUp, AlertCircle,
    CheckCircle, XCircle, DollarSign, Hash, Eye, ChevronDown, ChevronUp,
    Grid, List as ListIcon
} from 'lucide-react';

export default function MarketplaceProducts() {
    const { formatCurrency } = useSettings();
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState(new Set());
    const [assignForm, setAssignForm] = useState({
        vendor_id: '',
        commission_rate: '',
        assigned_quantity: 0,
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsRes, vendorsRes, statsRes] = await Promise.all([
                api.get('/marketplace', { params: { search: searchTerm, is_marketplace_active: 1 } }),
                api.get('/vendors'),
                api.get('/marketplace/statistics'),
            ]);
            setProducts(productsRes.data.data);
            setVendors(vendorsRes.data.data);
            setStatistics(statsRes.data);
        } catch (error) {
            console.error('Error fetching marketplace data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignVendor = async (product) => {
        setSelectedProduct(product);
        setShowAssignModal(true);
        setAssignForm({
            vendor_id: '',
            commission_rate: '',
            assigned_quantity: 0,
            is_active: true,
        });
    };

    const submitAssignment = async () => {
        try {
            await api.post(`/marketplace/products/${selectedProduct.id}/assign`, assignForm);
            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            console.error('Error assigning vendor:', error);
            alert(error.response?.data?.message || 'Failed to assign vendor');
        }
    };

    const toggleActivation = async (assignmentId) => {
        try {
            await api.post(`/marketplace/assignments/${assignmentId}/toggle`);
            fetchData();
        } catch (error) {
            console.error('Error toggling activation:', error);
        }
    };

    const removeAssignment = async (assignmentId) => {
        if (!confirm('Are you sure you want to remove this vendor assignment?')) return;
        
        try {
            await api.delete(`/marketplace/assignments/${assignmentId}`);
            fetchData();
        } catch (error) {
            console.error('Error removing assignment:', error);
        }
    };

    const toggleProductExpansion = (productId) => {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedProducts(newExpanded);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading marketplace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Store className="text-white" size={24} />
                        </div>
                        <span>Marketplace</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Manage product assignments to vendors</p>
                </div>
            </div>

            {/* Statistics Cards */}
            {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 mb-1">Total Products</p>
                                <h3 className="text-3xl font-bold text-slate-800">{statistics.total_products}</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <Package className="text-white" size={26} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 mb-1">Assigned Products</p>
                                <h3 className="text-3xl font-bold text-slate-800">{statistics.assigned_products}</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                <CheckCircle className="text-white" size={26} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 mb-1">Active Assignments</p>
                                <h3 className="text-3xl font-bold text-slate-800">{statistics.active_assignments}</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                                <TrendingUp className="text-white" size={26} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 mb-1">Active Vendors</p>
                                <h3 className="text-3xl font-bold text-slate-800">{statistics.total_vendors}</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                                <Users className="text-white" size={26} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 flex-1">
                        <Search className="text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
                        />
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'list'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title="List View"
                        >
                            <ListIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title="Grid View"
                        >
                            <Grid size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Display */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">Products & Vendor Assignments</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage which vendors can sell each product</p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {products.length === 0 ? (
                            <div className="p-12 text-center">
                                <Package className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No marketplace products found</p>
                            </div>
                        ) : (
                            products.map((product) => {
                                const isExpanded = expandedProducts.has(product.id);
                                const hasAssignments = product.marketplace_products?.length > 0;

                                return (
                                    <div key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4 flex-1">
                                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center overflow-hidden">
                                                        {product.images && product.images.length > 0 ? (
                                                            <img 
                                                                src={`/storage/${product.images[0]}`} 
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Package className="text-purple-600" size={28} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3">
                                                            <h4 className="text-lg font-semibold text-slate-800">{product.name}</h4>
                                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                                                {product.sku}
                                                            </span>
                                                            {product.is_active ? (
                                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                                            <span className="flex items-center space-x-1">
                                                                <Hash size={14} />
                                                                <span>Stock: {product.stock_quantity}</span>
                                                            </span>
                                                            <span className="flex items-center space-x-1">
                                                                <DollarSign size={14} />
                                                                <span>{formatCurrency(product.company_price || product.price)}</span>
                                                            </span>
                                                            {hasAssignments && (
                                                                <span className="flex items-center space-x-1 text-blue-600 font-medium">
                                                                    <Users size={14} />
                                                                    <span>{product.marketplace_products.length} vendor(s)</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleAssignVendor(product)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center space-x-2"
                                                    >
                                                        <Plus size={18} />
                                                        <span>Assign Vendor</span>
                                                    </button>
                                                    {hasAssignments && (
                                                        <button
                                                            onClick={() => toggleProductExpansion(product.id)}
                                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isExpanded && hasAssignments && (
                                                <div className="mt-6 space-y-3 pl-20">
                                                    {product.marketplace_products.map((assignment) => (
                                                        <div
                                                            key={assignment.id}
                                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                                                        >
                                                            <div className="flex items-center space-x-4">
                                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                                                    {assignment.vendor?.name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-semibold text-slate-800">{assignment.vendor?.name}</h5>
                                                                    <div className="flex items-center space-x-3 text-sm text-slate-500 mt-1">
                                                                        <span>Commission: {assignment.commission_rate || assignment.vendor?.commission_rate || 0}%</span>
                                                                        {assignment.assigned_quantity > 0 && (
                                                                            <span>Qty: {assignment.assigned_quantity}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => toggleActivation(assignment.id)}
                                                                    className={`p-2 rounded-lg transition-all ${
                                                                        assignment.is_active
                                                                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                                            : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                                                                    }`}
                                                                    title={assignment.is_active ? 'Deactivate' : 'Activate'}
                                                                >
                                                                    {assignment.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => removeAssignment(assignment.id)}
                                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Remove assignment"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
                            <Package className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">No marketplace products found</p>
                        </div>
                    ) : (
                        products.map((product) => {
                            const hasAssignments = product.marketplace_products?.length > 0;
                            return (
                                <div key={product.id} className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-xl transition-all group">
                                    {/* Product Image */}
                                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-indigo-100">
                                        {product.images && product.images.length > 0 ? (
                                            <img 
                                                src={`/storage/${product.images[0]}`} 
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={48} className="text-purple-400" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm ${
                                                product.is_active 
                                                    ? 'bg-green-500/90 text-white' 
                                                    : 'bg-slate-500/90 text-white'
                                            }`}>
                                                {product.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-5">
                                        <div className="mb-3">
                                            <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{product.name}</h3>
                                            <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                                        </div>

                                        {product.category && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 mb-3">
                                                {product.category.name}
                                            </span>
                                        )}

                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                                            <div>
                                                <p className="text-xs text-slate-500">Price</p>
                                                <p className="font-bold text-lg text-purple-600">{formatCurrency(product.company_price || product.price)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Stock</p>
                                                <p className="font-bold text-lg text-slate-800">{product.stock_quantity}</p>
                                            </div>
                                        </div>

                                        {/* Vendor Assignments */}
                                        {hasAssignments && (
                                            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                <p className="text-xs font-medium text-blue-900 mb-2 flex items-center space-x-1">
                                                    <Users size={14} />
                                                    <span>{product.marketplace_products.length} Vendor Assignment(s)</span>
                                                </p>
                                                <div className="space-y-1">
                                                    {product.marketplace_products.slice(0, 2).map((assignment) => (
                                                        <div key={assignment.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-slate-700">{assignment.vendor?.name}</span>
                                                            <span className={`px-2 py-0.5 rounded ${
                                                                assignment.is_active 
                                                                    ? 'bg-green-100 text-green-700' 
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {assignment.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {product.marketplace_products.length > 2 && (
                                                        <p className="text-xs text-slate-500 text-center pt-1">
                                                            +{product.marketplace_products.length - 2} more
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleAssignVendor(product)}
                                            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                                        >
                                            <Plus size={16} />
                                            <span>Assign Vendor</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Assign Vendor Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Assign Vendor</h3>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Product
                                </label>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="font-semibold text-slate-800">{selectedProduct?.name}</p>
                                    <p className="text-sm text-slate-500">{selectedProduct?.sku}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Select Vendor *
                                </label>
                                <select
                                    value={assignForm.vendor_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, vendor_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    required
                                >
                                    <option value="">Choose a vendor...</option>
                                    {vendors.filter(v => v.is_active).map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>
                                            {vendor.name} - {vendor.commission_rate}% commission
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Commission Rate (%) - Optional
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={assignForm.commission_rate}
                                    onChange={(e) => setAssignForm({ ...assignForm, commission_rate: e.target.value })}
                                    placeholder="Leave empty to use vendor's default"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Assigned Quantity
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={assignForm.assigned_quantity}
                                    onChange={(e) => setAssignForm({ ...assignForm, assigned_quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>

                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={assignForm.is_active}
                                    onChange={(e) => setAssignForm({ ...assignForm, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                                    Activate immediately
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 mt-6">
                            <button
                                onClick={submitAssignment}
                                disabled={!assignForm.vendor_id}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Assign Vendor
                            </button>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
