import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { ImageIcon, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import OrderModal from '../../components/OrderModal';

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

    const recommendedSellPrice = product?.recommended_price != null
        ? parseFloat(product.recommended_price)
        : null;
    // Seller cost for this product
    const buyPrice = parseFloat(
        (product?.company_price ??
        product?.price ??
        product?.vendor_price ??
        product?.cost_price ??
        0)
    );

    const benefitPerUnit = recommendedSellPrice - buyPrice;
    const benefitMargin = recommendedSellPrice > 0 ? (benefitPerUnit / recommendedSellPrice) * 100 : 0;

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
                        {recommendedSellPrice !== null && !Number.isNaN(recommendedSellPrice) && (
                            <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 mb-6">
                                <p className="text-xs text-blue-600 font-semibold mb-1 uppercase">Recommended Sell Price</p>
                                <p className="text-2xl font-bold text-blue-900">{formatCurrency(recommendedSellPrice)}</p>
                            </div>
                        )}

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
                    initialQuantity={quantity}
                    formatCurrency={formatCurrency}
                    source="marketplace"
                    onClose={() => setShowOrderForm(false)}
                    onOrderCreated={() => window.location.href = '/orders'}
                />
            )}
        </div>
    );
}
