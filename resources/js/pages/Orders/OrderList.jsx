import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Edit, MessageCircle, RefreshCw, Trash2, Truck, MapPin, AlertCircle, X } from 'lucide-react';
import DeliveryCompanyModal from '../../components/DeliveryCompanyModal';

export default function OrderList({ status = '' }) {
    const { formatCurrency } = useSettings();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [deletingOrderId, setDeletingOrderId] = useState(null);
    const [isWebhookOnly, setIsWebhookOnly] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [selectedOrderForAgent, setSelectedOrderForAgent] = useState(null);
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
        delivery_company: 0,
        marketplace: 0
    });
    const [filters, setFilters] = useState({
        search: '',
        status: status,
        source: '',
        date_from: '',
        date_to: '',
        page: 1
    });
    
    useEffect(() => {
        setFilters(prev => ({ ...prev, status: status, page: 1 }));
    }, [status]);
    
    useEffect(() => {
        fetchOrders();
        fetchShopifyIntegration();
    }, [filters]);

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
                delivery_company: fetchedOrders.filter(o => o.source === 'delivery_company').length,
                marketplace: fetchedOrders.filter(o => o.source === 'marketplace').length
            };
            setStats(orderStats);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShopifyIntegration = async () => {
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
            picked_up: 'bg-indigo-100 text-indigo-800',
            ready_for_shipping: 'bg-cyan-100 text-cyan-800',
            shipped: 'bg-purple-100 text-purple-800',
            out_for_delivery: 'bg-violet-100 text-violet-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
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
            delivery_company: 'bg-blue-100 text-blue-800',
            marketplace: 'bg-purple-100 text-purple-800'
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

    const getAgentLabel = (order) => {
        return order.delivery_person?.name || order.delivery_agent?.name || order.confirmation_agent?.name || '';
    };

    const getDeliveryCompanyLabel = (order) => {
        const integration = order.delivery_integration;
        if (!integration) return '';

        if (integration.name) return integration.name;
        if (integration.provider) return integration.provider.replace(/_/g, ' ');
        return '';
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const currentOrder = orders.find(o => o.id === orderId);

        try {
            if (newStatus === 'confirmed' && !currentOrder?.delivery_tracking_code) {
                const assignedCompanyId = currentOrder?.delivery_integration_id || null;
                const assignedCity = currentOrder?.delivery_city || currentOrder?.city || '';

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
                        alert(`Order confirmed but failed to send to delivery company:\n\n${response.data.delivery_error}\n\nPlease check the client's city and try again.`);
                    }
                    return;
                }

                setPendingStatusChange({
                    orderId,
                    newStatus,
                    preferredCompanyId: assignedCompanyId,
                    preferredCity: assignedCity,
                });
                setShowDeliveryModal(true);
                return;
            }

            setUpdatingStatus(orderId);
            await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(orders.map(order => 
                order.id === orderId ? { ...order, status: newStatus } : order
            ));
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Failed to update order status');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleDeliveryCompanyConfirm = async (deliveryIntegrationId, deliveryCity) => {
        if (!pendingStatusChange) return;

        const { orderId, newStatus } = pendingStatusChange;
        
        try {
            setUpdatingStatus(orderId);
            const response = await api.patch(`/orders/${orderId}/status`, { 
                status: newStatus,
                delivery_integration_id: deliveryIntegrationId,
                delivery_city: deliveryCity
            });
            
            setOrders(orders.map(order => 
                order.id === orderId ? { ...order, ...response.data } : order
            ));
            
            setShowDeliveryModal(false);
            setPendingStatusChange(null);
            
            if (response.data.delivery_error) {
                alert(`Order confirmed but failed to send to delivery company:\n\n${response.data.delivery_error}\n\nPlease check the client's city and try again.`);
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

    const handleAgentClick = (order) => {
        setSelectedOrderForAgent(order);
        setShowAgentModal(true);
    };

    const closeAgentModal = () => {
        setShowAgentModal(false);
        setSelectedOrderForAgent(null);
    };

    const getPageTitle = () => {
        if (!status) return 'Orders';
        return `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-3">
            <DeliveryCompanyModal
                isOpen={showDeliveryModal}
                onClose={() => {
                    setShowDeliveryModal(false);
                    setPendingStatusChange(null);
                }}
                onConfirm={handleDeliveryCompanyConfirm}
                orderId={pendingStatusChange?.orderId}
                preferredCompanyId={pendingStatusChange?.preferredCompanyId}
                preferredCity={pendingStatusChange?.preferredCity}
            />

            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                <button
                    onClick={() => navigate('/orders/create')}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Create Order
                </button>
            </div>

            {/* Shopify Banner */}
            {(isWebhookOnly || !isWebhookOnly) && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs">
                    <div className="flex gap-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-semibold text-blue-900 mb-0.5">
                                {isWebhookOnly ? 'Shopify Integration Active' : 'Connect Shopify'}
                            </p>
                            <p className="text-blue-700">
                                {isWebhookOnly 
                                    ? 'Orders are imported automatically via webhooks.'
                                    : `Setup Shopify integration in `}
                                {!isWebhookOnly && (
                                    <Link to="/api-integrations" className="underline font-semibold">API Integrations</Link>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <div className="bg-white rounded p-2 shadow-sm hover:shadow text-center cursor-pointer" onClick={() => setFilters({ ...filters, source: '', page: 1 })}>
                    <p className="text-xs text-gray-600 mb-0.5">Total</p>
                    <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded p-2 shadow-sm hover:shadow text-center cursor-pointer" onClick={() => setFilters({ ...filters, source: 'manual', page: 1 })}>
                    <p className="text-xs text-gray-600 mb-0.5">Manual</p>
                    <p className="text-lg font-bold">{stats.manual}</p>
                </div>
                <div className="bg-white rounded p-2 shadow-sm hover:shadow text-center cursor-pointer" onClick={() => setFilters({ ...filters, source: 'shopify', page: 1 })}>
                    <p className="text-xs text-green-600 mb-0.5">Shopify</p>
                    <p className="text-lg font-bold text-green-900">{stats.shopify}</p>
                </div>
                <div className="bg-white rounded p-2 shadow-sm hover:shadow text-center cursor-pointer" onClick={() => setFilters({ ...filters, source: 'delivery_company', page: 1 })}>
                    <p className="text-xs text-blue-600 mb-0.5">Delivery</p>
                    <p className="text-lg font-bold text-blue-900">{stats.delivery_company}</p>
                </div>
                <div className="bg-white rounded p-2 shadow-sm hover:shadow text-center cursor-pointer" onClick={() => setFilters({ ...filters, source: 'marketplace', page: 1 })}>
                    <p className="text-xs text-purple-600 mb-0.5">Marketplace</p>
                    <p className="text-lg font-bold text-purple-900">{stats.marketplace}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded p-2 shadow-sm mb-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
                    <input
                        type="text"
                        placeholder="Search by order ID, Shopify ID, client..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Sources</option>
                        <option value="manual">Manual</option>
                        <option value="shopify">Shopify</option>
                        <option value="delivery_company">Delivery</option>
                        <option value="marketplace">Marketplace</option>
                    </select>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-1.5">
                {loading ? (
                    <div className="bg-white rounded p-6 text-center text-gray-500 text-sm">
                        <div className="inline-block animate-spin h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full mb-2"></div>
                        <p>Loading...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded p-6 text-center text-gray-500 text-sm">
                        No orders found
                    </div>
                ) : (
                    orders.map(order => {
                        const agentLabel = getAgentLabel(order);
                        const companyLabel = getDeliveryCompanyLabel(order);
                        const assignmentPrimaryLabel = companyLabel || agentLabel || '+ Assign';
                        
                        const statusBorderColor = {
                            pending: 'border-yellow-400',
                            confirmed: 'border-blue-400',
                            picked_up: 'border-indigo-400',
                            ready_for_shipping: 'border-cyan-400',
                            shipped: 'border-purple-400',
                            out_for_delivery: 'border-violet-400',
                            delivered: 'border-green-400',
                            cancelled: 'border-red-400',
                            refused: 'border-orange-400',
                            returned: 'border-pink-400',
                            return_requested: 'border-rose-400'
                        };

                        return (
                            <div key={order.id} className={`bg-white rounded shadow-sm hover:shadow p-2 border-l-4 ${statusBorderColor[order.status] || 'border-gray-400'}`}>
                                    {/* Header */}
                                    <div className="flex justify-between items-start gap-2 mb-1.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-blue-700">{order.order_number}</span>
                                            {order.source === 'shopify' && order.shopify_name && (
                                                <span className="text-xs text-gray-500 truncate">Shopify #: {order.shopify_name}</span>
                                            )}
                                                </div>
                                                <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${getSourceColor(order.source)}`}>
                                                    {order.source?.replace('_', ' ').substring(0, 3).toUpperCase() || 'MAN'}
                                                </span>
                                                <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
                                            </div>
                                        </div>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            disabled={updatingStatus === order.id}
                                            className={`px-1.5 py-0.5 text-xs font-semibold rounded flex-shrink-0 border-0 ${getStatusBadgeColor(order.status)} ${
                                                updatingStatus === order.id ? 'opacity-50 cursor-wait' : ''
                                            }`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="picked_up">Picked Up</option>
                                            <option value="ready_for_shipping">Ready</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="out_for_delivery">Out</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Products - Quick View */}
                                    <div className="mb-1.5 p-1.5 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Products</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(order.items || []).map((item, idx) => (
                                                <span key={idx} className="text-xs bg-white border border-gray-300 rounded px-2 py-0.5">
                                                    <span className="font-medium">{item.product?.name || item.product_name || 'Item'}</span>
                                                    <span className="text-gray-500"> ×{item.quantity}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content - One Line Compact */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 text-xs mb-1.5">
                                        <div>
                                            <p className="text-gray-500 font-semibold uppercase mb-0.5">Client</p>
                                            <p className="font-medium truncate">{order.client?.name || '-'}</p>
                                            <p className="text-gray-500 truncate">{order.client?.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-semibold uppercase mb-0.5">Location</p>
                                            <p className="font-medium truncate">{order.city || '-'}</p>
                                            <p className="text-gray-500 line-clamp-1">{order.shipping_address || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-semibold uppercase mb-0.5">Amount</p>
                                            <p className="font-bold">{formatCurrency(order.total)}</p>
                                            <p className="text-gray-500">{(order.items || []).length} items</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-semibold uppercase mb-0.5">Tracking</p>
                                            {order.delivery_tracking_code ? (
                                                <>
                                                    <p className="text-blue-600 font-mono truncate">{order.delivery_tracking_code.substring(0, 12)}...</p>
                                                    <p className="text-gray-600">{order.delivery_integration?.provider || ''}</p>
                                                </>
                                            ) : (
                                                <p className="text-gray-400">Not assigned</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-semibold uppercase mb-0.5">Agent</p>
                                            <button
                                                onClick={() => handleAgentClick(order)}
                                                className="group text-gray-600 hover:text-blue-600 hover:underline text-left w-full cursor-pointer transition-colors"
                                            >
                                                <span className="truncate text-sm font-medium group-hover:text-blue-600">
                                                    {assignmentPrimaryLabel}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-0.5 border-t border-gray-100 pt-1">
                                        {order.client?.phone && (
                                            <a
                                                href={`https://wa.me/${order.client.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-0.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="WhatsApp"
                                            >
                                                <MessageCircle size={12} />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => fetchOrders()}
                                            className="p-0.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                            title="Refresh"
                                        >
                                            <RefreshCw size={12} />
                                        </button>
                                        <Link
                                            to={`/orders/${order.id}`}
                                            className="p-0.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                            title="View"
                                        >
                                            <Eye size={12} />
                                        </Link>
                                        <Link
                                            to={`/orders/${order.id}/edit`}
                                            className="p-0.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit size={12} />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteOrder(order.id, order.order_number)}
                                            disabled={deletingOrderId === order.id}
                                            className="p-0.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                {/* Pagination */}
                {!loading && orders.length > 0 && (
                    <div className="bg-white rounded p-2 shadow-sm flex items-center justify-between text-xs">
                        <span className="text-gray-600">{pagination.from}-{pagination.to} of {pagination.total}</span>
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => setFilters({ ...filters, page: pagination.current_page - 1 })}
                                disabled={pagination.current_page === 1}
                                className={`px-1.5 py-0.5 rounded border ${pagination.current_page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                ◀
                            </button>
                            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                                .filter(page => page === 1 || page === pagination.last_page || (page >= pagination.current_page - 1 && page <= pagination.current_page + 1))
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && <span className="px-1 text-gray-400">•••</span>}
                                        <button
                                            onClick={() => setFilters({ ...filters, page })}
                                            className={`px-1.5 py-0.5 rounded ${pagination.current_page === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'}`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => setFilters({ ...filters, page: pagination.current_page + 1 })}
                                disabled={pagination.current_page === pagination.last_page}
                                className={`px-1.5 py-0.5 rounded border ${pagination.current_page === pagination.last_page ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
                    <h2 className="text-lg font-bold text-gray-900">Assign Delivery Agent</h2>
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
