import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';

export default function ShopifyIntegrationPage() {
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Shopify Store',
        shop_name: '',
        webhook_secret: '',
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
                    shop_name: shopifyIntegration.credentials?.shop_name || '',
                    webhook_secret: shopifyIntegration.credentials?.webhook_secret || '',
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
                    shop_name: formData.shop_name,
                    webhook_secret: formData.webhook_secret,
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

    const handleDelete = async () => {
        if (!integration) return;
        if (!confirm('Are you sure you want to delete this integration?')) return;

        try {
            await api.delete(`/api-integrations/${integration.id}`);
            setMessage({ type: 'success', text: 'Integration deleted successfully' });
            setIntegration(null);
            setFormData({
                name: 'Shopify Store',
                shop_name: '',
                webhook_secret: '',
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
                    <Link to={appPath('/api-integrations')} className="text-gray-500 hover:text-gray-700">
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
                    <Link to={appPath('/api-integrations')} className="text-gray-500 hover:text-gray-700">
                        ← Back
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🛍️</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Shopify Integration</h1>
                            <p className="text-gray-600">E-commerce Platform - Receive orders automatically via webhooks</p>
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
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Webhook Settings</h2>
                        
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
                                    Shop Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.shop_name}
                                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="your-store"
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Your Shopify store name (e.g., your-store from your-store.myshopify.com)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Webhook Secret
                                </label>
                                <input
                                    type="password"
                                    value={formData.webhook_secret}
                                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter your webhook secret"
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Get this from your Shopify Admin → Settings → Notifications → Webhooks
                                </p>
                            </div>

                            {/* Display webhook URL */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-blue-900 mb-2">
                                    Your Webhook URL
                                </label>
                                <div className="flex items-center space-x-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-300 text-sm text-gray-800 break-all">
                                        {window.location.origin}/api/webhooks/shopify/orders/create
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/shopify/orders/create`);
                                            setMessage({ type: 'success', text: 'Webhook URL copied to clipboard!' });
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-blue-700">
                                    Use this URL when creating the webhook in Shopify. Subscribe to "Order creation" events.
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
                    {/* Webhook Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">1.</span>
                                <p>Copy your webhook URL from the form</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">2.</span>
                                <p>Go to Shopify Admin → Settings → Notifications → Webhooks</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">3.</span>
                                <p>Create a new webhook for "Order creation" events</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">4.</span>
                                <p>Paste the webhook URL and save</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">5.</span>
                                <p>Copy the webhook secret from Shopify and paste it in the form above</p>
                            </div>
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
                            <li>• No API token needed - webhooks only!</li>
                            <li>• Orders are automatically pushed by Shopify</li>
                            <li>• Webhook secret verifies authenticity</li>
                            <li>• Real-time order synchronization</li>
                            <li>• Secure and reliable integration</li>
                        </ul>
                        <a
                            href="https://shopify.dev/docs/api/admin-rest/latest/resources/webhook"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-green-700 hover:text-green-800 font-medium"
                        >
                            View Shopify Webhook Docs →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
