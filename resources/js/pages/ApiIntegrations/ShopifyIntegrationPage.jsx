import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function ShopifyIntegrationPage() {
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Shopify Store',
        shop_url: '',
        access_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-integrations');
            const shopifyIntegration = response.data.find(i => i.provider === 'shopify');
            if (shopifyIntegration) {
                setIntegration(shopifyIntegration);
                setFormData({
                    name: shopifyIntegration.name,
                    shop_url: shopifyIntegration.credentials?.shop_url || '',
                    access_token: shopifyIntegration.credentials?.access_token || '',
                    is_active: shopifyIntegration.is_active,
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
                type: 'shopify',
                provider: 'shopify',
                is_active: formData.is_active,
                credentials: {
                    shop_url: formData.shop_url,
                    access_token: formData.access_token,
                },
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: 'Shopify integration updated successfully!' });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: 'Shopify integration created successfully!' });
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

    const handleSync = async () => {
        if (!integration) return;

        setIsSyncing(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post(`/api-integrations/${integration.id}/sync`);
            setMessage({
                type: 'success',
                text: response.data.message || 'Sync completed successfully',
            });
            fetchIntegration();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Sync failed',
            });
        } finally {
            setIsSyncing(false);
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
                name: 'Shopify Store',
                shop_url: '',
                access_token: '',
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🛍️</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Shopify Integration</h1>
                            <p className="text-gray-600">E-commerce Platform - Import orders and sync products</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active
                            ? 'bg-green-100 text-green-800'
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="My Shopify Store"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Shop URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.shop_url}
                                    onChange={(e) => setFormData({ ...formData, shop_url: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="https://your-store.myshopify.com"
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Your Shopify store URL (e.g., https://your-store.myshopify.com)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin API Access Token
                                </label>
                                <input
                                    type="password"
                                    value={formData.access_token}
                                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Get this from your Shopify Admin → Settings → Apps and sales channels → Develop apps
                                </p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="shopify-active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <label htmlFor="shopify-active" className="ml-3 text-sm text-gray-700">
                                    Enable this integration
                                </label>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : (integration ? 'Update Integration' : 'Connect Shopify')}
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
                                onClick={handleSync}
                                disabled={!integration || isSyncing}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSyncing ? 'Syncing...' : 'Sync Orders'}
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
                    <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                        <h2 className="text-lg font-semibold text-green-900 mb-3">Need Help?</h2>
                        <ul className="text-sm text-green-800 space-y-2">
                            <li>• Go to your Shopify Admin</li>
                            <li>• Navigate to Settings → Apps</li>
                            <li>• Click "Develop apps"</li>
                            <li>• Create a custom app</li>
                            <li>• Get the Admin API access token</li>
                        </ul>
                        <a
                            href="https://shopify.dev/docs/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-green-700 hover:text-green-800 font-medium"
                        >
                            View Shopify API Docs →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
