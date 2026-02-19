import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    ArrowLeft, Mail, Phone, MapPin, User, Calendar, 
    ShoppingBag, DollarSign, Building, FileText, Edit2,
    CheckCircle, XCircle
} from 'lucide-react';

export default function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [client, setClient] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClientDetails();
    }, [id]);

    const fetchClientDetails = async () => {
        try {
            setLoading(true);
            const [clientResponse, ordersResponse] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/orders?client_id=${id}`)
            ]);
            setClient(clientResponse.data.data || clientResponse.data);
            setOrders(ordersResponse.data.data || ordersResponse.data);
        } catch (error) {
            console.error('Error fetching client details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-900 mb-2">Client Not Found</h2>
                    <p className="text-red-700 mb-4">The client you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Back to Clients
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/clients')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                            {client.name}
                        </h1>
                        <p className="text-slate-600 mt-1">Client Details</p>
                    </div>
                </div>
                <Link
                    to={`/clients/${id}/edit`}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 font-semibold shadow-lg shadow-cyan-500/30 transition-all flex items-center space-x-2"
                >
                    <Edit2 size={20} />
                    <span>Edit Client</span>
                </Link>
            </div>

            {/* Client Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <User size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Contact Information</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Name */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            <User size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Full Name</p>
                                <p className="text-lg font-semibold text-slate-800">{client.name}</p>
                            </div>
                        </div>

                        {/* Email */}
                        {client.email && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <Mail size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Email Address</p>
                                    <a href={`mailto:${client.email}`} className="text-lg font-semibold text-cyan-600 hover:text-cyan-700">
                                        {client.email}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Phone */}
                        {client.phone && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <Phone size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Phone Number</p>
                                    <a href={`tel:${client.phone}`} className="text-lg font-semibold text-cyan-600 hover:text-cyan-700">
                                        {client.phone}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Address */}
                        {(client.address || client.city || client.state) && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <MapPin size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Address</p>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {client.address}
                                        {client.address && (client.city || client.state) && <br />}
                                        {[client.city, client.state, client.postal_code].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            {client.is_active ? (
                                <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" />
                            ) : (
                                <XCircle size={20} className="text-red-600 mt-1 flex-shrink-0" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status</p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold mt-1 ${
                                    client.is_active 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {client.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Notes */}
                        {client.notes && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <FileText size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Notes</p>
                                    <p className="text-slate-800 mt-1">{client.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Created Date */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            <Calendar size={20} className="text-cyan-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Client Since</p>
                                <p className="text-lg font-semibold text-slate-800">{formatDate(client.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Statistics</h2>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                    <ShoppingBag size={24} className="text-blue-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                                <p className="text-3xl font-bold text-blue-600 mt-1">{client.orders_count || 0}</p>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign size={24} className="text-green-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">Total Spent</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">
                                    {formatCurrency(parseFloat(client.total_spent || 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Recent Orders</h2>
                
                {orders.length === 0 ? (
                    <div className="text-center py-12">
                        <ShoppingBag size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No orders yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {order.order_number}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {formatCurrency(order.total)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <Link
                                                to={`/orders/${order.id}`}
                                                className="text-cyan-600 hover:text-cyan-900 font-medium"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
