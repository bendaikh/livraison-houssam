import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';

export default function OrderForm() {
    const { formatCurrency } = useSettings();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [deliveryAgents, setDeliveryAgents] = useState([]);
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [confirmationAgents, setConfirmationAgents] = useState([]);
    
    const [formData, setFormData] = useState({
        client_id: '',
        vendor_id: '',
        delivery_agent_id: '',
        delivery_person_id: '',
        confirmation_agent_id: '',
        source: 'manual',
        shipping_address: '',
        notes: '',
        whatsapp: '',
        shipping_cost: 0,
        tax: 0,
        discount: 0
    });

    const [orderItems, setOrderItems] = useState([{
        product_id: '',
        quantity: 1,
        price: 0
    }]);

    const [errors, setErrors] = useState({});
    const [selectedClient, setSelectedClient] = useState(null);

    useEffect(() => {
        fetchClients();
        fetchProducts();
        fetchVendors();
        fetchDeliveryAgents();
        fetchDeliveryPersons();
        fetchConfirmationAgents();
        
        if (isEditing) {
            fetchOrder();
        }
    }, [id]);

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

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

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orders/${id}`);
            const order = response.data;
            
            setFormData({
                client_id: order.client_id || '',
                vendor_id: order.vendor_id || '',
                delivery_agent_id: order.delivery_agent_id || '',
                delivery_person_id: order.delivery_person_id || '',
                confirmation_agent_id: order.confirmation_agent_id || '',
                source: order.source || 'manual',
                shipping_address: order.shipping_address || '',
                notes: order.notes || '',
                whatsapp: order.whatsapp || '',
                shipping_cost: order.shipping_cost || 0,
                tax: order.tax || 0,
                discount: order.discount || 0
            });
            
            if (order.items && order.items.length > 0) {
                setOrderItems(order.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price
                })));
            }
            
            if (order.client) {
                setSelectedClient(order.client);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClientChange = (clientId) => {
        const client = clients.find(c => c.id === parseInt(clientId));
        setSelectedClient(client);
        
        // Only auto-fill whatsapp if it's empty (to avoid overwriting when editing)
        const newWhatsapp = formData.whatsapp || client?.phone || '';
        
        setFormData({
            ...formData,
            client_id: clientId,
            shipping_address: client?.address || formData.shipping_address || '',
            whatsapp: newWhatsapp
        });
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
        const tax = parseFloat(formData.tax || 0);
        const discount = parseFloat(formData.discount || 0);
        return subtotal + shipping + tax - discount;
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                            <select
                                value={formData.client_id}
                                onChange={(e) => handleClientChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">Select Client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} - {client.phone}
                                    </option>
                                ))}
                            </select>
                            {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                            <input
                                type="text"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                            <textarea
                                value={formData.shipping_address}
                                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                                rows="2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.tax}
                                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
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
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-medium">{formatCurrency(parseFloat(formData.tax || 0))}</span>
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
