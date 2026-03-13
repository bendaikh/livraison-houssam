import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    Package, User, MapPin, Phone, Calendar, DollarSign, 
    Truck, UserCheck, ArrowLeft, Edit, Printer, CheckCircle,
    Clock, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency, settings } = useSettings();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orders/${id}`);
            setOrder(response.data);
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncDeliveryStatus = async () => {
        if (!order.delivery_tracking_code) {
            alert('This order does not have a tracking code.');
            return;
        }

        // Check for invalid tracking codes
        if (order.delivery_tracking_code.toLowerCase() === 'ko') {
            alert('This order has an invalid tracking code.\n\nThe order was not successfully sent to BMDelivery.\n\nPlease try sending the order to BMDelivery again by updating the order status to "confirmed".');
            return;
        }

        try {
            setSyncing(true);
            const response = await api.post(`/orders/${id}/sync-delivery-status`);
            
            if (response.data.result.status_changed) {
                alert(`Status synced successfully!\n\nDelivery Status: ${response.data.result.old_delivery_status} → ${response.data.result.new_delivery_status}`);
            } else {
                alert(`Status is up to date.\n\nCurrent Delivery Status: ${response.data.result.new_delivery_status}`);
            }
            
            // Refresh order data
            await fetchOrder();
        } catch (error) {
            console.error('Error syncing delivery status:', error);
            
            let errorMessage = error.response?.data?.error || error.message;
            
            // Provide helpful context for common errors
            if (errorMessage.includes('Invalid tracking code')) {
                errorMessage = 'This order has an invalid tracking code.\n\nThe order was not successfully sent to BMDelivery.\n\nPlease try sending the order again.';
            } else if (errorMessage.includes('not found in BMDelivery system')) {
                errorMessage = 'Tracking code not found in BMDelivery.\n\nThe order may not have been successfully sent.\n\nPlease check the order in BMDelivery dashboard or try sending it again.';
            }
            
            alert('Failed to sync delivery status:\n\n' + errorMessage);
        } finally {
            setSyncing(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
            picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            ready_for_shipping: 'bg-cyan-100 text-cyan-800 border-cyan-200',
            shipped: 'bg-purple-100 text-purple-800 border-purple-200',
            out_for_delivery: 'bg-violet-100 text-violet-800 border-violet-200',
            delivered: 'bg-green-100 text-green-800 border-green-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
            refused: 'bg-orange-100 text-orange-800 border-orange-200',
            returned: 'bg-pink-100 text-pink-800 border-pink-200',
            return_requested: 'bg-rose-100 text-rose-800 border-rose-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: Clock,
            confirmed: CheckCircle,
            picked_up: Package,
            ready_for_shipping: Package,
            shipped: Truck,
            out_for_delivery: Truck,
            delivered: CheckCircle,
            cancelled: XCircle,
            refused: XCircle,
            returned: XCircle,
            return_requested: AlertCircle
        };
        const Icon = icons[status] || AlertCircle;
        return <Icon size={20} />;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDeliveryStatus = (status) => {
        if (!status) return '';

        // Backward compatibility for records created during the temporary label change.
        if (status === 'sent_to_pickup') {
            return 'sent';
        }

        return status.replace(/_/g, ' ');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const currencySymbol = settings.currency_symbol || 'MAD';
        
        const formatPrice = (amount) => {
            const num = parseFloat(amount) || 0;
            return `${num.toFixed(2)} ${currencySymbol}`;
        };

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Order #${order.order_number}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        color: #333;
                        line-height: 1.6;
                    }
                    .header {
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .header p {
                        color: #666;
                    }
                    .status-row {
                        display: flex;
                        justify-content: space-between;
                        background: #f5f5f5;
                        padding: 15px 20px;
                        margin-bottom: 30px;
                        border-radius: 5px;
                    }
                    .status-row .status {
                        font-weight: bold;
                        text-transform: capitalize;
                    }
                    .section {
                        margin-bottom: 30px;
                    }
                    .section h2 {
                        font-size: 16px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                    }
                    .info-group {
                        margin-bottom: 10px;
                    }
                    .info-group label {
                        font-size: 12px;
                        color: #666;
                        display: block;
                    }
                    .info-group p {
                        font-weight: 500;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background: #f5f5f5;
                        font-weight: 600;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .summary {
                        margin-top: 20px;
                        border-top: 2px solid #333;
                        padding-top: 15px;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                    }
                    .summary-row.total {
                        font-size: 18px;
                        font-weight: bold;
                        border-top: 1px solid #ddd;
                        padding-top: 15px;
                        margin-top: 10px;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                    }
                    @media print {
                        body {
                            padding: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${settings.app_name || 'Livraison'}</h1>
                    <p>Order #${order.order_number}</p>
                    <p>Date: ${formatDate(order.created_at)}</p>
                </div>

                <div class="status-row">
                    <div>
                        <span>Status: </span>
                        <span class="status">${order.status}</span>
                    </div>
                    <div>
                        <span>Source: </span>
                        <span style="text-transform: capitalize;">${order.source || 'Manual'}</span>
                    </div>
                </div>

                <div class="grid">
                    <div class="section">
                        <h2>Client Information</h2>
                        <div class="info-group">
                            <label>Name</label>
                            <p>${order.client?.name || 'N/A'}</p>
                        </div>
                        <div class="info-group">
                            <label>Phone</label>
                            <p>${order.client?.phone || 'N/A'}</p>
                        </div>
                        ${order.client?.email ? `
                        <div class="info-group">
                            <label>Email</label>
                            <p>${order.client.email}</p>
                        </div>
                        ` : ''}
                        ${order.whatsapp ? `
                        <div class="info-group">
                            <label>WhatsApp</label>
                            <p>${order.whatsapp}</p>
                        </div>
                        ` : ''}
                    </div>

                    <div class="section">
                        <h2>Shipping Information</h2>
                        <div class="info-group">
                            <label>Address</label>
                            <p>${order.shipping_address || order.client?.address || 'N/A'}</p>
                        </div>
                        ${order.client?.city ? `
                        <div class="info-group">
                            <label>City</label>
                            <p>${order.client.city}</p>
                        </div>
                        ` : ''}
                        ${order.delivery_agent ? `
                        <div class="info-group">
                            <label>Delivery Agent</label>
                            <p>${order.delivery_agent.name}</p>
                        </div>
                        ` : ''}
                        ${order.delivery_person ? `
                        <div class="info-group">
                            <label>Delivery Person</label>
                            <p>${order.delivery_person.name}</p>
                        </div>
                        ` : ''}
                        ${order.confirmation_agent ? `
                        <div class="info-group">
                            <label>Confirmation Agent</label>
                            <p>${order.confirmation_agent.name}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="section">
                    <h2>Order Items</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items?.map(item => `
                                <tr>
                                    <td>${item.product?.name || item.product_name || 'Unknown Product'}</td>
                                    <td>${item.product?.sku || item.sku || 'N/A'}</td>
                                    <td class="text-right">${formatPrice(item.price)}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">${formatPrice(item.price * item.quantity)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>

                    <div class="summary">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>${formatPrice(order.subtotal || order.total)}</span>
                        </div>
                        ${parseFloat(order.shipping_cost) > 0 ? `
                        <div class="summary-row">
                            <span>Shipping</span>
                            <span>${formatPrice(order.shipping_cost)}</span>
                        </div>
                        ` : ''}
                        ${parseFloat(order.tax) > 0 ? `
                        <div class="summary-row">
                            <span>Tax</span>
                            <span>${formatPrice(order.tax)}</span>
                        </div>
                        ` : ''}
                        ${parseFloat(order.discount) > 0 ? `
                        <div class="summary-row">
                            <span>Discount</span>
                            <span>-${formatPrice(order.discount)}</span>
                        </div>
                        ` : ''}
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>${formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>

                ${order.notes ? `
                <div class="section">
                    <h2>Notes</h2>
                    <p>${order.notes}</p>
                </div>
                ` : ''}

                <div class="footer">
                    <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                    <p>${settings.app_name || 'Livraison'} - Order Management System</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Order not found</p>
                <button
                    onClick={() => navigate('/orders')}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                >
                    Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/orders')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
                        <p className="text-gray-500 mt-1">Order #{order.order_number}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Link
                        to={`/orders/${order.id}/edit`}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Edit size={18} />
                        <span>Edit Order</span>
                    </Link>
                    <button
                        onClick={handlePrint}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <Printer size={18} />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`flex items-center justify-between p-6 rounded-xl border-2 ${getStatusColor(order.status)}`}>
                <div className="flex items-center space-x-3">
                    {getStatusIcon(order.status)}
                    <div>
                        <p className="text-sm font-medium">Order Status</p>
                        <p className="text-2xl font-bold capitalize">{order.status}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium">Order Date</p>
                    <p className="text-lg">{formatDate(order.created_at)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Package className="mr-2" size={20} />
                                Order Items
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {order.items?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{item.product?.name || item.product_name || 'Unknown Product'}</h3>
                                            <p className="text-sm text-gray-500">SKU: {item.product?.sku || item.sku || 'N/A'}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {formatCurrency(item.price)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                {formatCurrency(item.price * item.quantity)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Summary */}
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(order.subtotal || order.total)}</span>
                                </div>
                                {order.shipping_cost > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>{order.shipping_included_in_price ? 'Shipping (included in price)' : 'Shipping'}</span>
                                        <span>{formatCurrency(order.shipping_cost)}</span>
                                    </div>
                                )}
                                {order.tax > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Tax</span>
                                        <span>{formatCurrency(order.tax)}</span>
                                    </div>
                                )}
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(order.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-300">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Notes</h2>
                            <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Client Information */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="mr-2" size={20} />
                            Client Information
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-semibold text-gray-900">{order.client?.name || 'N/A'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Phone size={16} className="text-gray-400" />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium text-gray-900">{order.client?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            {order.client?.email && (
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{order.client.email}</p>
                                </div>
                            )}
                            {order.whatsapp && (
                                <div>
                                    <p className="text-sm text-gray-500">WhatsApp</p>
                                    <a
                                        href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-green-600 hover:text-green-800"
                                    >
                                        {order.whatsapp}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Information */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="mr-2" size={20} />
                            Shipping Information
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Shipping Address</p>
                                <p className="font-medium text-gray-900">
                                    {order.shipping_address || order.client?.address || 'N/A'}
                                </p>
                            </div>
                            {order.client?.city && (
                                <div>
                                    <p className="text-sm text-gray-500">City</p>
                                    <p className="font-medium text-gray-900">{order.client.city}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery & Confirmation Agents */}
                    {(order.delivery_agent || order.delivery_person || order.confirmation_agent) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <UserCheck className="mr-2" size={20} />
                                Agents & Delivery
                            </h2>
                            <div className="space-y-3">
                                {order.delivery_agent && (
                                    <div>
                                        <p className="text-sm text-gray-500">Delivery Agent</p>
                                        <p className="font-semibold text-gray-900">{order.delivery_agent.name}</p>
                                        <p className="text-xs text-gray-400">Responsible for managing delivery</p>
                                    </div>
                                )}
                                {order.delivery_person && (
                                    <div>
                                        <p className="text-sm text-gray-500">Delivery Person</p>
                                        <p className="font-semibold text-gray-900">{order.delivery_person.name}</p>
                                        <p className="text-xs text-gray-400">Physically delivers the product</p>
                                    </div>
                                )}
                                {order.confirmation_agent && (
                                    <div>
                                        <p className="text-sm text-gray-500">Confirmation Agent</p>
                                        <p className="font-semibold text-gray-900">{order.confirmation_agent.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Source */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Source</h2>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                            {order.source || 'Manual'}
                        </span>
                    </div>

                    {/* Delivery Tracking */}
                    {order.delivery_tracking_code && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <Truck className="mr-2" size={20} />
                                    Delivery Tracking
                                </h2>
                                {order.delivery_tracking_code.toLowerCase() !== 'ko' && (
                                    <button
                                        onClick={handleSyncDeliveryStatus}
                                        disabled={syncing}
                                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                                        title="Sync status from delivery company"
                                    >
                                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                        <span>{syncing ? 'Syncing...' : 'Sync Status'}</span>
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Delivery Company</p>
                                    <p className="font-semibold text-gray-900 capitalize">
                                        {order.delivery_integration?.name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Tracking Code</p>
                                    {order.delivery_tracking_code.toLowerCase() === 'ko' ? (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                                                ⚠️ Invalid Tracking Code
                                            </span>
                                            <p className="text-xs text-red-600 mt-2">
                                                This order was not successfully sent to BMDelivery. Please try sending it again.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="font-mono text-sm font-medium text-blue-600">
                                            {order.delivery_tracking_code}
                                        </p>
                                    )}
                                </div>
                                {order.delivery_status && (
                                    <div>
                                        <p className="text-sm text-gray-500">Delivery Status</p>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize mt-1">
                                            {formatDeliveryStatus(order.delivery_status)}
                                        </span>
                                    </div>
                                )}
                                {order.sent_to_delivery_at && (
                                    <div>
                                        <p className="text-sm text-gray-500">Sent to Delivery</p>
                                        <p className="text-sm text-gray-900">
                                            {formatDate(order.sent_to_delivery_at)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
