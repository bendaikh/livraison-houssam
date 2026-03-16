import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';

const STATUS_OPTIONS = [
    'pending',
    'confirmed',
    'picked_up',
    'ready_for_shipping',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refused',
    'returned',
];

export default function ConfirmationWorkflowForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState(null);
    const [products, setProducts] = useState([]);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        status: 'pending',
        callback_date: '',
    });
    const [upsellItems, setUpsellItems] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [orderResponse, productsResponse] = await Promise.all([
                api.get(`/orders/${id}`),
                api.get('/products?is_active=1'),
            ]);

            const currentOrder = orderResponse.data;
            setOrder(currentOrder);
            setProducts(productsResponse.data.data || productsResponse.data || []);
            setFormData({
                status: currentOrder.status || 'pending',
                callback_date: currentOrder.callback_date ? String(currentOrder.callback_date).slice(0, 10) : '',
            });
            setUpsellItems(
                (currentOrder.items || [])
                    .filter((item) => item.is_upsell)
                    .map((item) => ({
                        product_id: String(item.product_id),
                        quantity: item.quantity,
                        price: item.price,
                    }))
            );
        } catch (error) {
            console.error('Error fetching confirmation workflow data:', error);
        } finally {
            setLoading(false);
        }
    };

    const baseItems = useMemo(
        () => (order?.items || []).filter((item) => !item.is_upsell),
        [order]
    );

    const addUpsellRow = () => {
        setUpsellItems((prev) => [...prev, { product_id: '', quantity: 1, price: 0 }]);
    };

    const updateUpsellItem = (index, field, value) => {
        setUpsellItems((prev) => prev.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            const updated = { ...item, [field]: value };

            if (field === 'product_id') {
                const product = products.find((entry) => String(entry.id) === String(value));
                updated.price = product?.recommended_price || product?.price || 0;
            }

            return updated;
        }));
    };

    const removeUpsellItem = (index) => {
        setUpsellItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const upsellTotal = useMemo(() => {
        return upsellItems.reduce((sum, item) => {
            return sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity || 0, 10) || 0));
        }, 0);
    }, [upsellItems]);

    const existingUpsellTotal = useMemo(() => {
        return (order?.items || [])
            .filter((item) => item.is_upsell)
            .reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
    }, [order]);

    const isStatusReadOnly = useMemo(() => {
        if (!order) {
            return false;
        }

        if (order.delivery_tracking_code) {
            return true;
        }

        if (!order.delivery_person_id) {
            return false;
        }

        const deliveryManagedStatuses = [
            'picked_up',
            'ready_for_shipping',
            'shipped',
            'out_for_delivery',
            'delivered',
            'cancelled',
            'refused',
            'returned',
            'return_requested',
        ];

        return deliveryManagedStatuses.includes(order.status)
            || Boolean(order.picked_up_at)
            || Boolean(order.ready_for_shipping_at)
            || Boolean(order.sent_to_delivery_at)
            || Boolean(order.out_for_delivery_at)
            || Boolean(order.shipped_at)
            || Boolean(order.delivered_at)
            || Boolean(order.cancelled_at)
            || Boolean(order.refused_at)
            || Boolean(order.returned_at);
    }, [order]);

    const statusReadOnlyMessage = order?.delivery_tracking_code
        ? 'Status is now controlled by the delivery company because a tracking code exists.'
        : 'Status is now controlled by delivery handling updates.';

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});

        try {
            setSaving(true);
            await api.patch(`/orders/${id}/confirmation-workflow`, {
                status: formData.status,
                callback_date: formData.callback_date || null,
                upsell_items: upsellItems
                    .filter((item) => item.product_id)
                    .map((item) => ({
                        product_id: Number(item.product_id),
                        quantity: Number(item.quantity),
                        price: Number(item.price),
                    })),
            });
            navigate('/orders');
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                alert(error.response?.data?.message || 'Failed to save confirmation workflow.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="text-slate-500">Loading confirmation workflow...</div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <p className="text-slate-500">Order not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Confirmation Workflow</h1>
                    <p className="text-slate-500 mt-1">{order.order_number} • {order.client?.name || 'Client'}</p>
                </div>
                <button
                    onClick={() => navigate('/orders')}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
                >
                    Back to Orders
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900">Customer Call</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-slate-500">Client</p>
                                <p className="font-semibold text-slate-900 mt-1">{order.client?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Phone</p>
                                <p className="font-semibold text-slate-900 mt-1">{order.client?.phone || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">City</p>
                                <p className="font-semibold text-slate-900 mt-1">{order.city || order.client?.city || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Shipping address</p>
                                <p className="font-semibold text-slate-900 mt-1">{order.shipping_address || '-'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                                {isStatusReadOnly ? (
                                    <div className="space-y-2">
                                        <div className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm font-semibold text-slate-800 capitalize">
                                            {String(formData.status || '').replace(/_/g, ' ')}
                                        </div>
                                        <p className="text-xs text-amber-700">{statusReadOnlyMessage}</p>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.status}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Callback date</label>
                                <input
                                    type="date"
                                    value={formData.callback_date}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, callback_date: event.target.value }))}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                                />
                                <p className="text-xs text-slate-500 mt-1">Leave empty if no follow-up call is needed.</p>
                                {errors.callback_date && <p className="text-red-500 text-xs mt-1">{errors.callback_date[0]}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Current total</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(order.total || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Base order total</span>
                                <span className="font-semibold text-slate-900">{formatCurrency((parseFloat(order.total) || 0) - existingUpsellTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Upsell total</span>
                                <span className="font-semibold text-emerald-700">{formatCurrency(upsellTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200">
                                <span className="text-slate-500">Projected total</span>
                                <span className="text-lg font-bold text-slate-900">
                                    {formatCurrency(((parseFloat(order.total) || 0) - existingUpsellTotal) + upsellTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Original Items</h2>
                            <p className="text-sm text-slate-500 mt-1">Base order lines are read-only for confirmation agents.</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {baseItems.map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-900">{item.product?.name || item.product_name || 'Product'}</p>
                                    <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-slate-900">{formatCurrency(item.subtotal || 0)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Upsell Products</h2>
                            <p className="text-sm text-slate-500 mt-1">Add extra products sold during the confirmation call.</p>
                        </div>
                        <button
                            type="button"
                            onClick={addUpsellRow}
                            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                        >
                            Add Upsell
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        {upsellItems.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                No upsell products added yet.
                            </div>
                        )}
                        {upsellItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 p-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Product</label>
                                    <select
                                        value={item.product_id}
                                        onChange={(event) => updateUpsellItem(index, 'product_id', event.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                                    >
                                        <option value="">Select product</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>{product.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(event) => updateUpsellItem(index, 'quantity', event.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit price</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(event) => updateUpsellItem(index, 'price', event.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeUpsellItem(index)}
                                            className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {errors.upsell_items && <p className="text-red-500 text-xs">{errors.upsell_items[0]}</p>}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Workflow'}
                    </button>
                </div>
            </form>
        </div>
    );
}
