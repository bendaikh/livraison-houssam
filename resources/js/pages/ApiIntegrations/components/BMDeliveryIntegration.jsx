import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';

export default function BMDeliveryIntegration({ integration, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [formData, setFormData] = useState({
        name: 'BMDelivery',
        api_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (integration) {
            setFormData({
                name: integration.name,
                api_token: integration.credentials?.api_token || '',
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
                type: 'delivery',
                provider: 'bmdelivery',
                is_active: formData.is_active,
                credentials: {
                    api_token: formData.api_token,
                },
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: 'BMDelivery integration updated successfully!' });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: 'BMDelivery integration created successfully!' });
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">BMDelivery</h2>
                            <p className="text-blue-100 text-sm">Moroccan Delivery Service</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {integration && (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                integration.is_active
                                    ? 'bg-blue-100 text-blue-800'
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="BMDelivery"
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Your BMDelivery API Token"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Get your API token from{' '}
                                <a
                                    href="https://bmdelivery.ma"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    bmdelivery.ma
                                </a>
                                {' '}back-office
                            </p>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="bmdelivery-active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="bmdelivery-active" className="ml-2 text-sm text-gray-700">
                                Enable this integration
                            </label>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">Features:</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Create shipments from orders</li>
                                <li>• Track shipments in real-time</li>
                                <li>• Get available cities</li>
                                <li>• Support for exchanges</li>
                            </ul>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {integration ? 'Update Integration' : 'Connect BMDelivery'}
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
                                <p className="text-sm text-gray-500">API Token</p>
                                <p className="font-medium text-gray-900">••••••••••••••••</p>
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
                            <a
                                href="https://bmdelivery.ma/doc/api-client"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                API Docs
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
