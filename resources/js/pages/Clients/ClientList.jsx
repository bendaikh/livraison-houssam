import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { 
    Plus, Search, Edit2, Trash2, X, Check, Users, 
    Mail, Phone, MapPin, DollarSign, ShoppingBag, 
    User, Building, AlertCircle, TrendingUp
} from 'lucide-react';

export default function ClientList() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        is_active: true,
        notes: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchClients();
    }, [searchTerm, filterStatus]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const params = { search: searchTerm };
            
            if (filterStatus === 'active') params.is_active = 1;
            if (filterStatus === 'inactive') params.is_active = 0;
            
            const response = await api.get('/clients', { params });
            setClients(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            if (editingClient) {
                await api.put(`/clients/${editingClient.id}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            
            fetchClients();
            handleCloseModal();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            console.error('Error saving client:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            email: client.email || '',
            phone: client.phone,
            address: client.address || '',
            city: client.city || '',
            state: client.state || '',
            postal_code: client.postal_code || '',
            is_active: client.is_active,
            notes: client.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this client?')) return;

        try {
            await api.delete(`/clients/${id}`);
            fetchClients();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Failed to delete client. They may have associated orders.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingClient(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            postal_code: '',
            is_active: true,
            notes: ''
        });
        setErrors({});
    };

    const filteredClients = clients;

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.is_active).length,
        inactive: clients.filter(c => !c.is_active).length,
        totalSpent: clients.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0)
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        Client Management
                    </h1>
                    <p className="text-slate-600 mt-1">Manage your customer database</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 font-semibold shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Client</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Clients</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Users size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Active Clients</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.active}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Inactive</p>
                            <p className="text-3xl font-bold text-slate-600 mt-2">{stats.inactive}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                            <AlertCircle size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">${stats.totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={28} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('active')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'active'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilterStatus('inactive')}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'inactive'
                                    ? 'bg-slate-600 text-white shadow-lg shadow-slate-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Clients List */}
            {loading && clients.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading clients...</p>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={40} className="text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No clients found</h3>
                    <p className="text-slate-500 mb-6">
                        {searchTerm ? 'Try a different search term' : 'Get started by adding your first client'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 font-medium transition-all"
                        >
                            <Plus size={18} />
                            <span>Add Client</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <div
                            key={client.id}
                            className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all group"
                        >
                            {/* Client Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{client.name}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium mt-1 ${
                                            client.is_active 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {client.is_active ? '● Active' : '○ Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-4">
                                {client.email && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Mail size={16} className="text-cyan-500 flex-shrink-0" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Phone size={16} className="text-cyan-500 flex-shrink-0" />
                                        <span>{client.phone}</span>
                                    </div>
                                )}
                                {(client.city || client.state) && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <MapPin size={16} className="text-cyan-500 flex-shrink-0" />
                                        <span className="truncate">
                                            {[client.city, client.state].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="text-xs text-slate-500">Orders</p>
                                    <p className="text-lg font-bold text-slate-800">{client.orders_count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Total Spent</p>
                                    <p className="text-lg font-bold text-cyan-600">${parseFloat(client.total_spent || 0).toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                                <Link
                                    to={`/clients/${client.id}`}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all text-center text-sm"
                                >
                                    View Details
                                </Link>
                                <button
                                    onClick={() => handleEdit(client)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(client.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                                    <User size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {editingClient ? 'Edit Client' : 'Create New Client'}
                                </h2>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Error Display */}
                            {Object.keys(errors).length > 0 && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-semibold text-red-800">Validation Errors</h3>
                                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                                {Object.entries(errors).map(([field, messages]) => (
                                                    <li key={field}>
                                                        <strong>{field}:</strong> {Array.isArray(messages) ? messages[0] : messages}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <User size={20} className="text-cyan-600" />
                                    <span>Basic Information</span>
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                            placeholder="John Doe"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.name[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                            placeholder="john@example.com"
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.email[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Phone *
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                            placeholder="+1 (555) 123-4567"
                                            required
                                        />
                                        {errors.phone && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.phone[0]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <MapPin size={20} className="text-cyan-600" />
                                    <span>Address Information</span>
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Street Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                            placeholder="123 Main Street"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                                placeholder="New York"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                                placeholder="NY"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Postal Code
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.postal_code}
                                                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                                                placeholder="10001"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <Building size={20} className="text-cyan-600" />
                                    <span>Additional Information</span>
                                </h3>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none"
                                        placeholder="Any additional notes about this client..."
                                    />
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-emerald-500 transition-all"></div>
                                            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-7"></div>
                                        </div>
                                        <div className="ml-4">
                                            <span className="text-sm font-semibold text-slate-700">Active Status</span>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {formData.is_active ? 'Client is active' : 'Client is inactive'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 font-semibold shadow-lg shadow-cyan-500/30 transition-all disabled:shadow-none flex items-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>{editingClient ? 'Update Client' : 'Create Client'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
