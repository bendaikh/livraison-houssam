import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Edit, MessageCircle, RefreshCw, Trash2, Truck, MapPin, AlertCircle, X } from 'lucide-react';
import DeliveryCompanyModal from '../../components/DeliveryCompanyModal';
import { isAdminRole, isConfirmationAgentRole, isDeliveryPersonRole, isVendorRole } from '../../utils/roles';
import { calculateOrderProfit, getFulfillmentPrice } from '../../utils/profit';
import { formatDeliveryDispatchFailureMessage } from '../../utils/delivery';

export default function OrderList({ status = '' }) {
    const { formatCurrency, settings } = useSettings();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [deletingOrderId, setDeletingOrderId] = useState(null);
    const [isWebhookOnly, setIsWebhookOnly] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [selectedOrderForAgent, setSelectedOrderForAgent] = useState(null);
    const [deliveryWorkflowModal, setDeliveryWorkflowModal] = useState({
        isOpen: false,
        order: null,
        nextStatus: '',
        mode: 'status',
        collectedAmount: '',
        note: '',
        callbackDate: '',
        errors: {},
        saving: false,
    });
    const [assignmentScope, setAssignmentScope] = useState('my');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0
    });
    const [stats, setStats] = useState({
        total: 0,
        manual: 0,
        shopify: 0,
        google_sheet: 0,
        delivery_company: 0,
        marketplace: 0,
        whatsapp: 0
    });
    const [filters, setFilters] = useState({
        search: '',
        status: status,
        source: '',
        date_from: '',
        date_to: '',
        page: 1
    });
    const roleSlug = user?.role?.slug;
    const isAdminUser = isAdminRole(roleSlug);
    const isVendorUser = isVendorRole(roleSlug);
    const isConfirmationAgentUser = isConfirmationAgentRole(roleSlug);
    const isDeliveryPersonUser = isDeliveryPersonRole(roleSlug);
    const [isDarkMode, setIsDarkMode] = useState(() => (
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ));
    
    useEffect(() => {
        setFilters(prev => ({ ...prev, status: status, page: 1 }));
    }, [status]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setIsDarkMode(root.classList.contains('dark'));
        });

        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!(isConfirmationAgentUser || isDeliveryPersonUser)) return;

        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('todo') === 'today') {
            setAssignmentScope('todo');
        }
    }, [isConfirmationAgentUser, isDeliveryPersonUser, location.search]);
    
    useEffect(() => {
        fetchOrders();
        fetchShopifyIntegration();
    }, [filters, assignmentScope, location.search, isConfirmationAgentUser, isDeliveryPersonUser]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.source) params.append('source', filters.source);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            params.append('page', filters.page);
            params.append('per_page', pagination.per_page);
            if (isConfirmationAgentUser) {
                params.append('assignment_scope', assignmentScope);
                const searchParams = new URLSearchParams(location.search);
                if (searchParams.get('todo') === 'today' || assignmentScope === 'todo') {
                    params.append('callback_due', 'today');
                }
            } else if (isDeliveryPersonUser) {
                const searchParams = new URLSearchParams(location.search);
                if (searchParams.get('todo') === 'today' || assignmentScope === 'todo') {
                    params.append('callback_due', 'today');
                }
            }
            
            const response = await api.get(`/orders?${params.toString()}`);
            const fetchedOrders = response.data.data;
            setOrders(fetchedOrders);

            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                per_page: response.data.per_page,
                total: response.data.total,
                from: response.data.from,
                to: response.data.to
            });

            const orderStats = {
                total: response.data.total,
                manual: fetchedOrders.filter(o => o.source === 'manual').length,
                shopify: fetchedOrders.filter(o => o.source === 'shopify').length,
                google_sheet: fetchedOrders.filter(o => o.source === 'google_sheet').length,
                delivery_company: fetchedOrders.filter(o => o.source === 'delivery_company').length,
                marketplace: fetchedOrders.filter(o => o.source === 'marketplace').length,
                whatsapp: fetchedOrders.filter(o => o.source === 'whatsapp').length
            };
            setStats(orderStats);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShopifyIntegration = async () => {
        if (isDeliveryPersonUser) {
            return;
        }

        try {
            const response = await api.get('/api-integrations');
            const shopifyInt = response.data.find(int => int.type === 'shopify' && int.is_active);
            if (shopifyInt) {
                const hasWebhook = shopifyInt.credentials?.webhook_secret;
                setIsWebhookOnly(hasWebhook);
            }
        } catch (error) {
            console.error('Error fetching Shopify integration:', error);
        }
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            reported: 'bg-sky-100 text-sky-800',
            picked_up: 'bg-indigo-100 text-indigo-800',
            ready_for_shipping: 'bg-cyan-100 text-cyan-800',
            shipped: 'bg-purple-100 text-purple-800',
            out_for_delivery: 'bg-violet-100 text-violet-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            no_response: 'bg-amber-100 text-amber-800',
            refused: 'bg-orange-100 text-orange-800',
            returned: 'bg-pink-100 text-pink-800',
            return_requested: 'bg-rose-100 text-rose-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getSourceColor = (source) => {
        const colors = {
            manual: 'bg-gray-100 text-gray-800',
            shopify: 'bg-green-100 text-green-800',
            google_sheet: 'bg-emerald-100 text-emerald-800',
            delivery_company: 'bg-blue-100 text-blue-800',
            marketplace: 'bg-purple-100 text-purple-800'
            ,
            whatsapp: 'bg-emerald-100 text-emerald-800'
        };
        return colors[source] || 'bg-gray-100 text-gray-800';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDeliveryStatus = (status) => {
        if (!status) return '';
        if (status === 'sent_to_pickup') return 'sent';
        return status.replace(/_/g, ' ');
    };

    const formatStatusLabel = (status) => {
        const labels = {
            no_response: 'no response',
            return_requested: 'return requested',
            reported: 'reporte',
        };

        return labels[status] || String(status || '').replace(/_/g, ' ');
    };
    const deliveryStatusOptions = ['delivered', 'refused', 'cancelled', 'no_response', 'returned'];
    const motifRequiredStatuses = ['refused', 'cancelled', 'no_response', 'returned'];
    const deliveryPrimaryActions = [
        { key: 'delivered', label: '✓ Delivered', tone: 'bg-emerald-600 text-white hover:bg-emerald-700' },
        { key: 'refused', label: '✗ Refused', tone: isDarkMode ? 'bg-red-900/70 text-red-200 border border-red-800 hover:bg-red-800/80' : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100' },
        { key: 'no_response', label: '📵 No Answer', tone: isDarkMode ? 'bg-orange-900/70 text-orange-200 border border-orange-800 hover:bg-orange-800/80' : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100' },
        { key: 'cancelled', label: '⊗ Cancelled', tone: isDarkMode ? 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50' },
        { key: 'return_to_confirmation', label: '↶ Deny', tone: isDarkMode ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-900 hover:bg-cyan-900/80' : 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100' },
        { key: 'report', label: '📋 Callback', tone: isDarkMode ? 'bg-amber-950/70 text-amber-200 border border-amber-900 hover:bg-amber-900/80' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' },
    ];

    const isConfirmationAgentStatusLocked = (order) => {
        if (order?.delivery_tracking_code) {
            return true;
        }

        if (order?.delivery_person_id && (Boolean(order?.confirmed_at) || order?.status === 'confirmed')) {
            return true;
        }

        return Boolean(order?.confirmed_at) || order?.status === 'confirmed';
    };

    const isSellerStatusLocked = (order) => {
        return isVendorUser && (Boolean(order?.returned_to_confirmation_at) || isConfirmationAgentStatusLocked(order));
    };

    const getSellerStatusLockMessage = (order) => {
        if (order?.returned_to_confirmation_at) {
            return 'Status is now handled by the confirmation workflow.';
        }

        if (order?.delivery_tracking_code) {
            return 'Status is now controlled by the delivery company.';
        }

        if (order?.delivery_person_id) {
            return 'Status is now controlled by the assigned delivery person.';
        }

        return 'Status is now locked after confirmation.';
    };

    const getConfirmationAgentStatusLockMessage = (order) => {
        if (order?.delivery_tracking_code) {
            return 'Status is now controlled by the delivery company.';
        }

        if (order?.delivery_person_id) {
            return 'Status is now controlled by the assigned delivery person.';
        }

        return 'Status is now locked after confirmation.';
    };

    const isDeliveryWorkflowLocked = (order) => Boolean(order?.delivery_workflow_locked);

    const getDeliveryWorkflowLockMessage = () => {
        return 'This order is locked because the related delivery invoice has been marked as paid.';
    };

    const deliveryCompanyAdminLockedStatuses = [
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

    const isAdminDeliveryCompanyStatusLocked = (order) => {
        if (!isAdminUser) {
            return false;
        }

        return Boolean(order?.delivery_integration_id)
            && Boolean(order?.delivery_tracking_code)
            && deliveryCompanyAdminLockedStatuses.includes(order?.status);
    };

    const isAdminStatusLocked = (order) => {
        if (!isAdminUser) {
            return false;
        }

        return isDeliveryWorkflowLocked(order) || isAdminDeliveryCompanyStatusLocked(order);
    };

    const getAdminStatusLockMessage = (order) => {
        if (isDeliveryWorkflowLocked(order)) {
            return 'Status is locked for admins after the delivery person invoice is marked as paid.';
        }

        return 'Status is locked for admins once the delivery company marks the order as picked up.';
    };

    const getStatusOptionsForOrder = (order) => {
        if (!isDeliveryPersonUser) {
            return [
                'pending',
                'confirmed',
                'reported',
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
        }

        return Array.from(new Set([
            order.status,
            ...deliveryStatusOptions,
        ]));
    };

    const openDeliveryWorkflowModal = (order, config = {}) => {
        setDeliveryWorkflowModal({
            isOpen: true,
            order,
            mode: config.mode || 'status',
            nextStatus: config.nextStatus || order.status,
            collectedAmount: config.collectedAmount ?? (order.collected_amount || order.total || ''),
            note: config.note || order.delivery_status_note || '',
            callbackDate: config.callbackDate || '',
            errors: {},
            saving: false,
        });
    };

    const closeDeliveryWorkflowModal = () => {
        setDeliveryWorkflowModal({
            isOpen: false,
            order: null,
            nextStatus: '',
            mode: 'status',
            collectedAmount: '',
            note: '',
            callbackDate: '',
            errors: {},
            saving: false,
        });
    };

    const getDeliveryAgentLabel = (order) => {
        return order.delivery_person?.name || order.delivery_agent?.name || '';
    };

    const getDeliveryCompanyLabel = (order) => {
        const integration = order.delivery_integration;
        if (!integration) return '';

        const providerLabels = {
            tawsilex: 'Tawsilex',
            tawsilex_api: 'Tawsilex',
            tasiliex: 'Tawsilex',
            bmdelivery: 'BMDelivery',
            bm_delivery: 'BMDelivery',
            bm_delivery_ma: 'BMDelivery',
            vadomax: 'BMDelivery',
            smanager: 'Tawsilex'
        };

        const providerKey = (integration.provider || integration.credentials?.provider || integration.name || '').toLowerCase();
        const friendlyProvider = providerLabels[providerKey] ||
            (providerKey ? providerKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');

        // Always prioritize a known provider label (BMDelivery / Tawsilex) over custom names like "smanager"
        if (friendlyProvider) return friendlyProvider;
        if (integration.name && !/api/i.test(integration.name)) return integration.name;
        if (integration.name) return integration.name.replace(/api/ig, '').trim();
        if (integration.provider) return integration.provider.replace(/_/g, ' ');
        return '';
    };

    const getDeliveryCompanyTone = (order, { interactive = false } = {}) => {
        const integration = order.delivery_integration;
        const providerKey = (
            integration?.provider
            || integration?.credentials?.provider
            || integration?.name
            || ''
        ).toLowerCase();

        if (['tawsilex', 'tawsilex_api', 'tasiliex', 'smanager'].includes(providerKey)) {
            return interactive
                ? 'bg-[#FFF4E8] text-[#ED9339] border border-[#F7C791] hover:bg-[#FDE8D2]'
                : 'bg-[#FFF4E8] text-[#ED9339] border border-[#F7C791]';
        }

        if (['bmdelivery', 'bm_delivery', 'bm_delivery_ma', 'vadomax'].includes(providerKey)) {
            return interactive
                ? 'bg-[#EEF4FF] text-[#3667C8] border border-[#BFD1F5] hover:bg-[#DDE9FF]'
                : 'bg-[#EEF4FF] text-[#3667C8] border border-[#BFD1F5]';
        }

        return interactive
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100'
            : 'bg-slate-100 text-slate-700 border border-slate-200';
    };

    const getConfirmationAgentLabel = (order) => {
        if (order.confirmation_agent?.name) {
            return order.confirmation_agent.name;
        }

        if (order.confirmation_agent_id && String(order.confirmation_agent_id) === String(user?.id)) {
            return user?.name || 'You';
        }

        return '';
    };

    const getSellerLabel = (order) => {
        if (order.vendor?.name) {
            return order.vendor.name;
        }

        if (user?.vendor?.id && String(order.vendor_id) === String(user.vendor.id)) {
            return user.vendor.name || user.name || '';
        }

        return '';
    };

    const calculateOrderBenefit = (order) => {
        return calculateOrderProfit({
            items: order.items || [],
            shippingPrice: parseFloat(order.shipping_cost) || 0,
            fulfillmentPrice: getFulfillmentPrice(settings.order_fulfillment_cost),
            discount: parseFloat(order.discount) || 0,
        });
    };

    const calculateOrderAmount = (order) => {
        const subtotal = parseFloat(order.subtotal);

        if (Number.isFinite(subtotal)) {
            return subtotal - (parseFloat(order.discount) || 0);
        }

        return (order.items || []).reduce((sum, item) => {
            const itemPrice = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity, 10) || 0;

            return sum + (itemPrice * qty);
        }, 0) - (parseFloat(order.discount) || 0);
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const currentOrder = orders.find(o => o.id === orderId);

        if (isDeliveryPersonUser) {
            if (!currentOrder || newStatus === currentOrder.status) {
                return;
            }

            openDeliveryWorkflowModal(currentOrder, { mode: 'status', nextStatus: newStatus });
            return;
        }

        try {
            if (newStatus === 'confirmed' && !currentOrder?.delivery_tracking_code) {
                const assignedPersonId = currentOrder?.delivery_person_id || null;
                const assignedCompanyId = currentOrder?.delivery_integration_id || null;
                const assignedCity = currentOrder?.delivery_city || currentOrder?.city || '';

                if (assignedPersonId) {
                    setUpdatingStatus(orderId);
                    const response = await api.patch(`/orders/${orderId}/status`, {
                        status: newStatus,
                        delivery_person_id: assignedPersonId,
                    });

                    setOrders(orders.map(order =>
                        order.id === orderId ? { ...order, ...response.data } : order
                    ));

                    return;
                }

                if (assignedCompanyId && assignedCity) {
                    setUpdatingStatus(orderId);
                    const response = await api.patch(`/orders/${orderId}/status`, {
                        status: newStatus,
                        delivery_integration_id: assignedCompanyId,
                        delivery_city: assignedCity
                    });

                    setOrders(orders.map(order =>
                        order.id === orderId ? { ...order, ...response.data } : order
                    ));

                    if (response.data.delivery_error) {
                        alert(formatDeliveryDispatchFailureMessage(response.data.delivery_error));
                    }
                    return;
                }

                setPendingStatusChange({
                    orderId,
                    newStatus,
                    preferredCompanyId: assignedCompanyId,
                    preferredCity: assignedCity,
                    preferredDeliveryPersonId: assignedPersonId,
                });
                setShowDeliveryModal(true);
                return;
            }

            setUpdatingStatus(orderId);
            const response = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(orders.map(order => 
                order.id === orderId ? { ...order, ...response.data } : order
            ));
        } catch (error) {
            console.error('Error updating order status:', error);
            alert(error.response?.data?.message || 'Failed to update order status');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleDeliveryWorkflowSubmit = async (event) => {
        event.preventDefault();

        const { order, mode, nextStatus, callbackDate, note, collectedAmount } = deliveryWorkflowModal;

        if (!order) return;

        const errors = {};
        if (mode === 'status') {
            if (!nextStatus) {
                errors.nextStatus = 'Select a status.';
            }
            if (motifRequiredStatuses.includes(nextStatus) && !String(note).trim()) {
                errors.note = 'Motif is required for this status.';
            }
            if (nextStatus === 'delivered' && (collectedAmount === '' || Number(collectedAmount) <= 0)) {
                errors.collectedAmount = 'Collected amount is required.';
            }
        }

        if (mode === 'report') {
            if (!callbackDate) {
                errors.callbackDate = 'Callback date is required.';
            }
        }

        if (mode === 'return' && !String(note).trim()) {
            errors.note = 'Reason is required.';
        }

        if (Object.keys(errors).length > 0) {
            setDeliveryWorkflowModal((prev) => ({ ...prev, errors }));
            return;
        }

        try {
            setDeliveryWorkflowModal((prev) => ({ ...prev, saving: true, errors: {} }));
            const payload = {};

            if (mode === 'status') {
                payload.status = nextStatus;
                payload.delivery_status_note = note || undefined;
                if (nextStatus === 'delivered') {
                    payload.collected_amount = Number(collectedAmount);
                }
            }

            if (mode === 'report') {
                payload.callback_date = callbackDate;
                payload.delivery_status_note = note;
            }

            if (mode === 'report' && nextStatus && nextStatus !== order.status) {
                payload.status = nextStatus;
            }

            if (mode === 'return') {
                payload.return_to_confirmation = true;
                payload.delivery_status_note = note;
                payload.return_status = nextStatus || 'returned';
            }

            const response = await api.patch(`/orders/${order.id}/delivery-workflow`, payload);
            setOrders((prev) => mode === 'return'
                ? prev.filter((entry) => entry.id !== order.id)
                : prev.map((entry) => (
                    entry.id === order.id ? { ...entry, ...response.data } : entry
                )));
            closeDeliveryWorkflowModal();
        } catch (error) {
            console.error('Error saving delivery workflow:', error);

            if (error.response?.data?.errors) {
                const responseErrors = error.response.data.errors;
                setDeliveryWorkflowModal((prev) => ({
                    ...prev,
                    saving: false,
                    errors: {
                        nextStatus: responseErrors.status?.[0],
                        note: responseErrors.delivery_status_note?.[0],
                        callbackDate: responseErrors.callback_date?.[0],
                        collectedAmount: responseErrors.collected_amount?.[0],
                    },
                }));
                return;
            }

            alert(error.response?.data?.message || 'Failed to update delivery workflow.');
            setDeliveryWorkflowModal((prev) => ({ ...prev, saving: false }));
        }
    };

    const handleDeliveryCompanyConfirm = async (assignmentPayload) => {
        if (!pendingStatusChange) return;

        const { orderId, newStatus } = pendingStatusChange;
        
        try {
            setUpdatingStatus(orderId);
            const response = await api.patch(`/orders/${orderId}/status`, {
                status: newStatus,
                ...assignmentPayload,
            });
            
            setOrders(orders.map(order => 
                order.id === orderId ? { ...order, ...response.data } : order
            ));
            
            setShowDeliveryModal(false);
            setPendingStatusChange(null);
            
            if (response.data.delivery_error) {
                alert(formatDeliveryDispatchFailureMessage(response.data.delivery_error));
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleDeleteOrder = async (orderId, orderNumber) => {
        if (!window.confirm(`Delete order ${orderNumber}? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingOrderId(orderId);
            await api.delete(`/orders/${orderId}`);
            await fetchOrders();
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order');
        } finally {
            setDeletingOrderId(null);
        }
    };

    const handleAssignToMe = async (orderId) => {
        try {
            await api.post(`/orders/${orderId}/assign-to-me`);
            await fetchOrders();
        } catch (error) {
            console.error('Error assigning order to current confirmation agent:', error);
            alert(error.response?.data?.message || 'Failed to assign this order.');
        }
    };

    const handleAgentClick = (order) => {
        setSelectedOrderForAgent(order);
        setShowAgentModal(true);
    };

    const closeAgentModal = () => {
        setShowAgentModal(false);
        setSelectedOrderForAgent(null);
    };

    const getPageTitle = () => {
        if (isConfirmationAgentUser && assignmentScope === 'available') return 'Available Orders';
        if (isConfirmationAgentUser && assignmentScope === 'todo') return 'Today Follow-Ups';
        if (isConfirmationAgentUser) return 'My Orders';
        if (isDeliveryPersonUser && assignmentScope === 'todo') return 'Today Callbacks';
        if (isDeliveryPersonUser) return 'My Delivery Orders';
        if (!status) return 'Orders';
        return `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`;
    };

    if (isDeliveryPersonUser) {
        return (
            <div className={`min-h-screen p-4 md:p-6 ${isDarkMode ? 'bg-slate-950' : 'bg-[#f5f1e8]'}`}>
                <DeliveryWorkflowModal
                    modal={deliveryWorkflowModal}
                    onClose={closeDeliveryWorkflowModal}
                    onSubmit={handleDeliveryWorkflowSubmit}
                    formatStatusLabel={formatStatusLabel}
                    motifRequiredStatuses={motifRequiredStatuses}
                    setModal={setDeliveryWorkflowModal}
                />

                <div className="max-w-5xl mx-auto space-y-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-sky-300/70' : 'text-slate-500'}`}>Delivery workflow</p>
                            <h1 className={`mt-1 text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{getPageTitle()}</h1>
                            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fast action cards with only the information needed in the field.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    setAssignmentScope('my');
                                    navigate('/orders');
                                }}
                                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                                    assignmentScope === 'my'
                                        ? 'bg-slate-900 text-white'
                                        : isDarkMode
                                            ? 'bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800'
                                            : 'bg-white text-slate-700 border border-slate-300'
                                }`}
                            >
                                Assigned Orders
                            </button>
                            <button
                                onClick={() => {
                                    setAssignmentScope('todo');
                                    navigate('/orders?todo=today');
                                }}
                                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                                    assignmentScope === 'todo' || new URLSearchParams(location.search).get('todo') === 'today'
                                        ? 'bg-slate-900 text-white'
                                        : isDarkMode
                                            ? 'bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800'
                                            : 'bg-white text-slate-700 border border-slate-300'
                                }`}
                            >
                                Today Callbacks
                            </button>
                        </div>
                    </div>

                    <div className={`rounded-[28px] p-4 ${isDarkMode ? 'border border-slate-800 bg-slate-900 shadow-lg shadow-black/20' : 'border border-slate-200 bg-white shadow-sm'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_0.8fr_auto] gap-3">
                            <input
                                type="text"
                                placeholder="Search by client, phone, or order number"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                                className={`px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-slate-700' : 'border-slate-300 focus:ring-slate-300'}`}
                            />
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                                className={`px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-700' : 'border-slate-300 focus:ring-slate-300'}`}
                            >
                                <option value="">All statuses</option>
                                <option value="delivered">Delivered</option>
                                <option value="reported">Reporte</option>
                                <option value="refused">Refused</option>
                                <option value="no_response">No Answer</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                                onClick={() => setFilters((prev) => ({ ...prev, search: '', status: '', page: 1 }))}
                                className={`px-4 py-3 rounded-2xl text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className={`rounded-[28px] border p-12 text-center ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
                            <div className="inline-block animate-spin h-8 w-8 border-4 border-slate-200 border-t-slate-700 rounded-full mb-3"></div>
                            <p className="text-base font-medium">Loading orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className={`rounded-[28px] border p-12 text-center ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
                            <p className="text-base font-medium">No assigned orders match the current filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <DeliveryPersonOrderCard
                                    key={order.id}
                                    order={order}
                                    formatCurrency={formatCurrency}
                                    formatDate={formatDate}
                                    formatStatusLabel={formatStatusLabel}
                                    actionButtons={deliveryPrimaryActions}
                                    isDarkMode={isDarkMode}
                                    onAction={(actionKey) => {
                                        if (actionKey === 'return_to_confirmation') {
                                            openDeliveryWorkflowModal(order, { mode: 'return', nextStatus: 'returned' });
                                            return;
                                        }

                                        if (actionKey === 'report') {
                                            openDeliveryWorkflowModal(order, { mode: 'report', nextStatus: order.status });
                                            return;
                                        }

                                        openDeliveryWorkflowModal(order, { mode: 'status', nextStatus: actionKey });
                                    }}
                                    isLocked={isDeliveryWorkflowLocked(order)}
                                    lockMessage={getDeliveryWorkflowLockMessage()}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && orders.length > 0 && (
                        <div className={`flex items-center justify-between rounded-[28px] border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900 shadow-lg shadow-black/20' : 'border-slate-200 bg-white shadow-sm'}`}>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Showing {pagination.from}-{pagination.to} of {pagination.total} orders</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilters((prev) => ({ ...prev, page: pagination.current_page - 1 }))}
                                    disabled={pagination.current_page === 1}
                                    className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                                        pagination.current_page === 1
                                            ? (isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                                            : (isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300')
                                    }`}
                                >
                                    ◀ Previous
                                </button>
                                <button
                                    onClick={() => setFilters((prev) => ({ ...prev, page: pagination.current_page + 1 }))}
                                    disabled={pagination.current_page === pagination.last_page}
                                    className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                                        pagination.current_page === pagination.last_page
                                            ? (isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                                            : (isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300')
                                    }`}
                                >
                                    Next ▶
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <DeliveryCompanyModal
                isOpen={showDeliveryModal}
                onClose={() => {
                    setShowDeliveryModal(false);
                    setPendingStatusChange(null);
                }}
                onConfirm={handleDeliveryCompanyConfirm}
                preferredCompanyId={pendingStatusChange?.preferredCompanyId}
                preferredCity={pendingStatusChange?.preferredCity}
                preferredDeliveryPersonId={pendingStatusChange?.preferredDeliveryPersonId}
            />

            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                </div>
                {!isConfirmationAgentUser && !isDeliveryPersonUser && !isVendorUser && (
                    <button
                        onClick={() => navigate('/orders/create')}
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                        + Create Order
                    </button>
                )}
            </div>

            {(isConfirmationAgentUser || isDeliveryPersonUser) && (
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        onClick={() => {
                            setAssignmentScope('my');
                            navigate('/orders');
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            assignmentScope === 'my' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                        {isDeliveryPersonUser ? 'Assigned Orders' : 'My Orders'}
                    </button>
                    {isConfirmationAgentUser && (
                        <button
                            onClick={() => {
                                setAssignmentScope('available');
                                navigate('/orders');
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                assignmentScope === 'available' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                        >
                            Available Queue
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setAssignmentScope('todo');
                            navigate('/orders?todo=today');
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            assignmentScope === 'todo' || new URLSearchParams(location.search).get('todo') === 'today'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                        {isDeliveryPersonUser ? 'Today Callbacks' : 'Today Follow-Ups'}
                    </button>
                </div>
            )}

            {/* Shopify Banner */}
            {!isConfirmationAgentUser && !isDeliveryPersonUser && (isWebhookOnly || !isWebhookOnly) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-xs">
                    <div className="flex gap-2">
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-700 font-semibold">{isWebhookOnly ? '✓ Shopify Active' : 'Connect Shopify'}</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
                <div 
                    onClick={() => setFilters({ ...filters, source: '', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-gray-400"
                >
                    <p className="text-[10px] text-gray-600 mb-0.5 font-medium uppercase">Total</p>
                    <p className="text-base font-bold text-gray-900">{stats.total}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'manual', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-gray-400"
                >
                    <p className="text-[10px] text-gray-600 mb-0.5 font-medium uppercase">Manual</p>
                    <p className="text-base font-bold text-gray-900">{stats.manual}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'shopify', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-green-500"
                >
                    <p className="text-[10px] text-green-600 mb-0.5 font-medium uppercase">Shopify</p>
                    <p className="text-base font-bold text-green-900">{stats.shopify}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'google_sheet', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-emerald-500"
                >
                    <p className="text-[10px] text-emerald-600 mb-0.5 font-medium uppercase">Sheets</p>
                    <p className="text-base font-bold text-emerald-900">{stats.google_sheet}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'delivery_company', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-blue-500"
                >
                    <p className="text-[10px] text-blue-600 mb-0.5 font-medium uppercase">Delivery</p>
                    <p className="text-base font-bold text-blue-900">{stats.delivery_company}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'marketplace', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-purple-500"
                >
                    <p className="text-[10px] text-purple-600 mb-0.5 font-medium uppercase">Market</p>
                    <p className="text-base font-bold text-purple-900">{stats.marketplace}</p>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, source: 'whatsapp', page: 1 })}
                    className="bg-white rounded-lg p-2 shadow-sm hover:shadow transition-all cursor-pointer border-l-2 border-emerald-500"
                >
                    <p className="text-[10px] text-emerald-600 mb-0.5 font-medium uppercase">WhatsApp</p>
                    <p className="text-base font-bold text-emerald-900">{stats.whatsapp}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg p-3 shadow-sm mb-3 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="">Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="reported">Reporte</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_response">No Response</option>
                        <option value="refused">Refused</option>
                        <option value="returned">Returned</option>
                    </select>
                    <select
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="">Source</option>
                        <option value="manual">Manual</option>
                        <option value="shopify">Shopify</option>
                        <option value="google_sheet">Google Sheet</option>
                        <option value="delivery_company">Delivery</option>
                        <option value="marketplace">Marketplace</option>
                        <option value="whatsapp">WhatsApp</option>
                    </select>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-0.5">
                {loading ? (
                    <div className="bg-white rounded-lg p-12 text-center text-gray-500">
                        <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full mb-3"></div>
                        <p className="text-base font-medium">Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-lg p-12 text-center text-gray-500">
                        <p className="text-base font-medium">No orders found</p>
                        <p className="text-sm mt-1">
                            {isConfirmationAgentUser
                                ? 'Try another queue or wait for new assignments.'
                                : isDeliveryPersonUser
                                    ? 'No assigned orders match the selected filters.'
                                : 'Try adjusting your filters or create a new order'}
                        </p>
                    </div>
                ) : (
                    orders.map(order => {
                        const deliveryAgentLabel = getDeliveryAgentLabel(order);
                        const companyLabel = getDeliveryCompanyLabel(order);
                        const confirmationAgentLabel = getConfirmationAgentLabel(order);
                        const sellerLabel = getSellerLabel(order);
                        const orderAmount = calculateOrderAmount(order);
                        const orderBenefit = calculateOrderBenefit(order);
                        const upsellItems = (order.items || []).filter((item) => item.is_upsell);
                        const primaryItems = (order.items || []).filter((item) => !item.is_upsell);
                        const isBlacklisted = Boolean(order.is_blacklisted);
                        const canWorkOnOrder = isConfirmationAgentUser
                            ? String(order.confirmation_agent_id) === String(user?.id)
                            : isDeliveryPersonUser
                                ? String(order.delivery_person_id) === String(user?.id)
                                : true;
                        const isResponsibleConfirmationAgent = Boolean(order.confirmation_agent_id)
                            && String(order.confirmation_agent_id) === String(user?.id);
                        const confirmationStatusLocked = isConfirmationAgentUser && isConfirmationAgentStatusLocked(order);
                        const sellerStatusLocked = isSellerStatusLocked(order);
                        const deliveryWorkflowIsLocked = isDeliveryPersonUser && isDeliveryWorkflowLocked(order);
                        const adminStatusLocked = isAdminStatusLocked(order);
                        const statusLockMessage = confirmationStatusLocked
                            ? getConfirmationAgentStatusLockMessage(order)
                            : sellerStatusLocked
                                ? getSellerStatusLockMessage(order)
                            : deliveryWorkflowIsLocked
                                ? getDeliveryWorkflowLockMessage(order)
                            : adminStatusLocked
                                ? getAdminStatusLockMessage(order)
                                : '';
                        const assignmentPrimaryLabel = companyLabel || deliveryAgentLabel || '+ Assign';
                        const interactiveDeliveryTone = companyLabel
                            ? getDeliveryCompanyTone(order, { interactive: true })
                            : deliveryAgentLabel
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100';
                        const staticDeliveryTone = companyLabel
                            ? getDeliveryCompanyTone(order)
                            : deliveryAgentLabel
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200';
                        
                        const statusBorderColor = {
                            pending: 'border-l-yellow-400',
                            confirmed: 'border-l-blue-400',
                            reported: 'border-l-sky-400',
                            picked_up: 'border-l-indigo-400',
                            ready_for_shipping: 'border-l-cyan-400',
                            shipped: 'border-l-purple-400',
                            out_for_delivery: 'border-l-violet-400',
                            delivered: 'border-l-green-400',
                            cancelled: 'border-l-red-400',
                            no_response: 'border-l-amber-400',
                            refused: 'border-l-orange-400',
                            returned: 'border-l-pink-400',
                            return_requested: 'border-l-rose-400'
                        };

                        return (
                            <div
                                key={order.id}
                                className={`rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 overflow-hidden ${
                                    isBlacklisted
                                        ? 'bg-rose-50 border border-rose-200'
                                        : 'bg-white'
                                } ${statusBorderColor[order.status] || 'border-l-gray-400'}`}
                            >
                                {/* Header Row - Compact and clean */}
                                <div className={`flex items-center justify-between gap-3 px-4 py-1.5 border-b border-gray-100 ${isBlacklisted ? 'bg-rose-100/70' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-xs font-bold text-blue-700 flex-shrink-0">{order.order_number}</span>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded flex-shrink-0 ${getSourceColor(order.source)}`}>
                                            {order.source?.replace('_', ' ').substring(0, 3).toUpperCase() || 'MAN'}
                                        </span>
                                        {isBlacklisted && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded flex-shrink-0 bg-rose-600 text-white">
                                                {order.blacklist_badge || 'Banned / Blacklisted'}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-600 flex-shrink-0">{formatDate(order.created_at)}</span>
                                        {order.callback_date && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800 flex-shrink-0">
                                                Callback {formatDate(order.callback_date)}
                                            </span>
                                        )}
                                    </div>
                                    {confirmationStatusLocked || sellerStatusLocked || deliveryWorkflowIsLocked || adminStatusLocked ? (
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0" title={statusLockMessage}>
                                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${getStatusBadgeColor(order.status)}`}>
                                                {formatStatusLabel(order.status)}
                                            </span>
                                            <span className="text-[9px] font-medium text-slate-500">
                                                {deliveryWorkflowIsLocked || (adminStatusLocked && isDeliveryWorkflowLocked(order)) ? 'Invoice locked' : 'Delivery controlled'}
                                            </span>
                                        </div>
                                    ) : (
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            disabled={updatingStatus === order.id || !canWorkOnOrder}
                                            title={statusLockMessage}
                                            className={`px-2 py-0.5 text-[10px] font-semibold rounded border-0 cursor-pointer flex-shrink-0 ${getStatusBadgeColor(order.status)} ${
                                                updatingStatus === order.id || !canWorkOnOrder ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 transition-opacity'
                                            }`}
                                        >
                                            {getStatusOptionsForOrder(order).map((value) => (
                                                <option key={value} value={value}>
                                                    {formatStatusLabel(value)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Content - Horizontal table layout */}
                                <div className="grid gap-x-2 gap-y-3 px-4 py-2 text-xs leading-snug items-start" style={{gridTemplateColumns: '1.45fr 0.95fr 1.05fr 1.05fr 0.9fr 0.9fr 1fr 1.25fr auto'}}>
                                    
                                    {/* CLIENT COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Client</p>
                                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{order.client?.name || '-'}</p>
                                        <p className="text-gray-600 text-[10px] leading-tight truncate">{order.client?.phone || '-'}</p>
                                        <p className="text-gray-500 text-[10px] leading-tight truncate">{order.city || order.client?.city || '-'}</p>
                                        {order.callback_date && (
                                            <p className="text-amber-700 text-[10px] leading-tight truncate">Follow-up: {formatDate(order.callback_date)}</p>
                                        )}
                                        {isBlacklisted && order.blacklist_entry?.reason && (
                                            <p className="text-rose-700 text-[10px] leading-tight">
                                                Blacklist: {order.blacklist_entry.reason}
                                            </p>
                                        )}
                                        {order.shipping_address && (
                                            <p className="text-gray-500 text-[10px] leading-tight truncate">{order.shipping_address}</p>
                                        )}
                                        {order.delivery_status_note && (
                                            <p className="text-rose-700 text-[10px] leading-tight">
                                                Motif: {order.delivery_status_note}
                                            </p>
                                        )}
                                    </div>

                                    {/* SELLER COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Seller</p>
                                        {sellerLabel ? (
                                            <>
                                                <p className="font-bold text-gray-900 text-sm leading-tight truncate">{sellerLabel}</p>
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                                                Direct
                                            </span>
                                        )}
                                    </div>

                                    {/* CONFIRMATION COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Confirmation</p>
                                        {confirmationAgentLabel ? (
                                            <>
                                                <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                                                    {confirmationAgentLabel}
                                                </p>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                                    isResponsibleConfirmationAgent
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {isResponsibleConfirmationAgent ? 'Responsible' : 'Assigned'}
                                                </span>
                                                {order.returned_to_confirmation_at && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-700">
                                                        Back from delivery
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                                                Unassigned
                                            </span>
                                        )}
                                    </div>

                                    {/* ITEMS COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Items</p>
                                        <div className="space-y-0.25">
                                            {primaryItems.slice(0, 2).map((item, idx) => (
                                                <div key={idx} className="text-[11px] text-gray-800 leading-snug truncate">
                                                    <span className="font-medium">{item.product?.name?.substring(0, 12) || item.product_name?.substring(0, 12) || 'Item'}</span>
                                                    <span className="text-gray-600"> ×{item.quantity}</span>
                                                </div>
                                            ))}
                                            {primaryItems.length > 2 && (
                                                <p className="text-[11px] text-blue-600 font-semibold leading-snug">+{primaryItems.length - 2} more</p>
                                            )}
                                            {upsellItems.length > 0 && (
                                                <p className="text-[11px] text-emerald-700 font-semibold leading-snug">
                                                    Upsell: {upsellItems.map((item) => item.product?.name || item.product_name || 'Product').join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* AMOUNT COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                            {isDeliveryPersonUser ? 'Collected' : 'Amount'}
                                        </p>
                                        <p className="font-bold text-gray-900 text-sm leading-tight">
                                            {formatCurrency(isDeliveryPersonUser ? (order.collected_amount || 0) : orderAmount)}
                                        </p>
                                    </div>

                                    {/* BENEFIT COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                            {isDeliveryPersonUser ? 'Commission' : 'Profit'}
                                        </p>
                                        <p className={`font-bold text-sm leading-tight ${
                                            isDeliveryPersonUser
                                                ? 'text-emerald-700'
                                                : orderBenefit > 0 ? 'text-green-600' : orderBenefit < 0 ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                            {formatCurrency(isDeliveryPersonUser ? (order.delivery_person_commission || 0) : orderBenefit)}
                                        </p>
                                    </div>

                                    {/* TRACKING COLUMN */}
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                            {isDeliveryPersonUser ? 'Due Admin' : 'Tracking'}
                                        </p>
                                        {isDeliveryPersonUser ? (
                                            <p className="text-amber-700 font-semibold text-[11px] leading-snug">
                                                {formatCurrency(order.amount_due_to_admin || 0)}
                                            </p>
                                        ) : order.delivery_tracking_code ? (
                                            <p className="text-blue-700 font-mono font-semibold text-[10px] truncate leading-snug" title={order.delivery_tracking_code}>
                                                {order.delivery_tracking_code.substring(0, 12)}
                                            </p>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                                                Not assigned
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-0.5 flex flex-col items-start">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                            {isConfirmationAgentUser ? 'Assignment' : isDeliveryPersonUser ? 'Actions' : 'Delivery'}
                                        </p>
                                        {isConfirmationAgentUser ? (
                                            assignmentScope === 'available' && !order.confirmation_agent_id ? (
                                                <button
                                                    onClick={() => handleAssignToMe(order.id)}
                                                    className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100"
                                                >
                                                    Assign to me
                                                </button>
                                            ) : canWorkOnOrder ? (
                                                <button
                                                    onClick={() => handleAgentClick(order)}
                                                    className={`inline-flex w-fit max-w-fit self-start items-center whitespace-nowrap px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${interactiveDeliveryTone}`}
                                                    title={assignmentPrimaryLabel}
                                                >
                                                    <span className="truncate max-w-[140px]">
                                                        {assignmentPrimaryLabel}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold ${staticDeliveryTone}`}>
                                                    {assignmentPrimaryLabel}
                                                </span>
                                            )
                                        ) : isDeliveryPersonUser ? (
                                            <>
                                                <span className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                                                    {order.delivery_person?.name || 'Assigned'}
                                                </span>
                                                {!deliveryWorkflowIsLocked && canWorkOnOrder && (
                                                    <button
                                                        onClick={() => openDeliveryWorkflowModal(order, { mode: 'report', nextStatus: order.status })}
                                                        className="mt-2 inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 hover:bg-amber-100"
                                                    >
                                                        Report / Callback
                                                    </button>
                                                )}
                                                {!deliveryWorkflowIsLocked && canWorkOnOrder && (
                                                    <button
                                                        onClick={() => openDeliveryWorkflowModal(order, { mode: 'return', nextStatus: 'returned' })}
                                                        className="mt-2 inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold border border-cyan-200 hover:bg-cyan-100"
                                                    >
                                                        Send Back to Confirmation
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleAgentClick(order)}
                                                className={`inline-flex w-fit max-w-fit self-start items-center whitespace-nowrap px-3 py-0.5 rounded-full text-xs font-semibold transition-all ${interactiveDeliveryTone}`}
                                                title={assignmentPrimaryLabel}
                                            >
                                                <span className="truncate max-w-[140px]">
                                                    {assignmentPrimaryLabel}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {/* ACTION ICONS COLUMN */}
                                    <div className="flex items-start gap-0.5">
                                        {order.client?.phone && (
                                            <a
                                                href={`https://wa.me/${order.client.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors flex-shrink-0"
                                                title="Send WhatsApp"
                                            >
                                                <MessageCircle size={15} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => fetchOrders()}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                            title="Refresh"
                                        >
                                            <RefreshCw size={15} />
                                        </button>
                                        {canWorkOnOrder && (
                                            <Link
                                                to={`/orders/${order.id}`}
                                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors flex-shrink-0"
                                                title="View Details"
                                            >
                                                <Eye size={15} />
                                            </Link>
                                        )}
                                        {canWorkOnOrder && !isDeliveryPersonUser && (
                                            <Link
                                                to={`/orders/${order.id}/edit`}
                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors flex-shrink-0"
                                                title="Edit Order"
                                            >
                                                <Edit size={15} />
                                            </Link>
                                        )}
                                        {!isConfirmationAgentUser && !isDeliveryPersonUser && (
                                            <button
                                                onClick={() => handleDeleteOrder(order.id, order.order_number)}
                                                disabled={deletingOrderId === order.id}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                                                title="Delete Order"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    )}

                {/* Pagination */}
                {!loading && orders.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between border border-gray-100">
                        <span className="text-sm text-gray-600 font-medium">Showing {pagination.from}-{pagination.to} of {pagination.total} orders</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilters({ ...filters, page: pagination.current_page - 1 })}
                                disabled={pagination.current_page === 1}
                                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${pagination.current_page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                            >
                                ◀ Previous
                            </button>
                            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                                .filter(page => page === 1 || page === pagination.last_page || (page >= pagination.current_page - 1 && page <= pagination.current_page + 1))
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && <span className="px-2 text-gray-400">•••</span>}
                                        <button
                                            onClick={() => setFilters({ ...filters, page })}
                                            className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${pagination.current_page === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => setFilters({ ...filters, page: pagination.current_page + 1 })}
                                disabled={pagination.current_page === pagination.last_page}
                                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${pagination.current_page === pagination.last_page ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                            >
                                Next ▶
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <DeliveryWorkflowModal
                modal={deliveryWorkflowModal}
                onClose={closeDeliveryWorkflowModal}
                onSubmit={handleDeliveryWorkflowSubmit}
                formatStatusLabel={formatStatusLabel}
                motifRequiredStatuses={motifRequiredStatuses}
                setModal={setDeliveryWorkflowModal}
            />

            {/* Agent Assignment Modal */}
            {showAgentModal && selectedOrderForAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <AgentAssignmentModal
                        order={selectedOrderForAgent}
                        onClose={closeAgentModal}
                        onAssign={() => {
                            closeAgentModal();
                            fetchOrders();
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function DeliveryWorkflowModal({ modal, onClose, onSubmit, formatStatusLabel, motifRequiredStatuses, setModal }) {
    if (!modal.isOpen || !modal.order) {
        return null;
    }

    const actionRequiresMotif = modal.mode === 'status' && motifRequiredStatuses.includes(modal.nextStatus);
    const isReturnMode = modal.mode === 'return';

    return (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {modal.mode === 'report' ? 'Callback' : isReturnMode ? 'Return to Confirmation' : 'Delivery action'}
                        </p>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">
                            {modal.mode === 'report'
                                ? 'Report / Callback'
                                : isReturnMode
                                    ? 'Send Back to Confirmation'
                                    : formatStatusLabel(modal.nextStatus)}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {modal.order.client?.name || 'Client'} • {modal.order.order_number}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    {isReturnMode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Return status</label>
                            <select
                                value={modal.nextStatus || 'returned'}
                                onChange={(event) => setModal((prev) => ({ ...prev, nextStatus: event.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-2xl"
                            >
                                <option value="returned">Returned</option>
                                <option value="refused">Refused</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="no_response">No Response</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">This status will be shown to the confirmation team when the order goes back.</p>
                        </div>
                    )}

                    {modal.mode === 'report' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Callback date</label>
                            <input
                                type="date"
                                value={modal.callbackDate}
                                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                                onChange={(event) => setModal((prev) => ({ ...prev, callbackDate: event.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-2xl"
                            />
                            {modal.errors.callbackDate && (
                                <p className="text-xs text-red-600 mt-1">{modal.errors.callbackDate}</p>
                            )}
                        </div>
                    )}

                    {modal.mode === 'status' && modal.nextStatus === 'delivered' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Collected amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={modal.collectedAmount}
                                onChange={(event) => setModal((prev) => ({ ...prev, collectedAmount: event.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-2xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Commission and due-to-admin values are calculated automatically.</p>
                            {modal.errors.collectedAmount && (
                                <p className="text-xs text-red-600 mt-1">{modal.errors.collectedAmount}</p>
                            )}
                        </div>
                    )}

                    {isReturnMode && (
                        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                            This removes the current delivery person assignment and sends the order back to the confirmation workflow.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {isReturnMode
                                ? 'Reason (required)'
                                : modal.mode === 'report' ? 'Motif (optional)' : actionRequiresMotif ? 'Motif (required)' : 'Motif (optional)'}
                        </label>
                        <textarea
                            rows="4"
                            value={modal.note}
                            onChange={(event) => setModal((prev) => ({ ...prev, note: event.target.value }))}
                            className="w-full px-4 py-3 border border-slate-300 rounded-2xl"
                            placeholder={
                                isReturnMode
                                    ? 'Explain why this order must go back to confirmation.'
                                    : modal.mode === 'report'
                                    ? 'Add a note only if needed.'
                                    : actionRequiresMotif
                                        ? 'Why was this order marked this way?'
                                        : 'Add a note if needed.'
                            }
                        />
                        {modal.errors.note && (
                            <p className="text-xs text-red-600 mt-1">{modal.errors.note}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 border border-slate-300 rounded-2xl text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={modal.saving}
                            className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                            {modal.saving
                                ? 'Saving...'
                                : isReturnMode
                                    ? 'Send Back'
                                    : modal.mode === 'report' ? 'Save Callback' : 'Save Action'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeliveryPersonOrderCard({
    order,
    formatCurrency,
    formatDate,
    formatStatusLabel,
    actionButtons,
    isDarkMode,
    onAction,
    isLocked,
    lockMessage,
}) {
    const items = (order.items || []).filter((item) => !item.is_upsell);
    const itemSummary = items.length === 0
        ? 'No items'
        : items.map((item) => `${item.product?.name || item.product_name || 'Item'} x${item.quantity}`).join(', ');

    return (
        <article className={`overflow-hidden rounded-[28px] border ${isDarkMode ? 'border-slate-800 bg-slate-900 shadow-lg shadow-black/20' : 'border-slate-200 bg-white shadow-sm'}`}>
            <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-[#fbfaf6]'}`}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{order.client?.name || 'Client'}</h2>
                        <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span>{order.client?.phone || order.phone || '-'}</span>
                            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                            <span>{order.city || order.client?.city || '-'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                            {formatStatusLabel(order.status)}
                        </span>
                        {order.callback_date && (
                            <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>Callback {formatDate(order.callback_date)}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Items</p>
                    <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{itemSummary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Collected</p>
                        <p className={`mt-1.5 text-base font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(order.collected_amount || 0)}</p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Commission</p>
                        <p className="mt-1.5 text-base font-bold text-emerald-500">{formatCurrency(order.delivery_person_commission || 0)}</p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Due to admin</p>
                        <p className="mt-1.5 text-base font-bold text-amber-500">{formatCurrency(order.amount_due_to_admin || 0)}</p>
                    </div>
                </div>

                {order.delivery_status_note && (
                    <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-rose-900 bg-rose-950/40' : 'border-rose-100 bg-rose-50'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-rose-300' : 'text-rose-400'}`}>Motif</p>
                        <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-rose-100' : 'text-rose-800'}`}>{order.delivery_status_note}</p>
                    </div>
                )}

                {isLocked ? (
                    <div className={`rounded-lg border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-800 bg-slate-950/70 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {lockMessage}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {actionButtons.map((action) => (
                            <button
                                key={action.key}
                                onClick={() => onAction(action.key)}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${action.tone}`}
                                title={action.label}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

function AgentAssignmentModal({ order, onClose, onAssign }) {
    const [assignmentType, setAssignmentType] = useState('person');
    const [deliveryPersonId, setDeliveryPersonId] = useState(order?.delivery_person_id || '');
    const [selectedCompanyId, setSelectedCompanyId] = useState(order?.delivery_integration_id || null);
    const [selectedCity, setSelectedCity] = useState(order?.delivery_city || order?.city || '');
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [cities, setCities] = useState([]);
    const [citySearch, setCitySearch] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const [cityError, setCityError] = useState('');

    const fetchCities = async (companyId) => {
        if (!companyId) {
            setCities([]);
            return;
        }

        try {
            setLoadingCities(true);
            setCityError('');
            const response = await api.get(`/orders/delivery-companies/${companyId}/cities`);
            const cityList = Array.isArray(response.data) ? response.data : [];
            setCities(cityList);
            if (cityList.length === 0) {
                setCityError('No cities available for this delivery company.');
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setCityError('Failed to load cities. Please try again.');
            setCities([]);
        } finally {
            setLoadingCities(false);
        }
    };

    const fetchDeliveryData = async (preferredCompanyId = null) => {
        try {
            setLoadingData(true);
            setAssignmentError('');
            const [personsRes, companiesRes] = await Promise.all([
                api.get('/delivery-persons'),
                api.get('/orders/delivery-companies/available')
            ]);
            setDeliveryPersons(personsRes.data || []);
            setDeliveryCompanies(companiesRes.data || []);
            if (preferredCompanyId) {
                await fetchCities(preferredCompanyId);
            } else {
                setCities([]);
            }
        } catch (error) {
            console.error('Error fetching delivery data:', error);
            setAssignmentError('Failed to load delivery data. Please try again.');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        const preferredCompanyId = order?.delivery_integration_id || null;
        setDeliveryPersonId(order?.delivery_person_id || '');
        setSelectedCompanyId(preferredCompanyId);
        setSelectedCity(order?.delivery_city || order?.city || '');
        fetchDeliveryData(preferredCompanyId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id]);

    const handleCompanySelect = async (companyId) => {
        setSelectedCompanyId(companyId);
        setSelectedCity('');
        setCitySearch('');
        await fetchCities(companyId);
    };

    const handleAssign = async () => {
        setAssignmentError('');

        if (assignmentType === 'person' && !deliveryPersonId) {
            setAssignmentError('Please select a delivery person first.');
            return;
        }

        if (assignmentType === 'company') {
            if (!selectedCompanyId) {
                setAssignmentError('Choose a delivery company.');
                return;
            }
            if (!selectedCity) {
                setAssignmentError('Please select a delivery city.');
                return;
            }
        }

        try {
            setSaving(true);

            if (assignmentType === 'person') {
                await api.patch(`/orders/${order.id}/assign-agent`, {
                    delivery_person_id: parseInt(deliveryPersonId, 10),
                    delivery_integration_id: null
                });
            } else {
                await api.patch(`/orders/${order.id}/assign-agent`, {
                    delivery_person_id: null,
                    delivery_agent_id: null,
                    delivery_integration_id: parseInt(selectedCompanyId, 10),
                    delivery_city: selectedCity
                });
            }

            onAssign();
        } catch (error) {
            console.error('Error assigning delivery data:', error);
            const serverMessage = error.response?.data?.message || error.message;
            setAssignmentError(serverMessage || 'Failed to assign. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getCityName = (city) => {
        return typeof city === 'object' ? (city.name || city.ville || city.city || 'Unknown') : city;
    };

    const filteredCities = cities.filter((city) =>
        getCityName(city).toLowerCase().includes(citySearch.toLowerCase())
    );

    return (
        <div className="bg-white rounded-lg shadow-lg max-w-xl w-full p-4">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Assign Delivery</h2>
                    <p className="text-xs text-gray-600">Order: <span className="font-semibold">{order.order_number}</span></p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                    <X size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
                <button
                    type="button"
                    onClick={() => {
                        setAssignmentType('person');
                        setAssignmentError('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                        assignmentType === 'person'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Delivery Person
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setAssignmentType('company');
                        setAssignmentError('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                        assignmentType === 'company'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Delivery Company
                </button>
            </div>

            {/* Body */}
            {loadingData ? (
                <div className="py-6 text-center text-xs text-gray-500">Loading delivery data...</div>
            ) : (
                <div className="mt-4 space-y-4">
                    {assignmentType === 'person' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Select Delivery Person</label>
                            {deliveryPersons.length === 0 ? (
                                <p className="text-xs text-gray-500">No delivery persons found.</p>
                            ) : (
                                <select
                                    value={deliveryPersonId}
                                    onChange={(e) => setDeliveryPersonId(e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">-- Choose Person --</option>
                                    {deliveryPersons.map(person => (
                                        <option key={person.id} value={person.id}>
                                            {person.name} {person.phone ? `(${person.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {assignmentType === 'company' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-600">Select Delivery Company</p>
                                    <span className="text-xs text-gray-400">{deliveryCompanies.length} available</span>
                                </div>
                                {deliveryCompanies.length === 0 ? (
                                    <p className="text-xs text-gray-500 mt-1">No active delivery companies configured.</p>
                                ) : (
                                    <div className="mt-2 space-y-2">
                                        {deliveryCompanies.map(company => (
                                            <button
                                                key={company.id}
                                                type="button"
                                                onClick={() => handleCompanySelect(company.id)}
                                                className={`w-full flex items-center justify-between p-3 border rounded-lg transition ${
                                                    selectedCompanyId === company.id
                                                        ? 'border-blue-400 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                            >
                                                <div className="flex flex-col text-left">
                                                    <span className="text-sm font-semibold text-gray-900">{company.name}</span>
                                                    <span className="text-[11px] text-gray-500 uppercase">{company.provider || company.credentials?.provider || 'delivery'} provider</span>
                                                </div>
                                                <Truck className="text-gray-400" size={18} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-600">Delivery City</p>
                                    <MapPin className="text-gray-400" size={14} />
                                </div>
                                {loadingCities ? (
                                    <div className="py-4 text-center text-xs text-gray-500">Loading cities...</div>
                                ) : selectedCompanyId ? (
                                    <>
                                        <input
                                            type="text"
                                            value={citySearch}
                                            onChange={(e) => setCitySearch(e.target.value)}
                                            placeholder="Search city..."
                                            className="w-full mt-2 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        />
                                        {cityError && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                                                <AlertCircle size={14} />
                                                <span>{cityError}</span>
                                            </div>
                                        )}
                                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                            {filteredCities.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-gray-500">No cities found.</div>
                                            ) : (
                                                filteredCities.map((city, index) => {
                                                    const cityName = getCityName(city);
                                                    return (
                                                        <label
                                                            key={`${cityName}-${index}`}
                                                            className={`flex items-center px-3 py-2 text-xs cursor-pointer border-b last:border-b-0 transition ${
                                                                selectedCity === cityName
                                                                    ? 'bg-blue-50 text-blue-900'
                                                                    : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="delivery_city"
                                                                value={cityName}
                                                                checked={selectedCity === cityName}
                                                                onChange={() => setSelectedCity(cityName)}
                                                                className="h-3 w-3 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 font-medium">{cityName}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-2">Pick a delivery company to see its coverage.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {assignmentError && (
                <div className="mt-3 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    <AlertCircle size={14} />
                    <span>{assignmentError}</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onClose}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAssign}
                    disabled={saving || loadingData}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Assigning...' : 'Assign'}
                </button>
            </div>
        </div>
    );
}
