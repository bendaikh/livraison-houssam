import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useSettings } from '../../contexts/SettingsContext';

export default function ProductForm() {
    const { formatCurrency, settings } = useSettings();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [sellerScope, setSellerScope] = useState('all');
    const [selectedSellers, setSelectedSellers] = useState([]);
    const [sellerSearchTerm, setSellerSearchTerm] = useState('');
    const [initialSellerAssignments, setInitialSellerAssignments] = useState([]);
    const [sellerSelectionInitialized, setSellerSelectionInitialized] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        category_id: '',
        company_price: '',
        vendor_price: '',
        recommended_price: '',
        stock_quantity: 0,
        min_stock_quantity: 10,
        is_active: true,
        weight: '',
        weight_unit: 'kg'
    });
    const [images, setImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [errors, setErrors] = useState({});
    const toNumber = (value) => parseFloat(value || 0);
    const recommendedSellingPrice = toNumber(formData.recommended_price);
    const sellingPrice = toNumber(formData.company_price);
    const costPrice = toNumber(formData.vendor_price);
    const recommendedGrossProfit = recommendedSellingPrice - sellingPrice;
    const companyGrossProfit = sellingPrice - costPrice;
    const recommendedMargin = recommendedSellingPrice > 0
        ? (recommendedGrossProfit / recommendedSellingPrice) * 100
        : 0;
    const companyMargin = sellingPrice > 0
        ? (companyGrossProfit / sellingPrice) * 100
        : 0;
    const getImageSrc = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        if (imagePath.startsWith('/')) return imagePath;
        return `/storage/${imagePath}`;
    };

    // Reset seller assignment state when switching between create/edit routes
    useEffect(() => {
        setSellerScope('all');
        setSelectedSellers([]);
        setInitialSellerAssignments([]);
        setSellerSelectionInitialized(false);
    }, [id]);

    useEffect(() => {
        fetchCategories();
        fetchVendors();
        if (isEditing) {
            fetchProduct();
        }
    }, [id]);

    const activeVendors = useMemo(
        () => vendors.filter((vendor) => vendor.is_active !== false),
        [vendors]
    );

    const activeVendorIds = useMemo(
        () => activeVendors.map((vendor) => vendor.id),
        [activeVendors]
    );

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchVendors = async () => {
        try {
            const response = await api.get('/vendors');
            setVendors(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    };

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/products/${id}`);
            const product = response.data;
            setFormData({
                name: product.name,
                sku: product.sku,
                description: product.description || '',
                category_id: product.category_id || '',
                company_price: product.company_price || '',
                vendor_price: product.vendor_price || '',
                recommended_price: product.recommended_price || '',
                stock_quantity: product.stock_quantity,
                min_stock_quantity: product.min_stock_quantity,
                is_active: product.is_active,
                weight: product.weight || '',
                weight_unit: product.weight_unit || 'kg'
            });
            setExistingImages(product.images || []);

            const assignedSellerIds = (product.marketplace_products || []).map(mp => Number(mp.vendor_id));
            setInitialSellerAssignments(assignedSellerIds);
            setSelectedSellers(assignedSellerIds);
            setSellerSelectionInitialized(false);
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initialize seller selection once vendors (and, when editing, assignments) are available
    useEffect(() => {
        if (sellerSelectionInitialized) return;

        if (vendors.length === 0) {
            return;
        }

        if (isEditing) {
            const hasAllActive = activeVendorIds.length > 0 && initialSellerAssignments.length >= activeVendorIds.length;
            setSellerScope(hasAllActive ? 'all' : 'specific');
            setSelectedSellers(hasAllActive ? activeVendorIds : initialSellerAssignments);
        } else {
            setSellerScope('all');
            setSelectedSellers(activeVendorIds);
        }

        setSellerSelectionInitialized(true);
    }, [
        vendors,
        activeVendorIds,
        initialSellerAssignments,
        sellerSelectionInitialized,
        isEditing
    ]);

    // Keep "all sellers" selection in sync if vendor list changes
    useEffect(() => {
        if (sellerScope === 'all') {
            setSelectedSellers(activeVendorIds);
        }
    }, [sellerScope, activeVendorIds]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (sellerScope === 'specific' && selectedSellers.length === 0) {
            setErrors({ seller_ids: ['Please select at least one seller'] });
            return;
        }

        setLoading(true);

        try {
            const submitData = new FormData();
            
            // Append all form fields
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                
                // Skip empty values except for numbers (including 0)
                if (value === '' || value === null || value === undefined) {
                    return;
                }
                
                // Convert boolean to string for FormData
                if (typeof value === 'boolean') {
                    submitData.append(key, value ? '1' : '0');
                } else {
                    submitData.append(key, value);
                }
            });

            // Append images
            images.forEach((image, index) => {
                submitData.append(`images[${index}]`, image);
            });

            // Seller visibility
            submitData.append('seller_scope', sellerScope);
            if (sellerScope === 'specific') {
                selectedSellers.forEach((sellerId, index) => {
                    submitData.append(`seller_ids[${index}]`, sellerId);
                });
            }

            // For editing, add _method field to simulate PUT request (required for multipart/form-data)
            if (isEditing) {
                submitData.append('_method', 'PUT');
            }

            // Debug: Log what we're sending
            console.log('Form Data being sent:');
            for (let [key, value] of submitData.entries()) {
                console.log(key, ':', value);
            }

            // Always use POST when sending FormData (Laravel handles _method internally)
            await api.post(isEditing ? `/products/${id}` : '/products', submitData);

            navigate(appPath('/products'));
        } catch (error) {
            console.error('Error response:', error.response?.data);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            if (error.response?.data?.message) {
                alert('Error: ' + error.response.data.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages([...images, ...files]);
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const removeExistingImage = async (imagePath) => {
        if (window.confirm('Are you sure you want to delete this image?')) {
            try {
                await api.delete(`/products/${id}/images`, {
                    data: { image_path: imagePath }
                });
                setExistingImages(existingImages.filter(img => img !== imagePath));
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {isEditing ? 'Edit Product' : 'Create New Product'}
                    </h1>
                    <p className="text-slate-600 mt-1">
                        {isEditing ? 'Update product information' : 'Add a new product to your inventory'}
                    </p>
                </div>
                <button
                    onClick={() => navigate(appPath('/products'))}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-all font-medium"
                >
                    ← Back
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8 space-y-8">
                {/* Error Display */}
                {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-semibold text-red-800">Validation Errors</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        {Object.entries(errors).map(([field, messages]) => (
                                            <li key={field}>
                                                <strong>{field}:</strong> {Array.isArray(messages) ? messages[0] : messages}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Basic Information */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Basic Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Product Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Enter product name"
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1.5 flex items-center"><span className="mr-1">⚠</span>{errors.name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">SKU *</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., PROD-001"
                                required
                            />
                            {errors.sku && <p className="text-red-500 text-xs mt-1.5 flex items-center"><span className="mr-1">⚠</span>{errors.sku[0]}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="4"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                placeholder="Describe your product..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            >
                                <option value="">Select Category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            {categories.length === 0 && (
                                <p className="text-amber-600 text-xs mt-1.5 flex items-center">
                                    <span className="mr-1">ℹ</span>
                                    No categories available. Create one in the Categories section.
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Who can sell this product? *</label>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                                        <input
                                            type="radio"
                                            name="seller_scope"
                                            value="all"
                                            checked={sellerScope === 'all'}
                                            onChange={() => {
                                                setSellerScope('all');
                                                setSelectedSellers(activeVendorIds);
                                                setSellerSearchTerm('');
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">All Sellers</span>
                                        <span className="text-xs text-slate-500">({activeVendors.length} active)</span>
                                    </label>

                                    <label className="flex items-center space-x-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                                        <input
                                            type="radio"
                                            name="seller_scope"
                                            value="specific"
                                            checked={sellerScope === 'specific'}
                                            onChange={() => setSellerScope('specific')}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Only Specific Sellers</span>
                                        <span className="text-xs text-slate-500">(Select below)</span>
                                    </label>
                                </div>
                            </div>

                            {sellerScope === 'specific' && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Search sellers..."
                                        value={sellerSearchTerm}
                                        onChange={(e) => setSellerSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
                                        {activeVendors
                                            .filter(vendor => vendor.name.toLowerCase().includes(sellerSearchTerm.toLowerCase()))
                                            .map(vendor => (
                                                <div
                                                    key={vendor.id}
                                                    onClick={() => {
                                                        setSelectedSellers(prev =>
                                                            prev.includes(vendor.id)
                                                                ? prev.filter(id => id !== vendor.id)
                                                                : [...prev, vendor.id]
                                                        );
                                                    }}
                                                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                                                        selectedSellers.includes(vendor.id)
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-slate-300 bg-white hover:border-slate-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                                            selectedSellers.includes(vendor.id)
                                                                ? 'border-blue-500 bg-blue-500'
                                                                : 'border-slate-300'
                                                        }`}>
                                                            {selectedSellers.includes(vendor.id) && (
                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 truncate">{vendor.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                    {selectedSellers.length > 0 && (
                                        <p className="text-xs text-slate-600 mt-2">{selectedSellers.length} seller{selectedSellers.length !== 1 ? 's' : ''} selected</p>
                                    )}
                                    {errors.seller_ids && <p className="text-red-500 text-xs mt-2 flex items-center"><span className="mr-1">⚠</span>{errors.seller_ids[0]}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Pricing Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Cost Price (Prix de revient) *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{settings.currency_symbol}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.vendor_price}
                                    onChange={(e) => setFormData({ ...formData, vendor_price: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">The price at which we bought the product</p>
                            {errors.vendor_price && <p className="text-red-500 text-xs mt-1.5 flex items-center"><span className="mr-1">⚠</span>{errors.vendor_price[0]}</p>}
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Selling Price (Prix de vente) *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{settings.currency_symbol}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.company_price}
                                    onChange={(e) => setFormData({ ...formData, company_price: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">The price at which we sell the product on the marketplace</p>
                            {errors.company_price && <p className="text-red-500 text-xs mt-1.5 flex items-center"><span className="mr-1">⚠</span>{errors.company_price[0]}</p>}
                        </div>
                    </div>
                    
                    {/* Recommended Selling Price & Profit Calculator */}
                    <div className="space-y-6">
                        {/* Recommended Selling Price */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Recommended Selling Price
                                <span className="ml-2 text-xs font-normal text-slate-500">(Seller can change this)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{settings.currency_symbol}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.recommended_price}
                                    onChange={(e) => setFormData({ ...formData, recommended_price: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">Suggested price for sellers to use</p>
                            {errors.recommended_price && <p className="text-red-500 text-xs mt-1.5 flex items-center"><span className="mr-1">⚠</span>{errors.recommended_price[0]}</p>}
                        </div>

                        {/* Seller Profit Calculator */}
                        {formData.recommended_price && formData.company_price && (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Gross Profit Estimate</h3>
                                        <p className="text-xs text-slate-600 mt-1">Seller formula: Recommended Selling Price - Selling Price</p>
                                    </div>
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Selling Price */}
                                    <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                                        <span className="text-sm text-slate-600">Selling Price (Recommended)</span>
                                        <span className="text-lg font-semibold text-slate-800">
                                            {formatCurrency(recommendedSellingPrice)}
                                        </span>
                                    </div>

                                    {/* Product Cost */}
                                    <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                                        <span className="text-sm text-slate-600">Selling Price</span>
                                        <span className="text-lg font-medium text-red-600">
                                            - {formatCurrency(sellingPrice)}
                                        </span>
                                    </div>

                                    {/* Net Profit */}
                                    <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-emerald-300">
                                        <span className="text-base font-bold text-slate-800">Gross Profit</span>
                                        <span className={`text-2xl font-bold ${recommendedGrossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(recommendedGrossProfit)}
                                        </span>
                                    </div>

                                    {/* Profit Percentage */}
                                    <div className="bg-white rounded-lg p-3 mt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-600">Profit Margin</span>
                                            <span className={`text-sm font-bold ${recommendedGrossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {recommendedMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-800">
                                        <strong>Note:</strong> Seller profit = recommended selling price - selling price.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Profit Margin Indicator */}
                    {formData.company_price && formData.vendor_price && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Profit Margin</p>
                                    <p className="text-xs text-slate-600 mt-0.5">Based on selling price minus cost price</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-bold ${companyGrossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(companyGrossProfit)}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        {companyMargin.toFixed(1)}% margin
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stock & Weight */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Stock & Weight</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Stock Quantity *</label>
                            <input
                                type="number"
                                value={formData.stock_quantity}
                                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="0"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Current stock level</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Min Stock Quantity *</label>
                            <input
                                type="number"
                                value={formData.min_stock_quantity}
                                onChange={(e) => setFormData({ ...formData, min_stock_quantity: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="10"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Alert threshold</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Weight</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Product weight</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Weight Unit</label>
                            <select
                                value={formData.weight_unit}
                                onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                            >
                                <option value="kg">Kilogram (kg)</option>
                                <option value="g">Gram (g)</option>
                                <option value="lb">Pound (lb)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1.5">Unit of measurement</p>
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Product Images</h2>
                    </div>
                    
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-3">Current Images</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {existingImages.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={getImageSrc(image)}
                                            alt={`Product ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-xl border-2 border-slate-200 group-hover:border-blue-400 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(image)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="text-sm font-bold">×</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Images Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Add New Images</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-all bg-slate-50">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                id="image-upload"
                            />
                            <label htmlFor="image-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">Click to upload images</p>
                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            </label>
                        </div>
                        
                        {images.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-slate-600 mb-3">New Images ({images.length})</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {images.map((image, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={URL.createObjectURL(image)}
                                                alt={`New ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-xl border-2 border-green-300 group-hover:border-green-500 transition-all"
                                            />
                                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-lg font-medium">
                                                New
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="text-sm font-bold">×</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-emerald-500 transition-all"></div>
                            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-7"></div>
                        </div>
                        <div className="ml-4">
                            <span className="text-sm font-semibold text-slate-700">Product Status</span>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {formData.is_active ? 'Active - Visible to customers' : 'Inactive - Hidden from customers'}
                            </p>
                        </div>
                    </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200">
                    <button
                        type="button"
                        onClick={() => navigate(appPath('/products'))}
                        className="px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:shadow-none flex items-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
