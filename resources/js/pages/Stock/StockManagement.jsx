import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    Plus, Minus, Edit, Package, AlertTriangle, TrendingUp, 
    TrendingDown, Search, Filter, ArrowUpCircle, ArrowDownCircle,
    RefreshCw, Box, History, X, Check
} from 'lucide-react';

export default function StockManagement() {
    const { formatCurrency } = useSettings();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, low, out
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('add'); // add, remove, adjust
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({
        quantity: '',
        unit_cost: '',
        note: '',
        reference: '',
        new_quantity: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchProducts();
    }, [searchTerm, filterStatus]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = { search: searchTerm };
            
            if (filterStatus === 'low') params.low_stock = 1;
            
            const response = await api.get('/products', { params });
            let productsData = response.data.data || response.data;
            
            // Filter out of stock if needed
            if (filterStatus === 'out') {
                productsData = productsData.filter(p => p.stock_quantity === 0);
            }
            
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStockAction = (product, type) => {
        setSelectedProduct(product);
        setModalType(type);
        setFormData({
            quantity: '',
            unit_cost: '',
            note: '',
            reference: '',
            new_quantity: type === 'adjust' ? product.stock_quantity : ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const payload = {
                product_id: selectedProduct.id,
                ...formData
            };

            let endpoint = '';
            if (modalType === 'add') {
                endpoint = '/stock/add';
            } else if (modalType === 'remove') {
                endpoint = '/stock/remove';
            } else if (modalType === 'adjust') {
                endpoint = '/stock/adjust';
            }

            await api.post(endpoint, payload);
            
            fetchProducts();
            handleCloseModal();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                alert(error.response.data.message);
            }
            console.error('Error updating stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
        setModalType('add');
        setFormData({
            quantity: '',
            unit_cost: '',
            note: '',
            reference: '',
            new_quantity: ''
        });
        setErrors({});
    };

    const getStockStatus = (product) => {
        if (product.stock_quantity === 0) {
            return { label: 'Out of Stock', color: 'red', icon: AlertTriangle };
        }
        if (product.stock_quantity <= product.min_stock_quantity) {
            return { label: 'Low Stock', color: 'orange', icon: TrendingDown };
        }
        return { label: 'In Stock', color: 'green', icon: TrendingUp };
    };

    const stats = {
        totalProducts: products.length,
        lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_quantity).length,
        outOfStock: products.filter(p => p.stock_quantity === 0).length,
        totalValue: products.reduce((sum, p) => sum + (p.stock_quantity * (parseFloat(p.vendor_price) || 0)), 0)
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Stock Management
                    </h1>
                    <p className="text-slate-600 mt-1">Monitor and manage your inventory levels</p>
                </div>
                <Link
                    to="/stock/history"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center space-x-2"
                >
                    <History size={20} />
                    <span>View History</span>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Products</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalProducts}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Package size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Low Stock</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.lowStock}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                            <TrendingDown size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Out of Stock</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{stats.outOfStock}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Stock Value</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalValue)}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('low')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'low'
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Low Stock
                        </button>
                        <button
                            onClick={() => setFilterStatus('out')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'out'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Out of Stock
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            {loading && products.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Box size={40} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No products found</h3>
                    <p className="text-slate-500">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Product</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">SKU</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Current Stock</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Min Stock</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Value</th>
                                    <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {products.map((product) => {
                                    const status = getStockStatus(product);
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                        <Package size={20} className="text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{product.name}</p>
                                                        <p className="text-xs text-slate-500">{product.category?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {product.sku}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-2xl font-bold text-slate-800">
                                                    {product.stock_quantity}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-slate-600">
                                                    {product.min_stock_quantity}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                                    status.color === 'green' ? 'bg-green-100 text-green-700' :
                                                    status.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    <StatusIcon size={14} />
                                                    <span>{status.label}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-semibold text-emerald-600">
                                                    {formatCurrency(product.stock_quantity * (parseFloat(product.vendor_price) || 0))}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => handleStockAction(product, 'add')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="Add Stock"
                                                    >
                                                        <ArrowUpCircle size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStockAction(product, 'remove')}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remove Stock"
                                                    >
                                                        <ArrowDownCircle size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStockAction(product, 'adjust')}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Adjust Stock"
                                                    >
                                                        <RefreshCw size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    modalType === 'add' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                    modalType === 'remove' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                                    'bg-gradient-to-br from-blue-500 to-indigo-600'
                                }`}>
                                    {modalType === 'add' ? <ArrowUpCircle size={20} className="text-white" /> :
                                     modalType === 'remove' ? <ArrowDownCircle size={20} className="text-white" /> :
                                     <RefreshCw size={20} className="text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {modalType === 'add' ? 'Add Stock' :
                                         modalType === 'remove' ? 'Remove Stock' :
                                         'Adjust Stock'}
                                    </h2>
                                    <p className="text-sm text-slate-600">{selectedProduct.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Current Stock Info */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500">Current Stock</p>
                                        <p className="text-2xl font-bold text-slate-800">{selectedProduct.stock_quantity}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Min Stock</p>
                                        <p className="text-2xl font-bold text-slate-600">{selectedProduct.min_stock_quantity}</p>
                                    </div>
                                </div>
                            </div>

                            {modalType === 'adjust' ? (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        New Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.new_quantity}
                                        onChange={(e) => setFormData({ ...formData, new_quantity: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Enter new quantity"
                                        required
                                    />
                                    {errors.new_quantity && (
                                        <p className="text-red-500 text-xs mt-1.5">⚠ {errors.new_quantity[0]}</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            placeholder="Enter quantity"
                                            required
                                        />
                                        {errors.quantity && (
                                            <p className="text-red-500 text-xs mt-1.5">⚠ {errors.quantity[0]}</p>
                                        )}
                                    </div>

                                    {modalType === 'add' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Unit Cost
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.unit_cost}
                                                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Reference
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reference}
                                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            placeholder="PO#, Invoice#, etc."
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Note
                                </label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                                    placeholder="Add a note about this stock movement..."
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-8 py-2.5 text-white rounded-xl font-semibold shadow-lg transition-all disabled:shadow-none flex items-center space-x-2 ${
                                        modalType === 'add' ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/30' :
                                        modalType === 'remove' ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-red-500/30' :
                                        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                                    } disabled:from-slate-400 disabled:to-slate-500`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>Confirm</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
