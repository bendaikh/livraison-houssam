import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, isConfirmationAgentRole, isDeliveryPersonRole, isVendorRole } from '../../utils/roles';
import { calculateOrderProfit, getFulfillmentPrice } from '../../utils/profit';
import { formatDeliveryDispatchFailureMessage, parseDeliveryCitiesResponse } from '../../utils/delivery';
import { resolveShippingCost, sameCityName } from '../../utils/shipping';
import ConfirmationWorkflowForm from './ConfirmationWorkflowForm';
import { appPath } from '../../constants/appPaths';

const getImageSrc = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('/')) return imagePath;
    return `/storage/${imagePath}`;
};

const getProductImageSrc = (product) => getImageSrc(product?.images?.[0] || null);

const isProductAllowedForVendor = (product, vendorId) => {
    if (!vendorId) {
        return true;
    }

    const normalizedVendorId = String(vendorId);

    if (String(product?.vendor_id || '') === normalizedVendorId) {
        return true;
    }

    return (product?.marketplace_products || []).some((assignment) => (
        String(assignment.vendor_id) === normalizedVendorId && Boolean(assignment.is_active)
    ));
};

const wasOrderCreatedByCurrentConfirmationAgent = (order, userId) => {
    if (!order || !userId) {
        return false;
    }

    if (String(order.created_by_user_id || '') === String(userId)) {
        return true;
    }

    if (order.source !== 'manual') {
        return false;
    }

    const firstHistoryEntry = [...(order.history || [])]
        .sort((left, right) => {
            const leftId = Number(left?.id || 0);
            const rightId = Number(right?.id || 0);
            return leftId - rightId;
        })[0];

    return String(firstHistoryEntry?.user_id || '') === String(userId);
};

