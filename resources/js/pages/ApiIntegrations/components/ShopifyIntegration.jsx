import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';

export default function ShopifyIntegration({ integration, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Shopify Store',
        shop_url: '',
        access_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (integration) {
            setFormData({
                name: integration.name,
                shop_url: integration.credentials?.shop_url || '',
                access_token: integration.credentials?.access_token || '',
                is_active: integration.is_active,
            });
        }
    }, [integration]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

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

            setIsEditing(false);
            onUpdate();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to save integration',
            });
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
            onUpdate();
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
            onUpdate();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to delete integration',
            });
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.337 2.783c-.084-.037-.156-.037-.24 0L12 3.896 8.903 2.783c-.084-.037-.156-.037-.24 0L5.566 4.116c-.084.037-.156.111-.192.203L3.277 9.785c-.036.092-.036.203 0 .295l2.097 5.466c.036.092.108.166.192.203l3.097 1.333c.084.037.156.037.24 0L12 16.104l3.097 1.113c.084.037.156.037.24 0l3.097-1.333c.084-.037.156-.111.192-.203l2.097-5.466c.036-.092.036-.203 0-.295l-2.097-5.466c-.036-.092-.108-.166-.192-.203l-3.097-1.333z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Shopify</h2>
                            <p className="text-green-100 text-sm">E-commerce Platform Integration</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {integration && (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                integration.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {integration.is_active ? 'Active' : 'Inactive'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {message.text && (
                    <div className={`mb-4 px-4 py-3 rounded-lg ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message.text}
                    </div>
                )}

                {!integration || isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Integration Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="https://your-store.myshopify.com"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Get this from your Shopify Admin → Settings → Apps and sales channels → Develop apps
                            </p>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="shopify-active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor="shopify-active" className="ml-2 text-sm text-gray-700">
                                Enable this integration
                            </label>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                {integration ? 'Update Integration' : 'Connect Shopify'}
                            </button>
                            {integration && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Shop URL</p>
                                <p className="font-medium text-gray-900">{integration.credentials?.shop_url}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Last Sync</p>
                                <p className="font-medium text-gray-900">
                                    {integration.last_sync_at
                                        ? new Date(integration.last_sync_at).toLocaleString()
                                        : 'Never'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {isSyncing ? 'Syncing...' : 'Sync Orders'}
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
