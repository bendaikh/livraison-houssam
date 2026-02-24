import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';

export default function OrderForm() {
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [deliveryAgents, setDeliveryAgents] = useState([]);
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [confirmationAgents, setConfirmationAgents] = useState([]);
    const [cities, setCities] = useState([]);
    
    const [formData, setFormData] = useState({
        client_name: '',
        client_phone: '',
        vendor_id: '',
        delivery_agent_id: '',
        delivery_person_id: '',
        confirmation_agent_id: '',
        source: 'manual',
        shipping_address: '',
        city: '',
        notes: '',
        whatsapp: '',
        shipping_cost: 0,
        discount: 0
    });

    const [orderItems, setOrderItems] = useState([{
        product_id: '',
        quantity: 1,
        price: 0
    }]);

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchProducts();
        fetchVendors();
        fetchDeliveryAgents();
        fetchDeliveryPersons();
        fetchConfirmationAgents();
        fetchCities();
        
        if (isEditing) {
            fetchOrder();
        } else {
            // Auto-set vendor_id for sellers when creating new orders
            if (user?.vendor?.id) {
                console.log('Setting vendor_id for seller:', user.vendor.id);
                setFormData(prev => ({ ...prev, vendor_id: user.vendor.id }));
            }
        }
    }, [id, user]);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products?is_active=1');
            setProducts(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
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

    const fetchDeliveryAgents = async () => {
        try {
            const response = await api.get('/delivery-agents');
            setDeliveryAgents(response.data);
        } catch (error) {
            console.error('Error fetching delivery agents:', error);
        }
    };

    const fetchDeliveryPersons = async () => {
        try {
            const response = await api.get('/delivery-persons');
            setDeliveryPersons(response.data);
        } catch (error) {
            console.error('Error fetching delivery persons:', error);
        }
    };

    const fetchConfirmationAgents = async () => {
        try {
            const response = await api.get('/confirmation-agents');
            setConfirmationAgents(response.data);
        } catch (error) {
            console.error('Error fetching confirmation agents:', error);
        }
    };

    const fetchCities = async () => {
        try {
            const response = await api.get('/cities');
            setCities(response.data.filter(city => city.is_active));
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orders/${id}`);
            const order = response.data;
            
            setFormData({
                client_name: order.client?.name || '',
                client_phone: order.client?.phone || '',
                vendor_id: order.vendor_id || '',
                delivery_agent_id: order.delivery_agent_id || '',
                delivery_person_id: order.delivery_person_id || '',
                confirmation_agent_id: order.confirmation_agent_id || '',
                source: order.source || 'manual',
                shipping_address: order.shipping_address || '',
                city: order.city || '',
                notes: order.notes || '',
                whatsapp: order.whatsapp || '',
                shipping_cost: order.shipping_cost || 0,
                discount: order.discount || 0
            });
            
            if (order.items && order.items.length > 0) {
                setOrderItems(order.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price
                })));
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProductChange = (index, productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        const newItems = [...orderItems];
        newItems[index] = {
            ...newItems[index],
            product_id: productId,
            price: product?.price || 0
        };
        setOrderItems(newItems);
    };

    const addOrderItem = () => {
        setOrderItems([...orderItems, { product_id: '', quantity: 1, price: 0 }]);
    };

    const removeOrderItem = (index) => {
        if (orderItems.length > 1) {
            setOrderItems(orderItems.filter((_, i) => i !== index));
        }
    };

    const updateOrderItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;
        setOrderItems(newItems);
    };

    const calculateSubtotal = () => {
        return orderItems.reduce((sum, item) => {
            return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const shipping = parseFloat(formData.shipping_cost || 0);
        const discount = parseFloat(formData.discount || 0);
        return subtotal + shipping - discount;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const submitData = {
                ...formData,
                items: orderItems
            };

            if (isEditing) {
                await api.put(`/orders/${id}`, submitData);
            } else {
                await api.post('/orders', submitData);
            }
            
            navigate('/orders');
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Order' : 'Create Order'}</h1>
                <button
                    onClick={() => navigate('/orders')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    Back to Orders
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Details */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Client Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder="Enter client name"
                            />
                            {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Client Phone <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.client_phone}
                                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder="Enter client phone"
                            />
                            {errors.client_phone && <p className="text-red-500 text-xs mt-1">{errors.client_phone[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                            <input
                                type="text"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter WhatsApp number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <select
                                value={formData.city}
                                onChange={(e) => {
                                    const selectedCity = cities.find(c => c.name === e.target.value);
                                    setFormData({ 
                                        ...formData, 
                                        city: e.target.value,
                                        shipping_cost: selectedCity ? selectedCity.delivery_cost : formData.shipping_cost
                                    });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select city</option>
                                {cities.map(city => (
                                    <option key={city.id} value={city.name}>
                                        {city.name} - {city.delivery_cost} DH
                                    </option>
                                ))}
                            </select>
                            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                            <input
                                type="text"
                                value={formData.shipping_address}
                                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter shipping address"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Hide seller selection for users who are sellers */}
                        {!user?.vendor && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
                                <select
                                    value={formData.vendor_id}
                                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select Seller</option>
                                    {vendors.map(vendor => (
                                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Hide Agent Confirmation and Delivery Person for sellers - only admin assigns these */}
                        {!user?.vendor && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent Confirmation</label>
                                    <select
                                        value={formData.confirmation_agent_id}
                                        onChange={(e) => setFormData({ ...formData, confirmation_agent_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Agent</option>
                                        {confirmationAgents.map(agent => (
                                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Person</label>
                                    <select
                                        value={formData.delivery_person_id}
                                        onChange={(e) => setFormData({ ...formData, delivery_person_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Delivery Person</option>
                                        {deliveryPersons.map(person => (
                                            <option key={person.id} value={person.id}>{person.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Person who physically delivers the product</p>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                            <select
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="manual">Manual</option>
                                <option value="shopify">Shopify</option>
                                <option value="delivery_company">Delivery Company</option>
                                <option value="marketplace">Marketplace</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="2"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Products</h2>
                        <button
                            type="button"
                            onClick={addOrderItem}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                            + Add Product
                        </button>
                    </div>

                    <div className="space-y-3">
                        {orderItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={item.product_id}
                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} - {product.sku}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => updateOrderItem(index, 'price', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                                    <input
                                        type="text"
                                        value={formatCurrency(item.price * item.quantity)}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                    />
                                </div>

                                <div className="col-span-1">
                                    {orderItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOrderItem(index)}
                                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.shipping_cost}
                                    onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.discount}
                                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping:</span>
                                <span className="font-medium">{formatCurrency(parseFloat(formData.shipping_cost || 0))}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Discount:</span>
                                <span className="font-medium text-red-600">-{formatCurrency(parseFloat(formData.discount || 0))}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between">
                                <span className="font-semibold text-lg">Total:</span>
                                <span className="font-bold text-lg text-blue-600">{formatCurrency(calculateTotal())}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/orders')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Order' : 'Create Order')}
                    </button>
                </div>
            </form>
        </div>
    );
}
