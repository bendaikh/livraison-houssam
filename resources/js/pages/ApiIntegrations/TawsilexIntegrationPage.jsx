import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function TawsilexIntegrationPage() {
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingStatuses, setIsFetchingStatuses] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Tawsilex',
        api_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [statuses, setStatuses] = useState([]);

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-integrations');
            const tawsilexIntegration = response.data.find(i => i.provider === 'tawsilex');
            if (tawsilexIntegration) {
                setIntegration(tawsilexIntegration);
                setFormData({
                    name: tawsilexIntegration.name,
                    api_token: tawsilexIntegration.credentials?.api_token || '',
                    is_active: tawsilexIntegration.is_active,
                });
            }
        } catch (error) {
            console.error('Error fetching integration:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setIsSaving(true);

        try {
            const payload = {
                name: formData.name,
                type: 'delivery',
                provider: 'tawsilex',
                is_active: formData.is_active,
                credentials: {
                    api_token: formData.api_token,
                },
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: 'Tawsilex integration updated successfully!' });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: 'Tawsilex integration created successfully!' });
            }

            fetchIntegration();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to save integration',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!integration) {
            setMessage({ type: 'error', text: 'Please save the integration first' });
            return;
        }

        setIsTesting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post(`/api-integrations/${integration.id}/test-connection`);
            setMessage({
                type: response.data.success ? 'success' : 'error',
                text: response.data.message,
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Connection test failed',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleFetchStatuses = async () => {
        if (!integration) return;

        setIsFetchingStatuses(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.get(`/api-integrations/${integration.id}/statuses`);
            
            console.log('Raw Response:', response.data);
            
            // The API returns {message: "...", data: {...}}
            // And inside data is {data: [...]} from Tawsilex
            // So we need response.data.data.data OR response.data.data if it's an array
            let statusesData = [];
            
            if (Array.isArray(response.data.data)) {
                // If data.data is already an array, use it
                statusesData = response.data.data;
            } else if (response.data.data?.data && Array.isArray(response.data.data.data)) {
                // If data.data has a nested data property, use that
                statusesData = response.data.data.data;
            }
            
            console.log('Parsed Statuses:', statusesData);
            console.log('Count:', statusesData.length);
            
            setStatuses(statusesData);
            setMessage({
                type: 'success',
                text: `Successfully fetched ${statusesData.length || 0} statuses!`,
            });
        } catch (error) {
            console.error('Fetch statuses error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to fetch statuses',
            });
        } finally {
            setIsFetchingStatuses(false);
        }
    };

    const handleDelete = async () => {
        if (!integration) return;
        if (!confirm('Are you sure you want to delete this integration?')) return;

        try {
            await api.delete(`/api-integrations/${integration.id}`);
            setMessage({ type: 'success', text: 'Integration deleted successfully' });
            setIntegration(null);
            setFormData({
                name: 'Tawsilex',
                api_token: '',
                is_active: true,
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to delete integration',
            });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Link to="/api-integrations" className="text-gray-500 hover:text-gray-700">
                        ← Back to Integrations
                    </Link>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/api-integrations" className="text-gray-500 hover:text-gray-700">
                        ← Back
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📦</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tawsilex Integration</h1>
                            <p className="text-gray-600">Moroccan Delivery Service - Create and track shipments</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                        {integration.is_active ? 'Active' : 'Inactive'}
                    </span>
                )}
            </div>

            {/* Message */}
            {message.text && (
                <div className={`px-4 py-3 rounded-lg ${
                    message.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Connection Settings</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Integration Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Tawsilex"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Token
                                </label>
                                <input
                                    type="password"
                                    value={formData.api_token}
                                    onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Your Tawsilex API Token"
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Get your API token from{' '}
                                    <a
                                        href="https://tawsilex.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        tawsilex.com
                                    </a>
                                    {' '}back-office
                                </p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="tawsilex-active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                />
                                <label htmlFor="tawsilex-active" className="ml-3 text-sm text-gray-700">
                                    Enable this integration
                                </label>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : (integration ? 'Update Integration' : 'Connect Tawsilex')}
                                </button>
                                {integration && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Features */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <h3 className="font-medium text-orange-900">Create Shipments</h3>
                                <p className="text-sm text-orange-700 mt-1">Create delivery shipments from your orders</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <h3 className="font-medium text-orange-900">Track Packages</h3>
                                <p className="text-sm text-orange-700 mt-1">Real-time tracking for all shipments</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <h3 className="font-medium text-orange-900">Get Statuses</h3>
                                <p className="text-sm text-orange-700 mt-1">View all available delivery statuses</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <h3 className="font-medium text-orange-900">Exchanges</h3>
                                <p className="text-sm text-orange-700 mt-1">Support for package exchanges</p>
                            </div>
                        </div>
                    </div>

                    {/* Statuses Display */}
                    {Array.isArray(statuses) && statuses.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Available Statuses ({statuses.length})
                            </h2>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {statuses.map((status, index) => (
                                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="font-medium text-gray-900">
                                            {typeof status === 'object' ? (status.name || status.title || `Status ${status.id}`) : status}
                                        </p>
                                        {typeof status === 'object' && status.description && (
                                            <p className="text-sm text-gray-600 mt-1">{status.description}</p>
                                        )}
                                        {typeof status === 'object' && status.id && (
                                            <p className="text-xs text-gray-500 mt-1">ID: {status.id}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Section */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleTestConnection}
                                disabled={!integration || isTesting}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                                onClick={handleFetchStatuses}
                                disabled={!integration || isFetchingStatuses}
                                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFetchingStatuses ? 'Fetching...' : 'Fetch Statuses'}
                            </button>
                        </div>
                    </div>

                    {/* Status */}
                    {integration && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">Last Sync</p>
                                    <p className="font-medium text-gray-900">
                                        {integration.last_sync_at
                                            ? new Date(integration.last_sync_at).toLocaleString()
                                            : 'Never'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Created</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(integration.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Help */}
                    <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
                        <h2 className="text-lg font-semibold text-orange-900 mb-3">Need Help?</h2>
                        <ul className="text-sm text-orange-800 space-y-2">
                            <li>• Login to tawsilex.com</li>
                            <li>• Go to back-office</li>
                            <li>• Find your API token</li>
                            <li>• Copy and paste here</li>
                        </ul>
                        <a
                            href="https://tawsilex.com/doc/api-client"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-orange-700 hover:text-orange-800 font-medium"
                        >
                            View Tawsilex API Docs →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
