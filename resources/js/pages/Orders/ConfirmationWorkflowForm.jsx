import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { calculateUpsellProfit, getProductBasePrice } from '../../utils/profit';

const STATUS_OPTIONS = [
    'pending',
    'confirmed',
    'picked_up',
    'ready_for_shipping',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'no_response',
    'refused',
    'returned',
];

const EMPTY_FORM = {
    status: 'pending',
    callback_date: '',
    shipping_address: '',
    notes: '',
    delivery_person_id: '',
    delivery_integration_id: '',
    delivery_city: '',
};

export default function ConfirmationWorkflowForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState(null);
    const [products, setProducts] = useState([]);
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [deliveryCities, setDeliveryCities] = useState([]);
    const [deliveryCitiesLoading, setDeliveryCitiesLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [upsellItems, setUpsellItems] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState('person');
    const [deliveryPersonSearch, setDeliveryPersonSearch] = useState('');
    const [deliveryCompanySearch, setDeliveryCompanySearch] = useState('');
    const [deliveryCitySearch, setDeliveryCitySearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    useEffect(() => {
        if (!formData.delivery_integration_id || deliveryMethod !== 'company') {
            setDeliveryCities([]);
            return;
        }

        fetchDeliveryCities(formData.delivery_integration_id);
    }, [deliveryMethod, formData.delivery_integration_id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [orderResponse, productsResponse, deliveryPersonsResponse, deliveryCompaniesResponse] = await Promise.all([
                api.get(`/orders/${id}`),
                api.get('/products?is_active=1'),
                api.get('/delivery-persons'),
                api.get('/orders/delivery-companies/available'),
            ]);

            const currentOrder = orderResponse.data;
            const initialDeliveryMethod = currentOrder.delivery_integration_id ? 'company' : 'person';

            setOrder(currentOrder);
            setProducts(productsResponse.data.data || productsResponse.data || []);
            setDeliveryPersons(deliveryPersonsResponse.data || []);
            setDeliveryCompanies(deliveryCompaniesResponse.data || []);
            setDeliveryMethod(initialDeliveryMethod);
            setFormData({
                status: currentOrder.status || 'pending',
                callback_date: currentOrder.callback_date ? String(currentOrder.callback_date).slice(0, 10) : '',
                shipping_address: currentOrder.shipping_address || currentOrder.client?.address || '',
                notes: currentOrder.notes || '',
                delivery_person_id: currentOrder.delivery_person_id ? String(currentOrder.delivery_person_id) : '',
                delivery_integration_id: currentOrder.delivery_integration_id ? String(currentOrder.delivery_integration_id) : '',
                delivery_city: currentOrder.delivery_city || currentOrder.city || '',
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

    const fetchDeliveryCities = async (companyId) => {
        try {
            setDeliveryCitiesLoading(true);
            const response = await api.get(`/orders/delivery-companies/${companyId}/cities`);
            setDeliveryCities(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching delivery cities:', error);
            setDeliveryCities([]);
        } finally {
            setDeliveryCitiesLoading(false);
        }
    };

    const baseItems = useMemo(
        () => (order?.items || []).filter((item) => !item.is_upsell),
        [order]
    );

    const existingUpsellTotal = useMemo(() => {
        return (order?.items || [])
            .filter((item) => item.is_upsell)
            .reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
    }, [order]);

    const upsellTotal = useMemo(() => {
        return upsellItems.reduce((sum, item) => {
            return sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity || 0, 10) || 0));
        }, 0);
    }, [upsellItems]);

    const upsellProfitTotal = useMemo(() => {
        return upsellItems.reduce((sum, item) => {
            const product = products.find((entry) => String(entry.id) === String(item.product_id));
            const quantity = parseInt(item.quantity || 0, 10) || 0;

            return sum + calculateUpsellProfit({
                sellTotal: (parseFloat(item.price) || 0) * quantity,
                productCostTotal: getProductBasePrice(product) * quantity,
            });
        }, 0);
    }, [products, upsellItems]);

    const projectedTotal = useMemo(() => {
        return ((parseFloat(order?.total) || 0) - existingUpsellTotal) + upsellTotal;
    }, [existingUpsellTotal, order?.total, upsellTotal]);

    const isStatusReadOnly = useMemo(() => {
        if (!order) {
            return false;
        }

        if (order.delivery_tracking_code) {
            return true;
        }

        if (order.delivery_person_id) {
            return true;
        }

        return Boolean(order.confirmed_at) || order.status === 'confirmed';
    }, [order]);

    const isAssignmentLocked = useMemo(() => {
        if (!order) {
            return false;
        }

        return Boolean(order.delivery_tracking_code) || Boolean(order.confirmed_at) || Boolean(order.delivery_person_id);
    }, [order]);

    const statusReadOnlyMessage = order?.delivery_tracking_code
        ? 'Status is now controlled by the delivery company because a tracking code exists.'
        : order?.delivery_person_id
            ? 'Status is now controlled by the assigned delivery person.'
            : 'Status is locked after the order has been confirmed.';

    const assignmentReadOnlyMessage = order?.delivery_tracking_code
        ? 'Delivery assignment is locked because a tracking code already exists.'
        : order?.delivery_person_id
            ? 'Delivery assignment is locked because a delivery person is already assigned.'
            : 'Delivery assignment is locked because the order has already been confirmed.';

    const filteredDeliveryPersons = useMemo(() => {
        const search = deliveryPersonSearch.trim().toLowerCase();
        if (!search) {
            return deliveryPersons;
        }

        return deliveryPersons.filter((person) => person.name.toLowerCase().includes(search));
    }, [deliveryPersons, deliveryPersonSearch]);

    const filteredDeliveryCompanies = useMemo(() => {
        const search = deliveryCompanySearch.trim().toLowerCase();
        if (!search) {
            return deliveryCompanies;
        }

        return deliveryCompanies.filter((company) => {
            const haystack = `${company.name} ${company.provider || ''}`.toLowerCase();
            return haystack.includes(search);
        });
    }, [deliveryCompanies, deliveryCompanySearch]);

    const filteredDeliveryCities = useMemo(() => {
        const search = deliveryCitySearch.trim().toLowerCase();
        const cities = deliveryCities.map((city) => (typeof city === 'object' ? (city.name || city.ville || city.city || '') : city));

        if (!search) {
            return cities;
        }

        return cities.filter((cityName) => cityName.toLowerCase().includes(search));
    }, [deliveryCities, deliveryCitySearch]);

    const addUpsellRow = () => {
        setUpsellItems((prev) => [...prev, { product_id: '', quantity: 1, price: 0 }]);
    };

    const updateUpsellItem = (index, field, value) => {
        setUpsellItems((prev) => prev.map((item, itemIndex) => {
            if (itemIndex !== index) {
                return item;
            }

            const nextItem = { ...item, [field]: value };

            if (field === 'product_id') {
                const product = products.find((entry) => String(entry.id) === String(value));
                nextItem.price = product?.company_price || product?.price || product?.recommended_price || 0;
            }

            return nextItem;
        }));
    };

    const removeUpsellItem = (index) => {
        setUpsellItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const handleDeliveryMethodChange = (method) => {
        if (isAssignmentLocked) {
            return;
        }

        setDeliveryMethod(method);
        setErrors((prev) => ({ ...prev, delivery_assignment: undefined, delivery_city: undefined }));
        setFormData((prev) => ({
            ...prev,
            delivery_person_id: method === 'person' ? prev.delivery_person_id : '',
            delivery_integration_id: method === 'company' ? prev.delivery_integration_id : '',
            delivery_city: method === 'company' ? prev.delivery_city : '',
        }));
    };

    const submitWorkflow = async () => {
        setErrors({});

        const payload = {
            status: formData.status,
            callback_date: formData.callback_date || null,
            shipping_address: formData.shipping_address || '',
            notes: formData.notes || '',
            delivery_person_id: deliveryMethod === 'person' ? (formData.delivery_person_id ? Number(formData.delivery_person_id) : null) : null,
            delivery_integration_id: deliveryMethod === 'company' ? (formData.delivery_integration_id ? Number(formData.delivery_integration_id) : null) : null,
            delivery_city: deliveryMethod === 'company' ? (formData.delivery_city || '') : null,
            upsell_items: upsellItems
                .filter((item) => item.product_id)
                .map((item) => ({
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                })),
        };

        try {
            setSaving(true);
            await api.patch(`/orders/${id}/confirmation-workflow`, payload);
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        await submitWorkflow();
    };

    if (loading) {
        return (
            <div className="flex h-80 items-center justify-center">
                <div className="text-slate-500">Loading confirmation workflow...</div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-slate-500">Order not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Confirmation Form</p>
                        <h1 className="mt-2 text-2xl md:text-3xl font-bold">Editable Confirmation Workflow</h1>
                        <p className="mt-1 text-sm text-slate-300">{order.order_number} • {order.client?.name || 'Client'}</p>
                        {order.is_blacklisted && (
                            <span className="mt-3 inline-flex rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                                {order.blacklist_badge || 'Banned / Blacklisted'}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/orders')}
                        className="w-full md:w-auto rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                    >
                        Back to Orders
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-5">
                                <h2 className="text-lg font-semibold text-slate-900">Customer Review</h2>
                                <p className="mt-1 text-sm text-slate-500">Review the customer details and update the shipping information during the confirmation call.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">👤 Client Name</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">{order.client?.name || '-'}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">📱 Phone</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">{order.client?.phone || '-'}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-orange-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">🏙️ Current City</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">{order.city || order.client?.city || '-'}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-purple-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">📍 Current Address</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">{order.shipping_address || order.client?.address || '-'}</p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Shipping Address</label>
                                    <textarea
                                        rows="3"
                                        value={formData.shipping_address}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, shipping_address: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                                        placeholder="Update the corrected shipping address from the call."
                                    />
                                    {errors.shipping_address && <p className="mt-1 text-xs text-rose-600">{errors.shipping_address[0]}</p>}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Call Notes</label>
                                    <textarea
                                        rows="4"
                                        value={formData.notes}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                                        placeholder="Save call notes, confirmation remarks, or workflow notes."
                                    />
                                    {errors.notes && <p className="mt-1 text-xs text-rose-600">{errors.notes[0]}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Delivery Assignment</h2>
                                    <p className="mt-1 text-sm text-slate-500">Choose the delivery type and assign the delivery person or delivery company before confirming.</p>
                                </div>
                                {isAssignmentLocked && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                        Assignment locked
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => handleDeliveryMethodChange('person')}
                                    disabled={isAssignmentLocked}
                                    className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                                        deliveryMethod === 'person'
                                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    } ${isAssignmentLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                >
                                    <p className="text-base md:text-lg font-semibold text-slate-900">👤 Delivery Person</p>
                                    <p className="mt-1 text-xs md:text-sm text-slate-500">Assign a delivery person directly.</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeliveryMethodChange('company')}
                                    disabled={isAssignmentLocked}
                                    className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                                        deliveryMethod === 'company'
                                            ? 'border-blue-400 bg-blue-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    } ${isAssignmentLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                >
                                    <p className="text-base md:text-lg font-semibold text-slate-900">🚚 Delivery Company</p>
                                    <p className="mt-1 text-xs md:text-sm text-slate-500">Use a delivery integration.</p>
                                </button>
                            </div>

                            {isAssignmentLocked && (
                                <p className="mt-4 text-xs text-amber-700">{assignmentReadOnlyMessage}</p>
                            )}

                            <div className="mt-5 space-y-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Search delivery person</label>
                                    <input
                                        type="text"
                                        value={deliveryPersonSearch}
                                        onChange={(event) => setDeliveryPersonSearch(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="Search by name..."
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Person <span className="text-slate-400 text-xs font-normal">*</span></label>
                                    <select
                                        value={formData.delivery_person_id}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, delivery_person_id: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                                    >
                                        <option value="">Select delivery person</option>
                                        {filteredDeliveryPersons.map((person) => (
                                            <option key={person.id} value={person.id}>{person.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {!isAssignmentLocked && deliveryMethod === 'company' && (
                                <div className="mt-5 space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Search delivery company</label>
                                        <input
                                            type="text"
                                            value={deliveryCompanySearch}
                                            onChange={(event) => setDeliveryCompanySearch(event.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Search by name or provider..."
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Company <span className="text-slate-400 text-xs font-normal">*</span></label>
                                        <select
                                            value={formData.delivery_integration_id}
                                            onChange={(event) => setFormData((prev) => ({
                                                ...prev,
                                                delivery_integration_id: event.target.value,
                                                delivery_city: '',
                                            }))}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        >
                                            <option value="">Select delivery company</option>
                                            {filteredDeliveryCompanies.map((company) => (
                                                <option key={company.id} value={company.id}>
                                                    {company.name} ({company.provider})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.delivery_integration_id && (
                                        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Search delivery city</label>
                                                <input
                                                    type="text"
                                                    value={deliveryCitySearch}
                                                    onChange={(event) => setDeliveryCitySearch(event.target.value)}
                                                    className="w-full rounded-2xl border border-blue-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    placeholder="Search city..."
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery City <span className="text-slate-400 text-xs font-normal">*</span></label>
                                                <select
                                                    value={formData.delivery_city}
                                                    onChange={(event) => setFormData((prev) => ({ ...prev, delivery_city: event.target.value }))}
                                                    className="w-full rounded-2xl border border-blue-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                                >
                                                    <option value="">Select delivery city</option>
                                                    {filteredDeliveryCities.map((cityName) => (
                                                        <option key={cityName} value={cityName}>{cityName}</option>
                                                    ))}
                                                </select>
                                                {deliveryCitiesLoading && <p className="mt-2 text-xs text-blue-600 font-medium">⏳ Loading cities...</p>}
                                                {errors.delivery_city && <p className="mt-1 text-xs text-rose-600">{errors.delivery_city[0]}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {errors.delivery_assignment && <p className="mt-3 text-xs text-rose-600">{errors.delivery_assignment[0]}</p>}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-5">
                                <h2 className="text-lg font-semibold text-slate-900">Workflow Controls</h2>
                                <p className="mt-1 text-sm text-slate-500">Update the confirmation status and callback date for this order.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                                    {isStatusReadOnly ? (
                                        <div className="space-y-2">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold capitalize text-slate-800">
                                                🔒 {String(formData.status || '').replace(/_/g, ' ')}
                                            </div>
                                            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{statusReadOnlyMessage}</p>
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.status}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-white"
                                        >
                                            {STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.replace(/_/g, ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {errors.status && <p className="mt-1 text-xs text-rose-600">{errors.status[0]}</p>}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Callback Date</label>
                                    <input
                                        type="date"
                                        value={formData.callback_date}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, callback_date: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Leave empty if no follow-up call is needed.</p>
                                    {errors.callback_date && <p className="mt-1 text-xs text-rose-600">{errors.callback_date[0]}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-5">Order Summary</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Current total</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(order.total || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Upsell total</span>
                                    <span className="font-semibold text-emerald-700">{formatCurrency(upsellTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Upsell profit</span>
                                    <span className="font-semibold text-emerald-700">{formatCurrency(upsellProfitTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
                                    <span className="font-semibold text-slate-900">Projected total</span>
                                    <span className="text-lg font-bold text-slate-900">{formatCurrency(projectedTotal)}</span>
                                </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Delivery</p>
                                <p className="mt-3 text-sm font-semibold text-slate-900">
                                    {deliveryMethod === 'person'
                                        ? deliveryPersons.find((person) => String(person.id) === String(formData.delivery_person_id))?.name || '⚠️ No person selected'
                                        : deliveryCompanies.find((company) => String(company.id) === String(formData.delivery_integration_id))?.name || '⚠️ No company selected'}
                                </p>
                                {deliveryMethod === 'company' && formData.delivery_city && (
                                    <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                                        📍 {formData.delivery_city}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-900">Original Items</h2>
                            <p className="mt-1 text-sm text-slate-500">Base order items are kept as-is while the confirmation agent adds upsells.</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {baseItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                                No items in this order.
                            </div>
                        ) : (
                            baseItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 hover:shadow-sm transition-all">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{item.product?.name || item.product_name || 'Product'}</p>
                                        <p className="mt-1 text-sm text-slate-500">Quantity: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-slate-900">{formatCurrency(item.subtotal || 0)}</p>
                                        <p className="text-xs text-slate-500 mt-1">{item.quantity} × {formatCurrency((item.subtotal || 0) / item.quantity)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-900">Upsell Products</h2>
                            <p className="mt-1 text-sm text-slate-500">Add upsell products and adjust the selling price from the confirmation call.</p>
                        </div>
                        <button
                            type="button"
                            onClick={addUpsellRow}
                            className="w-full md:w-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            + Add Upsell
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        {upsellItems.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                No upsell products added yet.
                            </div>
                        )}

                        {upsellItems.map((item, index) => (
                            <div key={index} className="space-y-3 rounded-2xl border border-slate-200 p-4 bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Product</label>
                                        <select
                                            value={item.product_id}
                                            onChange={(event) => updateUpsellItem(index, 'product_id', event.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        >
                                            <option value="">Select product</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(event) => updateUpsellItem(index, 'quantity', event.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit Price</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(event) => updateUpsellItem(index, 'price', event.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3">
                                    {item.product_id && (
                                        <div className="flex-1 rounded-2xl bg-white border border-emerald-200 p-3">
                                            <p className="text-xs text-emerald-600 font-semibold">Profit</p>
                                            <p className="text-sm font-bold text-emerald-700 mt-1">
                                                {formatCurrency(calculateUpsellProfit({
                                                    sellTotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity || 0, 10) || 0),
                                                    productCostTotal: getProductBasePrice(products.find((product) => String(product.id) === String(item.product_id)))
                                                        * (parseInt(item.quantity || 0, 10) || 0),
                                                }))}
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeUpsellItem(index)}
                                        className="w-full md:w-auto rounded-2xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        {errors.upsell_items && <p className="text-xs text-rose-600">{errors.upsell_items[0]}</p>}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
                    <button
                        type="button"
                        onClick={() => navigate('/orders')}
                        className="w-full md:w-auto rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full md:w-auto rounded-2xl bg-slate-900 px-8 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                        {saving ? '💾 Saving...' : '✅ Confirm & Save'}
                    </button>
                </div>
            </form>
        </div>
    );
}
