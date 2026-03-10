import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageIcon, X, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const getImageSrc = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        if (imagePath.startsWith('/')) return imagePath;
        return `/storage/${imagePath}`;
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/products/${id}`);
            const productData = response.data.data || response.data;
            setProduct(productData);
            setSelectedImage(productData.images?.[0] || null);
        } catch (error) {
            console.error('Error fetching product:', error);
            alert('Failed to load product');
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-semibold">Loading product...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-600">Product not found</p>
            </div>
        );
    }

    const increaseQty = () => setQuantity((prev) => prev + 1);
    const decreaseQty = () => setQuantity((prev) => Math.max(1, prev - 1));

    const sellingPrice = parseFloat(product.company_price || product.price || product.vendor_price || 0);
    const costPrice = parseFloat(product.cost_price || product.vendor_price || 0);
    const benefitPerUnit = sellingPrice - costPrice;
    const benefitMargin = sellingPrice > 0 ? (benefitPerUnit / sellingPrice) * 100 : 0;

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/products')}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-all"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Products</span>
                </button>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left: Images Section */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-4">
                            {/* Main Image */}
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 h-[600px] flex items-center justify-center">
                                {selectedImage ? (
                                    <img src={getImageSrc(selectedImage)} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-300 flex flex-col items-center space-y-2">
                                        <ImageIcon size={80} />
                                        <p className="text-sm">No image available</p>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Gallery */}
                            {product.images?.length > 1 && (
                                <div className="grid grid-cols-6 gap-2">
                                    {product.images.map((img, idx) => (
                                        <button
                                            key={`${img}-${idx}`}
                                            onClick={() => setSelectedImage(img)}
                                            className={`rounded-lg overflow-hidden border-2 transition-all h-24 ${selectedImage === img ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <img src={getImageSrc(img)} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Details & Order Section */}
                    <div className="lg:col-span-1">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                                </div>
                                {product.category && (
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                        {product.category.name}
                                    </span>
                                )}
                            </div>

                            {product.description && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Pricing Grid */}
                        {/* Recommended Price */}
                        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 mb-6">
                            <p className="text-xs text-blue-600 font-semibold mb-1 uppercase">Recommended Price</p>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(sellingPrice)}</p>
                        </div>

                        {/* Stock Status */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-600 font-semibold">AVAILABLE STOCK</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{product.stock_quantity} units</p>
                            </div>
                            <div>
                                <span className={`text-sm font-semibold px-4 py-2 rounded-lg border ${
                                    product.stock_quantity > 10 ? 'bg-green-50 text-green-700 border-green-200' :
                                    product.stock_quantity > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {product.stock_quantity > 10 ? 'In Stock' :
                                     product.stock_quantity > 0 ? 'Low Stock' :
                                     'Out of Stock'}
                                </span>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="mb-6">
                            <label className="text-sm font-semibold text-gray-700 mb-3 block">Quantity</label>
                            <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <button 
                                    onClick={decreaseQty}
                                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <Minus size={18} className="text-gray-600" />
                                </button>
                                <span className="px-6 py-3 font-bold text-xl min-w-[80px] text-center text-gray-900">{quantity}</span>
                                <button 
                                    onClick={increaseQty}
                                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <Plus size={18} className="text-gray-600" />
                                </button>
                            </div>
                        </div>

                        {/* Order Button */}
                        <button
                            onClick={() => setShowOrderForm(true)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-base shadow-sm transition-all flex items-center justify-center space-x-2"
                        >
                            <ShoppingBag size={20} />
                            <span>Place Order</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Order Modal */}
            {showOrderForm && (
                <OrderModal
                    product={product}
                    quantity={quantity}
                    formatCurrency={formatCurrency}
                    onClose={() => setShowOrderForm(false)}
                />
            )}
        </div>
    );
}

// Order Modal Component
function OrderModal({ product, quantity: initialQuantity, formatCurrency, onClose }) {
    const defaultSellPrice = parseFloat(product.recommended_price || product.company_price || product.price || 0);
    const [cities, setCities] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [orderForm, setOrderForm] = useState({
        client_name: '',
        client_phone: '',
        client_email: '',
        shipping_address: '',
        city: '',
        sell_price: defaultSellPrice.toFixed(2),
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const normalizeCity = (value) =>
        (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    const isCasaCity = (value) => {
        const normalized = normalizeCity(value);
        return normalized === 'casablanca'
            || normalized === 'casa'
            || normalized.includes('casablanca')
            || normalized.startsWith('casa');
    };

    const findCity = (name) => {
        const normalized = normalizeCity(name);
        return cities.find((city) => normalizeCity(city.name) === normalized);
    };

    const getCityDeliveryCost = (cityName) => {
        if (!cityName) return 35;

        const match = findCity(cityName);
        if (match && match.delivery_cost !== null && match.delivery_cost !== undefined) {
            return parseFloat(match.delivery_cost);
        }

        return isCasaCity(cityName) ? 25 : 35;
    };

    const sellPrice = parseFloat(orderForm.sell_price || 0);
    const companyPrice = parseFloat(product.company_price || product.price || 0);
    const shippingPrice = getCityDeliveryCost(orderForm.city);
    const customerTotal = sellPrice * quantity;
    const companyTotal = companyPrice * quantity;
    const estimatedBenefit = customerTotal - shippingPrice - companyTotal;
    const estimatedMargin = customerTotal > 0 ? (estimatedBenefit / customerTotal) * 100 : 0;
    const filteredCities = citySearch.trim() === '' 
        ? [] 
        : cities
            .filter((city) => city.name.toLowerCase().includes(citySearch.toLowerCase()))
            .slice(0, 100);

    useEffect(() => {
        fetchAvailableCities();
    }, []);

    const fetchAvailableCities = async () => {
        try {
            setLoadingCities(true);
            const response = await api.get('/cities');
            if (response.data && Array.isArray(response.data)) {
                const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
                setCities(sorted);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setLoadingCities(false);
        }
    };

    const handleOrderSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            
            const orderData = {
                client_name: orderForm.client_name,
                client_phone: orderForm.client_phone,
                client_email: orderForm.client_email,
                shipping_address: orderForm.shipping_address,
                city: orderForm.city,
                notes: orderForm.notes,
                shipping_cost: shippingPrice,
                items: [{
                    product_id: product.id,
                    quantity: quantity,
                    price: sellPrice,
                    subtotal: customerTotal
                }],
                source: 'marketplace'
            };

            const response = await api.post('/orders', orderData);
            alert('Order created successfully!');
            onClose();
            window.location.href = '/orders';
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="sticky top-0 p-6 border-b border-gray-200 flex items-center justify-between bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Complete Your Order</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleOrderSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* Sell Price & Quantity Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Sell Price */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sell Price *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={orderForm.sell_price}
                                    onChange={(e) => setOrderForm({...orderForm, sell_price: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Seller sell price"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        −
                                    </button>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="flex-1 px-4 py-2 text-center font-semibold border-0 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Client Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Client Name *</label>
                            <input
                                type="text"
                                required
                                value={orderForm.client_name}
                                onChange={(e) => setOrderForm({...orderForm, client_name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="Full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                            <input
                                type="tel"
                                required
                                value={orderForm.client_phone}
                                onChange={(e) => setOrderForm({...orderForm, client_phone: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="+212 6XX XXX XXX"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={orderForm.client_email}
                                onChange={(e) => setOrderForm({...orderForm, client_email: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                            {loadingCities ? (
                                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center text-sm font-medium">
                                    Loading cities...
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={citySearch || orderForm.city}
                                        onChange={(e) => {
                                            setCitySearch(e.target.value);
                                            setShowCityDropdown(true);
                                        }}
                                        onFocus={() => setShowCityDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                        placeholder="Select or type city..."
                                    />
                                    {orderForm.city && !citySearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOrderForm({...orderForm, city: ''});
                                                setCitySearch('');
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    
                                    {/* Dropdown - only show when searching */}
                                    {showCityDropdown && citySearch.trim() !== '' && (
                                        <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white max-h-48 overflow-y-auto shadow-lg z-10">
                                            {filteredCities.length > 0 ? (
                                                filteredCities.map((city) => (
                                                    <button
                                                        type="button"
                                                        key={city.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setOrderForm({...orderForm, city: city.name});
                                                            setCitySearch('');
                                                            setShowCityDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>{city.name}</span>
                                                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                                {getCityDeliveryCost(city.name)} DH
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-center text-sm text-gray-500">
                                                    No matching cities
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                            <input
                                type="text"
                                required
                                value={orderForm.shipping_address}
                                onChange={(e) => setOrderForm({...orderForm, shipping_address: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="Full address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                            <textarea
                                value={orderForm.notes}
                                onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="Additional notes..."
                                rows="2"
                            />
                        </div>
                    </div>

                    {/* Order Summary at Bottom */}
                    <div className="border-t-2 border-gray-200 pt-4 mt-4 space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Product: <strong>{product.name}</strong></span>
                                <span className="text-sm text-gray-600">Quantity: <strong>×{quantity}</strong></span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Total Client</p>
                                    <p className="font-bold text-gray-900">{formatCurrency(customerTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Shipping</p>
                                    <p className="font-bold text-gray-900">{formatCurrency(shippingPrice)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Benefit</p>
                                    <p className={`font-bold ${estimatedBenefit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(estimatedBenefit)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                            >
                                {submitting ? 'Creating...' : 'Confirm Order'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
