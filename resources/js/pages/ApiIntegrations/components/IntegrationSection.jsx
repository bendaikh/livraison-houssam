import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';

export default function IntegrationSection({ section, isExpanded, onToggle, onUpdate, isLast }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [formData, setFormData] = useState({
        name: section.title,
        shop_url: '',
        access_token: '',
        api_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (section.integration) {
            setFormData({
                name: section.integration.name,
                shop_url: section.integration.credentials?.shop_url || '',
                access_token: section.integration.credentials?.access_token || '',
                api_token: section.integration.credentials?.api_token || '',
                is_active: section.integration.is_active,
            });
        }
    }, [section.integration]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            const credentials = section.id === 'shopify'
                ? { shop_url: formData.shop_url, access_token: formData.access_token }
                : { api_token: formData.api_token };

            const payload = {
                name: formData.name,
                type: section.type,
                provider: section.id,
                is_active: formData.is_active,
                credentials,
            };

            if (section.integration) {
                await api.put(`/api-integrations/${section.integration.id}`, payload);
                setMessage({ type: 'success', text: `${section.title} updated successfully!` });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: `${section.title} created successfully!` });
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
        if (!section.integration) {
            setMessage({ type: 'error', text: 'Please save the integration first' });
            return;
        }

        setIsTesting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post(`/api-integrations/${section.integration.id}/test-connection`);
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
        if (!section.integration) return;

        setIsSyncing(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post(`/api-integrations/${section.integration.id}/sync`);
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
        if (!section.integration) return;
        if (!confirm(`Are you sure you want to delete ${section.title}?`)) return;

        try {
            await api.delete(`/api-integrations/${section.integration.id}`);
            setMessage({ type: 'success', text: 'Integration deleted successfully' });
            onUpdate();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to delete integration',
            });
        }
    };

    const colorClasses = {
        green: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            hover: 'hover:bg-green-100',
            button: 'bg-green-600 hover:bg-green-700',
            badge: 'bg-green-100 text-green-800',
        },
        orange: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            text: 'text-orange-700',
            hover: 'hover:bg-orange-100',
            button: 'bg-orange-600 hover:bg-orange-700',
            badge: 'bg-orange-100 text-orange-800',
        },
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            hover: 'hover:bg-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700',
            badge: 'bg-blue-100 text-blue-800',
        },
    };

    const colors = colorClasses[section.color];

    return (
        <div className={!isLast ? 'border-b border-gray-200' : ''}>
            {/* Section Header - Always Visible */}
            <button
                onClick={onToggle}
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                    isExpanded ? colors.bg : 'hover:bg-gray-50'
                }`}
            >
                <div className="flex items-center space-x-4">
                    <span className="text-3xl">{section.icon}</span>
                    <div className="text-left">
                        <h3 className={`text-lg font-semibold ${colors.text}`}>
                            {section.title}
                        </h3>
                        <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {section.integration && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            section.integration.is_active
                                ? colors.badge
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            {section.integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                    )}
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Section Content - Expandable */}
            {isExpanded && (
                <div className="px-6 py-6 bg-gray-50">
                    {message.text && (
                        <div className={`mb-4 px-4 py-3 rounded-lg ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {!section.integration || isEditing ? (
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
                                    placeholder={section.title}
                                    required
                                />
                            </div>

                            {section.id === 'shopify' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Shop URL
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.shop_url}
                                            onChange={(e) => setFormData({ ...formData, shop_url: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="https://your-store.myshopify.com"
                                            required
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            Your Shopify store URL
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                                            required
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            Get this from Shopify Admin → Settings → Apps
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        API Token
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.api_token}
                                        onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Your API Token"
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Get your API token from{' '}
                                        <a
                                            href={section.id === 'tawsilex' ? 'https://tawsilex.com' : 'https://bmdelivery.ma'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={colors.text}
                                        >
                                            {section.id === 'tawsilex' ? 'tawsilex.com' : 'bmdelivery.ma'}
                                        </a>
                                        {' '}back-office
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`${section.id}-active`}
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`${section.id}-active`} className="ml-2 text-sm text-gray-700">
                                    Enable this integration
                                </label>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    className={`px-6 py-2 text-white rounded-lg transition-colors ${colors.button}`}
                                >
                                    {section.integration ? 'Update Integration' : 'Connect'}
                                </button>
                                {section.integration && (
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
                                {section.id === 'shopify' ? (
                                    <div>
                                        <p className="text-sm text-gray-500">Shop URL</p>
                                        <p className="font-medium text-gray-900">{section.integration.credentials?.shop_url}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-500">API Token</p>
                                        <p className="font-medium text-gray-900">••••••••••••••••</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-gray-500">Last Sync</p>
                                    <p className="font-medium text-gray-900">
                                        {section.integration.last_sync_at
                                            ? new Date(section.integration.last_sync_at).toLocaleString()
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
                                {section.id === 'shopify' && (
                                    <button
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${colors.button}`}
                                    >
                                        {isSyncing ? 'Syncing...' : 'Sync Orders'}
                                    </button>
                                )}
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
                                {section.type === 'delivery' && (
                                    <a
                                        href={section.id === 'tawsilex' ? 'https://tawsilex.com/doc/api-client' : 'https://bmdelivery.ma/doc/api-client'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        API Docs
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