export default function OrderForm() {
    const { formatCurrency, settings } = useSettings();
    const { user } = useAuth();
    const roleSlug = user?.role?.slug;
    const isVendorUser = isVendorRole(roleSlug);
    const isAdminUser = isAdminRole(roleSlug);
    const isConfirmationAgentUser = isConfirmationAgentRole(roleSlug);
    const isDeliveryPersonUser = isDeliveryPersonRole(roleSlug);
    const authenticatedSellerName = user?.vendor?.name || user?.name || 'Current seller';
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isEditing = !!id;
    
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [deliveryAgents, setDeliveryAgents] = useState([]);
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [confirmationAgents, setConfirmationAgents] = useState([]);
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [currentOrderTrackingCode, setCurrentOrderTrackingCode] = useState('');
    const [currentOrderConfirmedAt, setCurrentOrderConfirmedAt] = useState(null);
    const [currentOrderReturnedToConfirmationAt, setCurrentOrderReturnedToConfirmationAt] = useState(null);
    const [currentOrderCreatedByUserId, setCurrentOrderCreatedByUserId] = useState(undefined);
    const [currentOrderHistory, setCurrentOrderHistory] = useState([]);
    const [currentOrderDeliveryWorkflowLocked, setCurrentOrderDeliveryWorkflowLocked] = useState(false);
    const [deliveryCompanyCities, setDeliveryCompanyCities] = useState([]);
    const [deliveryCitiesLoading, setDeliveryCitiesLoading] = useState(false);
    const [deliveryCitiesError, setDeliveryCitiesError] = useState('');
    const [deliveryCitiesWarning, setDeliveryCitiesWarning] = useState('');
    const [deliveryCitySearch, setDeliveryCitySearch] = useState('');
    const [cities, setCities] = useState([]);
    const [citiesLoaded, setCitiesLoaded] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [initialPricingContext, setInitialPricingContext] = useState(null);
    
    const [formData, setFormData] = useState({
        client_name: '',
        client_phone: '',
        vendor_id: '',
        delivery_agent_id: '',
        delivery_integration_id: '',
        delivery_person_id: '',
        confirmation_agent_id: '',
        delivery_city: '',
        status: 'pending',
        source: 'manual',
        shipping_address: '',
        city: '',
        notes: '',
        whatsapp: '',
        shipping_cost: 0,
        shipping_included_in_price: isAdminUser,
        discount: 0
    });

    const [orderItems, setOrderItems] = useState([{
        product_id: '',
        quantity: 1,
        price: 0
    }]);

    const [errors, setErrors] = useState({});
    const [queryPrefillApplied, setQueryPrefillApplied] = useState(false);
    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'reported', label: 'Reporte' },
        { value: 'picked_up', label: 'Picked Up' },
        { value: 'ready_for_shipping', label: 'Ready for Shipping' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refused', label: 'Refused' },
        { value: 'returned', label: 'Returned' },
        { value: 'no_response', label: 'No Response' },
        { value: 'return_requested', label: 'Return Requested' },
    ];

    if (isDeliveryPersonUser) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
                <p className="text-slate-500 mt-2">Delivery people cannot create or edit orders directly.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchProducts();
        fetchVendors();
        fetchDeliveryAgents();
        fetchDeliveryPersons();
        fetchConfirmationAgents();
        fetchDeliveryCompanies();
        fetchCities();
        
        if (isEditing) {
            fetchOrder();
        } else {
            setInitialPricingContext(null);
            setCurrentOrderCreatedByUserId(undefined);
            setCurrentOrderHistory([]);
            setFormData((prev) => ({
                ...prev,
                vendor_id: user?.vendor?.id || prev.vendor_id,
                confirmation_agent_id: isConfirmationAgentUser ? String(user?.id || '') : prev.confirmation_agent_id,
                shipping_included_in_price: isAdminUser,
            }));
        }
    }, [id, user, isEditing, isAdminUser, isConfirmationAgentUser]);

    useEffect(() => {
        if (isEditing || queryPrefillApplied || products.length === 0) return;

        const params = new URLSearchParams(location.search);
        const productId = params.get('product_id');
        const quantity = parseInt(params.get('quantity') || '1', 10);
        const source = params.get('source');

        if (!productId) {
            setQueryPrefillApplied(true);
            return;
        }

        const selectedProduct = products.find((product) => String(product.id) === String(productId));
        if (!selectedProduct) {
            setQueryPrefillApplied(true);
            return;
        }

        setOrderItems([{
            product_id: String(selectedProduct.id),
            quantity: Number.isNaN(quantity) ? 1 : Math.max(1, quantity),
            price: selectedProduct.company_price || selectedProduct.price || selectedProduct.recommended_price || 0
        }]);

        if (source && ['manual', 'shopify', 'google_sheet', 'delivery_company', 'marketplace', 'whatsapp'].includes(source)) {
            setFormData((prev) => ({ ...prev, source }));
        }

        setQueryPrefillApplied(true);
    }, [isEditing, queryPrefillApplied, location.search, products]);

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

    const fetchDeliveryCompanies = async () => {
        try {
            const response = await api.get('/orders/delivery-companies/available');
            setDeliveryCompanies(response.data || []);
        } catch (error) {
            console.error('Error fetching delivery companies:', error);
        }
    };

    const fetchDeliveryCompanyCities = async (companyId) => {
        if (!companyId) {
            setDeliveryCompanyCities([]);
            setDeliveryCitiesError('');
            setDeliveryCitiesWarning('');
            return;
        }
        try {
            setDeliveryCitiesLoading(true);
            setDeliveryCitiesError('');
            setDeliveryCitiesWarning('');
            const response = await api.get(`/orders/delivery-companies/${companyId}/cities`);
            const { cities, warning } = parseDeliveryCitiesResponse(response);
            setDeliveryCompanyCities(cities);
            setDeliveryCitiesWarning(warning);
            if (cities.length === 0) {
                setDeliveryCitiesError('This delivery company has no configured cities.');
            }
        } catch (error) {
            console.error('Error fetching delivery company cities:', error);
            setDeliveryCompanyCities([]);
            setDeliveryCitiesWarning('');
            setDeliveryCitiesError(error.response?.data?.error || 'Failed to load delivery cities. Please try again.');
        } finally {
            setDeliveryCitiesLoading(false);
        }
    };

    const fetchCities = async () => {
        try {
            setCitiesLoaded(false);
            const response = await api.get('/cities');
            // For edit mode, show all cities so Shopify cities can be matched
            // For create mode, show only active cities
            if (isEditing) {
                setCities(response.data); // Show all cities when editing
            } else {
                setCities(response.data.filter(city => city.is_active));
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setCitiesLoaded(true);
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orders/${id}`);
            const order = response.data;
            const resolvedCity = String(order.city ?? order.client?.city ?? '').trim();
            const effectiveShippingCost = order.effective_shipping_cost ?? order.resolved_shipping_cost ?? order.shipping_cost ?? '';
            setCurrentOrderTrackingCode(order.delivery_tracking_code || '');
            setCurrentOrderConfirmedAt(order.confirmed_at || null);
            setCurrentOrderReturnedToConfirmationAt(order.returned_to_confirmation_at || null);
            setCurrentOrderCreatedByUserId(order.created_by_user_id ?? null);
            setCurrentOrderHistory(order.history || []);
            setCurrentOrderDeliveryWorkflowLocked(Boolean(order.delivery_workflow_locked));

            console.debug('[OrderForm] initial order data loaded', {
                orderId: order.id,
                city: resolvedCity,
                deliveryCity: order.delivery_city || resolvedCity || '',
                savedShippingCost: order.shipping_cost,
                effectiveShippingCost,
                shippingResolution: order.shipping_cost_resolution || null,
            });
            
            setFormData({
                client_name: order.client?.name || '',
                client_phone: order.client?.phone || '',
                vendor_id: order.vendor_id || '',
                delivery_agent_id: order.delivery_agent_id || '',
                delivery_integration_id: order.delivery_integration_id || '',
                delivery_person_id: order.delivery_person_id || '',
                confirmation_agent_id: order.confirmation_agent_id || '',
                delivery_city: order.delivery_city || resolvedCity || '',
                status: order.status || 'pending',
                source: order.source || 'manual',
                shipping_address: order.shipping_address || '',
                city: resolvedCity,
                notes: order.notes || '',
                whatsapp: order.whatsapp || '',
                shipping_cost: effectiveShippingCost,
                shipping_included_in_price: Boolean(order.shipping_included_in_price),
                discount: order.discount || 0
            });
            setInitialPricingContext({
                city: resolvedCity,
                delivery_integration_id: order.delivery_integration_id || '',
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
            setCurrentOrderCreatedByUserId(null);
            setCurrentOrderHistory([]);
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
            price: product?.company_price || product?.price || product?.recommended_price || 0
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

    const resolvedShipping = resolveShippingCost({
        cityName: formData.city,
        cities,
        emptyCost: 35,
    });
    const parsedShipping = parseFloat(formData.shipping_cost ?? '');
    const hasSavedShippingCost = formData.shipping_cost !== '' && formData.shipping_cost !== null && formData.shipping_cost !== undefined
        && Number.isFinite(parsedShipping);
    const hasPricingContextChanged = Boolean(
        isEditing
        && initialPricingContext
        && (
            !sameCityName(formData.city, initialPricingContext.city)
            || String(formData.delivery_integration_id || '') !== String(initialPricingContext.delivery_integration_id || '')
        )
    );
    const shouldUseResolvedShipping = !isEditing || hasPricingContextChanged || !hasSavedShippingCost;
    const shippingCost = shouldUseResolvedShipping
        ? resolvedShipping.cost
        : parsedShipping;
    const shippingIncludedInPrice = Boolean(formData.shipping_included_in_price);
    const discountValue = parseFloat(formData.discount ?? 0) || 0;
    const fulfillmentPrice = getFulfillmentPrice(settings.order_fulfillment_cost);
    const availableProducts = formData.vendor_id
        ? products.filter((product) => isProductAllowedForVendor(product, formData.vendor_id))
        : products;

    const calculateSubtotal = () => {
        return orderItems.reduce((sum, item) => {
            return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal - discountValue;
    };

    const calculateEstimatedProfit = () => {
        return calculateOrderProfit({
            items: orderItems.map((item) => ({
                ...item,
                product: products.find((product) => String(product.id) === String(item.product_id)) || null,
            })),
            shippingPrice: shippingCost,
            fulfillmentPrice,
            discount: discountValue,
        });
    };

    const baseCityOptions = isEditing ? cities : cities.filter(city => city.is_active);
    const hasCurrentCityInList = !!formData.city && baseCityOptions.some(city => city.name === formData.city);
    const cityOptions = hasCurrentCityInList || !formData.city
        ? baseCityOptions
        : [
            {
                id: 'current-city',
                name: formData.city,
                delivery_cost: null,
                is_active: true,
                isCurrentOrderCity: true,
            },
            ...baseCityOptions,
        ];

    // Filter cities based on search input
    const filteredCityOptions = cityOptions.filter((city) =>
        city.name.toLowerCase().includes(formData.city.toLowerCase())
    );

    // Once a confirmation agent has been set on an existing order, lock the field
    const isConfirmationLocked = isEditing && !!formData.confirmation_agent_id && !isAdminUser;
    const isConfirmationStyleStatusLocked = () => {
        if (currentOrderTrackingCode) {
            return true;
        }

        if (formData.delivery_person_id && (Boolean(currentOrderConfirmedAt) || formData.status === 'confirmed')) {
            return true;
        }

        return Boolean(currentOrderConfirmedAt) || formData.status === 'confirmed';
    };
    const isSellerStatusLocked = isVendorUser
        && isEditing
        && (Boolean(currentOrderReturnedToConfirmationAt) || isConfirmationStyleStatusLocked());
    const adminDeliveryCompanyLockedStatuses = [
        'picked_up',
        'ready_for_shipping',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refused',
        'returned',
        'no_response',
        'return_requested',
    ];
    const isAdminDeliveryCompanyStatusLocked = isAdminUser
        && isEditing
        && Boolean(formData.delivery_integration_id)
        && Boolean(currentOrderTrackingCode)
        && adminDeliveryCompanyLockedStatuses.includes(formData.status);
    const isAdminStatusLocked = isAdminUser
        && isEditing
        && (currentOrderDeliveryWorkflowLocked || isAdminDeliveryCompanyStatusLocked);
    const statusFieldDisabled = isSellerStatusLocked || isAdminStatusLocked;

        // Keep delivery city in sync with shipping city whenever company is selected.
        useEffect(() => {
            if (formData.delivery_integration_id && formData.city && !formData.delivery_city) {
                setFormData(prev => ({ ...prev, delivery_city: prev.city }));
            }
        }, [formData.delivery_integration_id, formData.city, formData.delivery_city]);

        // When delivery company changes, load its cities and reset delivery_city
        useEffect(() => {
            fetchDeliveryCompanyCities(formData.delivery_integration_id);
            if (formData.delivery_integration_id) {
                setFormData(prev => ({ ...prev, delivery_city: prev.city }));
            } else {
                setDeliveryCompanyCities([]);
            }
            setDeliveryCitySearch('');
            setShowCityDropdown(false);
        }, [formData.delivery_integration_id]);

    useEffect(() => {
        if (!citiesLoaded || !shouldUseResolvedShipping) {
            return;
        }

        const currentCost = parseFloat(formData.shipping_cost ?? '');
        if (!Number.isFinite(currentCost) || Math.abs(currentCost - resolvedShipping.cost) > 0.009) {
            console.debug('[OrderForm] delivery city + price resolution', {
                city: formData.city,
                deliveryIntegrationId: formData.delivery_integration_id || null,
                resolvedShippingCost: resolvedShipping.cost,
                resolutionSource: resolvedShipping.source,
                matchedCity: resolvedShipping.matchedCity,
                usedFallback: resolvedShipping.usedFallback,
                reason: isEditing ? 'edit_context_changed_or_missing_saved_value' : 'create_auto_sync',
            });

            setFormData((prev) => ({
                ...prev,
                shipping_cost: resolvedShipping.cost,
            }));
        }
    }, [
        citiesLoaded,
        shouldUseResolvedShipping,
        resolvedShipping.cost,
        resolvedShipping.source,
        resolvedShipping.matchedCity,
        resolvedShipping.usedFallback,
        formData.city,
        formData.delivery_integration_id,
        formData.shipping_cost,
        isEditing,
    ]);

    useEffect(() => {
        if (!formData.vendor_id) {
            return;
        }

        setOrderItems((prev) => prev.map((item) => {
            if (!item.product_id) {
                return item;
            }

            const selectedProduct = products.find((product) => String(product.id) === String(item.product_id));
            if (!selectedProduct || isProductAllowedForVendor(selectedProduct, formData.vendor_id)) {
                return item;
            }

            return {
                ...item,
                product_id: '',
                price: 0,
            };
        }));
    }, [formData.vendor_id, products]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const submitData = {
                ...formData,
                shipping_cost: shippingCost,
                shipping_cost_source: 'auto',
                vendor_id: isVendorUser ? (user?.vendor?.id || formData.vendor_id || null) : (formData.vendor_id || null),
                items: orderItems
            };

            console.debug('[OrderForm] price sent back on save', {
                isEditing,
                orderId: id || null,
                city: submitData.city,
                deliveryCity: submitData.delivery_city,
                deliveryIntegrationId: submitData.delivery_integration_id || null,
                shippingCost: submitData.shipping_cost,
                shippingCostSource: submitData.shipping_cost_source,
            });

            const response = isEditing
                ? await api.put(`/orders/${id}`, submitData)
                : await api.post('/orders', submitData);

            if (response.data?.delivery_error) {
                alert(formatDeliveryDispatchFailureMessage(response.data.delivery_error));
            } else if (submitData.status === 'confirmed' && submitData.delivery_integration_id && !response.data?.delivery_tracking_code) {
                alert('Order saved, but no tracking code was returned by the delivery provider.');
            }

            navigate(appPath('/orders'));
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    const canConfirmationAgentUseCreateStyleEdit = isConfirmationAgentUser
        && isEditing
        && (
            String(currentOrderCreatedByUserId || '') === String(user?.id || '')
            || wasOrderCreatedByCurrentConfirmationAgent({
                created_by_user_id: currentOrderCreatedByUserId,
                source: formData.source,
                history: currentOrderHistory,
            }, user?.id)
        )
        && (
            Boolean(currentOrderReturnedToConfirmationAt)
            || (!currentOrderConfirmedAt && formData.status === 'pending')
        );

    if (isConfirmationAgentUser && isEditing && currentOrderCreatedByUserId === undefined) {
        return (
            <div className="flex h-80 items-center justify-center">
                <div className="text-slate-500">{t('admin.orderForm.loadingOrder')}</div>
            </div>
        );
    }

    if (isConfirmationAgentUser && isEditing && !canConfirmationAgentUseCreateStyleEdit) {
        return <ConfirmationWorkflowForm />;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            {isEditing ? t('admin.orderForm.orderUpdate') : t('admin.orderForm.newOrder')}
                        </p>
                        <h1 className="mt-2 text-3xl font-bold">{isEditing ? t('admin.orderForm.editOrder') : t('admin.orderForm.createOrder')}</h1>
                        <p className="mt-1 text-sm text-slate-300">
                            {t('admin.orderForm.updateDetails')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1">
                            {formData.city || t('admin.orderForm.noCitySelected')}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1">
                            {t('admin.orderForm.shipping')} {formatCurrency(shippingCost)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate(appPath('/orders'))}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    {t('admin.orderForm.backToOrders')}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Details */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('admin.orderForm.customerShipping')}</h2>
                            <p className="mt-1 text-sm text-slate-500">{t('admin.orderForm.editPhoneCityAddress')}</p>
                        </div>
                        {isEditing && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {formData.status}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('admin.orderForm.clientName')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder={t('admin.orderForm.enterClientName')}
                            />
                            {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('admin.orderForm.clientPhone')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.client_phone}
                                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder={t('admin.orderForm.enterClientPhone')}
                            />
                            {errors.client_phone && <p className="text-red-500 text-xs mt-1">{errors.client_phone[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.orderForm.whatsapp')}</label>
                            <input
                                type="text"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('admin.orderForm.enterWhatsApp')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <div className="relative space-y-2">
                                {/* Search Input */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => {
                                            setFormData({ 
                                                ...formData, 
                                                city: e.target.value,
                                                delivery_city: formData.delivery_integration_id ? e.target.value : formData.delivery_city
                                            });
                                            setShowCityDropdown(true);
                                        }}
                                        onFocus={() => setShowCityDropdown(true)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Search and select city..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCityDropdown(!showCityDropdown)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className={`w-5 h-5 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Dropdown List */}
                                {showCityDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredCityOptions.length > 0 ? (
                                            <>
                                                <div className="p-2 sticky top-0 bg-gray-50 border-b">
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        {filteredCityOptions.length} city{filteredCityOptions.length !== 1 ? 'ies' : ''} found
                                                    </p>
                                                </div>
                                                {filteredCityOptions.map((city) => (
                                                    <button
                                                                key={city.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const nextShipping = resolveShippingCost({
                                                                        cityName: city.name,
                                                                        cities,
                                                                        emptyCost: 35,
                                                                    }).cost;
                                                                    setFormData({
                                                                        ...formData,
                                                                        city: city.name,
                                                                        shipping_cost: nextShipping
                                                                    });
                                                                    setShowCityDropdown(false);
                                                                }}
                                                        className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 transition-colors ${
                                                            formData.city === city.name ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                                        }`}
                                                    >
                                                                <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">{city.name}</p>
                                                                            <div className="flex gap-2 mt-0.5">
                                                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                                                                {resolveShippingCost({ cityName: city.name, cities, emptyCost: 35 }).cost} DH
                                                                            </span>
                                                                            {city.isCurrentOrderCity && (
                                                                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                                                                    From Shopify
                                                                                </span>
                                                                            )}
                                                                    {!city.is_active && (
                                                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                                            Inactive
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {formData.city === city.name && (
                                                                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="p-4 text-center text-gray-500">
                                                <p className="text-sm">No cities found matching "{formData.city}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Close dropdown when clicking outside */}
                                {showCityDropdown && (
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowCityDropdown(false)}
                                    />
                                )}

                                {/* Shopify City Warning */}
                                {formData.city && !cities.find(c => c.name === formData.city) && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-xs text-yellow-800">
                                            <strong>Note:</strong> The city "<strong>{formData.city}</strong>" from Shopify is not in the cities list. 
                                            You can search and select a matching city above or keep this value.
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                    <span className="font-medium">Shipping:</span>
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                        {formatCurrency(shippingCost)}
                                    </span>
                                    <span className="text-xs text-gray-500">Edit rates in Settings → Cities.</span>
                                </div>
                            </div>
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

                    <div className="mb-3 border-t border-slate-200 pt-5">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Assignment & Workflow</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                disabled={statusFieldDisabled}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize ${
                                    statusFieldDisabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
                                }`}
                            >
                                {statusOptions.map((statusOption) => (
                                    <option key={statusOption.value} value={statusOption.value}>
                                        {statusOption.label}
                                    </option>
                                ))}
                            </select>
                            {statusFieldDisabled && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {isAdminStatusLocked
                                        ? currentOrderDeliveryWorkflowLocked
                                            ? 'Status is locked for admins after the delivery person invoice is marked as paid.'
                                            : 'Status is locked for admins once the delivery company marks the order as picked up.'
                                        : currentOrderTrackingCode
                                        ? 'Status is locked for sellers after the order is handed to a delivery company.'
                                        : currentOrderReturnedToConfirmationAt
                                            ? 'Status is locked for sellers while the order is back in the confirmation workflow.'
                                        : formData.delivery_person_id && (Boolean(currentOrderConfirmedAt) || formData.status === 'confirmed')
                                            ? 'Status is locked for sellers once a delivery person is assigned.'
                                            : 'Status is locked for sellers once the order has been confirmed.'}
                                </p>
                            )}
                            {!isEditing && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose <span className="font-medium">Confirmed</span> to send the order immediately after save.
                                </p>
                            )}
                        </div>

                        {isVendorUser ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
                                <input
                                    type="text"
                                    value={authenticatedSellerName}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                                />
                                <p className="text-xs text-gray-500 mt-1">Orders from this account are assigned automatically to this seller.</p>
                            </div>
                        ) : (
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
                                {isConfirmationAgentUser && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        If you choose a seller, the order goes to that seller. If you leave it empty, your name will appear in the Seller column.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Hide Agent Confirmation and Delivery Person for sellers - only admin assigns these */}
                        {!isVendorUser && (
                            <>
                                {isConfirmationAgentUser ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Agent</label>
                                        <input
                                            type="text"
                                            value={user?.name || 'Current confirmation agent'}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Manual orders created from this account are assigned to you automatically.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Agent</label>
                                        <select
                                            value={formData.confirmation_agent_id}
                                            onChange={(e) => setFormData({ ...formData, confirmation_agent_id: e.target.value })}
                                            disabled={isConfirmationLocked}
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isConfirmationLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="">Select Agent</option>
                                            {confirmationAgents.map(agent => (
                                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                                            ))}
                                        </select>
                                        {isConfirmationLocked && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Agent already confirmed for this order; changes are locked.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Delivery Person
                                        {formData.delivery_integration_id && <span className="text-xs text-gray-500"> (disabled - delivery company selected)</span>}
                                    </label>
                                    <select
                                        value={formData.delivery_person_id}
                                        onChange={(e) => setFormData({ ...formData, delivery_person_id: e.target.value })}
                                        disabled={!!formData.delivery_integration_id}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            formData.delivery_integration_id ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
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
                                <option value="google_sheet">Google Sheet</option>
                                <option value="delivery_company">Delivery Company</option>
                                <option value="marketplace">Marketplace</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Delivery Company
                                {formData.delivery_person_id && <span className="text-xs text-gray-500"> (disabled - delivery person selected)</span>}
                            </label>
                            <select
                                value={formData.delivery_integration_id}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    delivery_integration_id: e.target.value,
                                    delivery_city: e.target.value ? (formData.delivery_city || formData.city) : ''
                                })}
                                disabled={!!formData.delivery_person_id}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formData.delivery_person_id ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                            >
                                <option value="">Select Delivery Company</option>
                                {deliveryCompanies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name} ({company.provider})
                                    </option>
                                ))}
                            </select>
                            {formData.delivery_integration_id && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Will use delivery city: <span className="font-semibold">{formData.delivery_city || formData.city || 'not set'}</span>
                                </p>
                            )}
                            {formData.delivery_integration_id && (
                                <div className="mt-3 space-y-1">
                                    <label className="block text-xs font-semibold text-gray-600">
                                        Delivery City (required for this company)
                                    </label>
                                    {deliveryCitiesLoading ? (
                                        <p className="text-xs text-gray-500">Loading cities...</p>
                                    ) : deliveryCompanyCities.length > 0 ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search city..."
                                                value={deliveryCitySearch}
                                                onChange={(e) => setDeliveryCitySearch(e.target.value)}
                                                onFocus={() => setShowCityDropdown(true)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                            {showCityDropdown && deliveryCitySearch && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {deliveryCompanyCities
                                                        .filter((city) => {
                                                            const cityName = typeof city === 'object' ? (city.name || city.ville || city.city || '') : city;
                                                            return cityName.toLowerCase().includes(deliveryCitySearch.toLowerCase());
                                                        })
                                                        .map((city, idx) => {
                                                            const cityName = typeof city === 'object' ? (city.name || city.ville || city.city || '') : city;
                                                            return (
                                                                <button
                                                                    key={`${cityName}-${idx}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, delivery_city: cityName });
                                                                        setDeliveryCitySearch('');
                                                                        setShowCityDropdown(false);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-sm transition"
                                                                >
                                                                    {cityName}
                                                                </button>
                                                            );
                                                        })
                                                    }
                                                    {deliveryCompanyCities.filter((city) => {
                                                        const cityName = typeof city === 'object' ? (city.name || city.ville || city.city || '') : city;
                                                        return cityName.toLowerCase().includes(deliveryCitySearch.toLowerCase());
                                                    }).length === 0 && (
                                                        <div className="px-3 py-2 text-xs text-gray-500 text-center">No cities found</div>
                                                    )}
                                                </div>
                                            )}
                                            {formData.delivery_city && (
                                                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                                                    Selected: <strong>{formData.delivery_city}</strong>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className={`text-xs ${deliveryCitiesError ? 'text-red-600' : 'text-gray-500'}`}>
                                            {deliveryCitiesError || 'No cities available for this company.'}
                                        </p>
                                    )}
                                    {deliveryCitiesWarning && (
                                        <p className="text-xs text-amber-700">{deliveryCitiesWarning}</p>
                                    )}
                                </div>
                            )}
                            {errors.delivery_assignment && (
                                <p className="mt-2 text-xs text-red-600">{errors.delivery_assignment[0]}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.orderForm.notes')}</label>
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
                        <h2 className="text-lg font-semibold text-gray-900">{t('admin.orderForm.products')}</h2>
                        <button
                            type="button"
                            onClick={addOrderItem}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                            {t('admin.orderForm.addProduct')}
                        </button>
                    </div>

                    {formData.vendor_id && (
                        <p className="mb-4 text-sm text-slate-500">
                            {t('admin.orderForm.showingOnlyAllowedProducts')}
                        </p>
                    )}

                    <div className="space-y-3">
                        {orderItems.map((item, index) => {
                            const selectedProduct = products.find((product) => String(product.id) === String(item.product_id));
                            const productImage = getProductImageSrc(selectedProduct);

                            return (
                            <div key={index} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-12 md:items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.orderForm.image')}</label>
                                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        {productImage ? (
                                            <img
                                                src={productImage}
                                                alt={selectedProduct?.name || 'Selected product'}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="px-3 text-center text-xs text-slate-400">{t('admin.orderForm.noImage')}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('admin.orderForm.product')} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={item.product_id}
                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">{t('admin.orderForm.selectProduct')}</option>
                                        {availableProducts.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} - {product.sku}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedProduct && (
                                        <p className="mt-2 text-xs text-slate-500">
                                            {selectedProduct.name}
                                            {selectedProduct.sku ? ` • ${selectedProduct.sku}` : ''}
                                        </p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('admin.orderForm.quantity')} <span className="text-red-500">*</span>
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('admin.orderForm.price')} <span className="text-red-500">*</span>
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.orderForm.total')}</label>
                                    <input
                                        type="text"
                                        value={formatCurrency(item.price * item.quantity)}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                    />
                                </div>

                                <div className="md:col-span-2">
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
                            );
                        })}
                    </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.orderForm.pricingProfit')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {shippingIncludedInPrice ? 'Shipping Cost (included in admin price)' : 'Shipping Cost (from city settings)'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatCurrency(shippingCost)}
                                        className="w-40 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                                    />
                                    <span className="text-xs text-gray-500">Auto-filled when you choose a city.</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fulfillment Price</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatCurrency(fulfillmentPrice)}
                                        className="w-40 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                                    />
                                    <span className="text-xs text-gray-500">
                                        Fixed packaging and handling cost from settings.
                                    </span>
                                </div>
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
                                <span className="text-gray-600">
                                    {shippingIncludedInPrice ? 'Shipping (included):' : 'Shipping:'}
                                </span>
                                <span className="font-medium">{formatCurrency(shippingCost)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Fulfillment:</span>
                                <span className="font-medium">{formatCurrency(fulfillmentPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Discount:</span>
                                <span className="font-medium text-red-600">-{formatCurrency(discountValue)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between">
                                <span className="font-semibold text-lg">Total:</span>
                                <span className="font-bold text-lg text-blue-600">{formatCurrency(calculateTotal())}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between">
                                <span className="font-semibold text-lg">Profit:</span>
                                <span className={`font-bold text-lg ${calculateEstimatedProfit() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(calculateEstimatedProfit())}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate(appPath('/orders'))}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        {t('admin.orderForm.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                                    {loading ? (isEditing ? t('admin.orderForm.updating') : t('admin.orderForm.creating')) : (isEditing ? t('admin.orderForm.updateOrder') : t('admin.orderForm.createOrder'))}
                    </button>
                </div>
            </form>
        </div>
    );
}
