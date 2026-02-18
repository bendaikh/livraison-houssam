import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    Plus, Search, Edit, Trash2, Package, Filter, 
    Download, Eye, AlertCircle, TrendingUp, TrendingDown,
    Grid, List as ListIcon, Image as ImageIcon
} from 'lucide-react';

export default function ProductList() {
    const { formatCurrency } = useSettings();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive', 'low_stock'

    useEffect(() => {
        fetchProducts();
    }, [search, filterStatus]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = { search };
            
            if (filterStatus === 'active') params.is_active = 1;
            if (filterStatus === 'inactive') params.is_active = 0;
            if (filterStatus === 'low_stock') params.low_stock = 1;
            
            const response = await api.get('/products', { params });
            setProducts(response.data.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Failed to delete product. Please try again.');
            }
        }
    };

    const getStockStatus = (product) => {
        if (product.stock_quantity === 0) return { label: 'Out of Stock', color: 'red' };
        if (product.stock_quantity <= product.min_stock_quantity) return { label: 'Low Stock', color: 'orange' };
        return { label: 'In Stock', color: 'green' };
    };

    const stats = {
        total: products.length,
        active: products.filter(p => p.is_active).length,
        lowStock: products.filter(p => p.stock_quantity <= p.min_stock_quantity).length,
        outOfStock: products.filter(p => p.stock_quantity === 0).length
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Products Inventory
                    </h1>
                    <p className="text-slate-600 mt-1">Manage your product catalog</p>
                </div>
                <Link
                    to="/products/create"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Product</span>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Products</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Package size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Active Products</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.active}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={28} className="text-white" />
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
                            <AlertCircle size={28} className="text-white" />
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
                            <TrendingDown size={28} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('active')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'active'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilterStatus('low_stock')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'low_stock'
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Low Stock
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'table'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title="Table View"
                        >
                            <ListIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-blue-100 text-blue-600'
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
            {loading ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No products found</h3>
                    <p className="text-slate-500 mb-6">
                        {search ? 'Try a different search term' : 'Get started by adding your first product'}
                    </p>
                    {!search && (
                        <Link
                            to="/products/create"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
                        >
                            <Plus size={18} />
                            <span>Add Product</span>
                        </Link>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Product</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">SKU</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Category</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Pricing</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Stock</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Status</th>
                                    <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {products.map((product) => {
                                    const stockStatus = getStockStatus(product);
                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        {product.images && product.images.length > 0 ? (
                                                            <img 
                                                                src={`/storage/${product.images[0]}`} 
                                                                alt={product.name}
                                                                className="w-12 h-12 rounded-xl object-cover"
                                                            />
                                                        ) : (
                                                            <ImageIcon size={20} className="text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{product.name}</p>
                                                        {product.description && (
                                                            <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {product.sku}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {product.category ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-700">
                                                        {product.category.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">No category</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="space-y-1">
                                                    {product.company_price && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-slate-500">Company:</span>
                                                            <span className="font-semibold text-emerald-600">{formatCurrency(product.company_price)}</span>
                                                        </div>
                                                    )}
                                                    {product.vendor_price && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-slate-500">Vendor:</span>
                                                            <span className="font-semibold text-slate-700">{formatCurrency(product.vendor_price)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-lg text-slate-800">{product.stock_quantity}</span>
                                                        <span className="text-xs text-slate-500">units</span>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                                        stockStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                                        stockStatus.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {stockStatus.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                                    product.is_active 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {product.is_active ? '● Active' : '○ Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Link
                                                        to={`/products/${product.id}/edit`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit Product"
                                                    >
                                                        <Edit size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={18} />
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
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => {
                        const stockStatus = getStockStatus(product);
                        return (
                            <div key={product.id} className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-xl transition-all group">
                                {/* Product Image */}
                                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-indigo-100">
                                    {product.images && product.images.length > 0 ? (
                                        <img 
                                            src={`/storage/${product.images[0]}`} 
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon size={48} className="text-blue-400" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex space-x-2">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm ${
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

                                    <div className="space-y-2 mb-4">
                                        {product.company_price && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">Company Price</span>
                                                <span className="font-bold text-emerald-600">{formatCurrency(product.company_price)}</span>
                                            </div>
                                        )}
                                        {product.vendor_price && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">Vendor Price</span>
                                                <span className="font-semibold text-slate-700">{formatCurrency(product.vendor_price)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                                        <div>
                                            <p className="text-xs text-slate-500">Stock</p>
                                            <p className="font-bold text-lg text-slate-800">{product.stock_quantity}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                            stockStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                            stockStatus.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {stockStatus.label}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-2">
                                        <Link
                                            to={`/products/${product.id}/edit`}
                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-1"
                                        >
                                            <Edit size={16} />
                                            <span>Edit</span>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
