import React, { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import api from '../utils/api';

/**
 * Reusable modal for creating an order from a product.
 * Lets the user pick a selling price, quantity, customer details and city (to auto-add shipping cost).
 */
export default function OrderModal({
    product,
    initialQuantity = 1,
    formatCurrency = (v) => v,
    source = 'marketplace',
    onClose = () => {},
    onOrderCreated
}) {
    const buyPrice = parseFloat(
        product?.company_price ??
        product?.cost_price ??
        product?.vendor_price ??
        product?.price ??
        0
    );

    const recommendedSellPrice = product?.recommended_price != null
        ? parseFloat(product.recommended_price)
        : null;

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
        sell_price: (recommendedSellPrice ?? buyPrice).toFixed(2),
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
        if (!cityName) return 0; // shipping is added only after city selection

        const match = findCity(cityName);
        if (match && match.delivery_cost !== null && match.delivery_cost !== undefined) {
            return parseFloat(match.delivery_cost);
        }

        return isCasaCity(cityName) ? 25 : 35;
    };

    const sellPrice = parseFloat(orderForm.sell_price || 0);
    const companyPrice = buyPrice;
    const shippingPrice = getCityDeliveryCost(orderForm.city);
    const customerTotal = sellPrice * quantity;
    const estimatedBenefit = (sellPrice - companyPrice) * quantity - shippingPrice;
    const estimatedMargin = customerTotal > 0 ? (estimatedBenefit / customerTotal) * 100 : 0;
    const customerTotalWithShipping = customerTotal + shippingPrice;

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
                source
            };

            await api.post('/orders', orderData);
            alert('Order created successfully!');
            onClose();
            if (onOrderCreated) {
                onOrderCreated();
            } else {
                window.location.href = '/orders';
            }
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const productImage = product?.images?.[0]
        ? (product.images[0].startsWith('http') ? product.images[0] : `/storage/${product.images[0]}`)
        : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="sticky top-0 p-6 border-b border-gray-200 flex items-center justify-between bg-white">
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-semibold">Order</p>
                        <h2 className="text-xl font-bold text-gray-900">{product?.name}</h2>
                        <p className="text-sm text-gray-500">SKU: {product?.sku}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleOrderSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Product snapshot */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-40 flex items-center justify-center">
                                {productImage ? (
                                    <img src={productImage} alt={product?.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 text-sm">No image</div>
                                )}
                            </div>
                        </div>
                        {recommendedSellPrice !== null && !Number.isNaN(recommendedSellPrice) && (
                            <div className="md:col-span-2 p-3 rounded-lg border border-blue-200 bg-blue-50">
                                <p className="text-xs text-blue-700 font-semibold">Recommended Sell Price</p>
                                <p className="text-lg font-bold text-blue-900">{formatCurrency(recommendedSellPrice)}</p>
                            </div>
                        )}
                    </div>

                    {/* Pricing & Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Selling Price *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={orderForm.sell_price}
                                onChange={(e) => setOrderForm({...orderForm, sell_price: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                placeholder="Selling price"
                            />
                            <p className="mt-1 text-xs text-gray-500">Set your selling price; shipping is added after city selection.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                <button 
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <Minus size={16} />
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
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Customer info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="md:col-span-2">
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
                        <div className="md:col-span-2">
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

                    {/* Summary */}
                    <div className="border-t-2 border-gray-200 pt-4 space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Product: <strong>{product?.name}</strong></span>
                                <span className="text-sm text-gray-600">Quantity: <strong>×{quantity}</strong></span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Customer Total</p>
                                    <p className="font-bold text-gray-900">{formatCurrency(customerTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Shipping</p>
                                    <p className="font-bold text-gray-900">
                                        {orderForm.city ? formatCurrency(shippingPrice) : '--'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Benefit {orderForm.city ? '(after shipping)' : '(before shipping)'}</p>
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
