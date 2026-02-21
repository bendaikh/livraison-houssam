import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { Eye, Edit, MessageCircle, RefreshCw, Download } from 'lucide-react';

export default function OrderList() {
    const { formatCurrency } = useSettings();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [shopifyIntegration, setShopifyIntegration] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        manual: 0,
        shopify: 0,
        delivery_company: 0,
        marketplace: 0
    });
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        source: '',
        date_from: '',
        date_to: ''
    });

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
            
            const response = await api.get(`/orders?${params.toString()}`);
            const fetchedOrders = response.data.data;
            setOrders(fetchedOrders);

            // Calculate statistics
            const orderStats = {
                total: fetchedOrders.length,
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
            setShopifyIntegration(shopifyInt);
        } catch (error) {
            console.error('Error fetching Shopify integration:', error);
        }
    };

    const handleSyncShopify = async () => {
        if (!shopifyIntegration) {
            alert('No active Shopify integration found. Please set up Shopify integration first.');
            return;
        }

        try {
            setSyncing(true);
            const response = await api.post(`/api-integrations/${shopifyIntegration.id}/sync`);
            
            if (response.data.success !== false) {
                alert(`Sync completed! ${response.data.log?.successful_records || 0} orders imported successfully.`);
                fetchOrders(); // Refresh the orders list
            } else {
                alert(`Sync failed: ${response.data.error_details || response.data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error syncing Shopify orders:', error);
            
            // Get detailed error message
            let errorMessage = 'Failed to sync Shopify orders. ';
            if (error.response?.data?.error_details) {
                errorMessage += error.response.data.error_details;
            } else if (error.response?.data?.message) {
                errorMessage += error.response.data.message;
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please check your integration settings.';
            }
            
            alert(errorMessage);
            console.log('Full error:', error.response?.data);
        } finally {
            setSyncing(false);
        }
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getSourceBadgeColor = (source) => {
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

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            setUpdatingStatus(orderId);
            await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            // Update local state
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
                <div className="flex gap-3">
                    {shopifyIntegration && (
                        <button
                            onClick={handleSyncShopify}
                            disabled={syncing}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Download size={18} />
                            {syncing ? 'Syncing...' : 'Sync Shopify Orders'}
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/orders/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Create Order
                    </button>
                </div>
            </div>

            {/* Shopify Integration Info Banner */}
            {shopifyIntegration && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-green-900 mb-1">Shopify Integration Active</h3>
                            <p className="text-sm text-green-700">
                                Orders from your Shopify store are automatically imported via webhooks. 
                                Click "Sync Shopify Orders" to manually fetch recent orders. 
                                Last sync: {shopifyIntegration.last_sync_at ? new Date(shopifyIntegration.last_sync_at).toLocaleString() : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!shopifyIntegration && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900 mb-1">Connect Shopify to Import Orders</h3>
                            <p className="text-sm text-blue-700">
                                To automatically import orders from your Shopify store, set up the Shopify integration in the{' '}
                                <Link to="/api-integrations" className="underline font-medium">API Integrations</Link> section.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilters({ ...filters, source: 'manual' })}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Manual</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.manual}</p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilters({ ...filters, source: 'shopify' })}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600">Shopify</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{stats.shopify}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilters({ ...filters, source: 'delivery_company' })}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Delivery</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.delivery_company}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilters({ ...filters, source: 'marketplace' })}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600">Marketplace</p>
                            <p className="text-2xl font-bold text-purple-900 mt-1">{stats.marketplace}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Search by order number, client..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filters.source}
                            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Sources</option>
                            <option value="manual">Manual</option>
                            <option value="shopify">Shopify</option>
                            <option value="delivery_company">Delivery Company</option>
                            <option value="marketplace">Marketplace</option>
                        </select>
                    </div>
                    <div>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Person</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Conf.</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-4 text-center text-gray-500">No orders found</td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {order.order_number}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceBadgeColor(order.source)}`}>
                                                {order.source?.charAt(0).toUpperCase() + order.source?.slice(1).replace('_', ' ') || 'Manual'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {order.client?.name}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {order.client?.phone}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {order.client?.city || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                            {order.shipping_address || order.client?.address || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(order.total)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {order.items?.map(item => (
                                                <div key={item.id} className="text-xs">
                                                    {item.product?.name || item.product_name || 'Unknown Product'} (x{item.quantity})
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                disabled={updatingStatus === order.id}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 ${getStatusBadgeColor(order.status)} ${
                                                    updatingStatus === order.id ? 'opacity-50 cursor-wait' : ''
                                                }`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {order.delivery_person?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {order.confirmation_agent?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1">
                                                {/* WhatsApp */}
                                                {order.client?.phone && (
                                                    <a
                                                        href={`https://wa.me/${order.client.phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="WhatsApp"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                        </svg>
                                                    </a>
                                                )}
                                                {/* Message */}
                                                <button
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Send Message"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                {/* Refresh/Sync */}
                                                <button
                                                    onClick={() => fetchOrders()}
                                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                                    title="Refresh Order"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                                {/* View */}
                                                <Link
                                                    to={`/orders/${order.id}`}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                {/* Edit */}
                                                <Link
                                                    to={`/orders/${order.id}/edit`}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Edit Order"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
