import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { Copy, Key, RefreshCw, Eye, EyeOff, Code, BookOpen } from 'lucide-react';

export default function CustomApiIntegrationPage() {
    const { t } = useTranslation();
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Custom API Integration',
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
            const customApiIntegration = response.data.find(i => i.provider === 'custom_api');
            if (customApiIntegration) {
                setIntegration(customApiIntegration);
                setFormData({
                    name: customApiIntegration.name,
                    is_active: customApiIntegration.is_active,
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
                type: 'custom_api',
                provider: 'custom_api',
                is_active: formData.is_active,
                credentials: integration?.credentials || {},
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: t('admin.apiIntegrations.customApi.updatedSuccess') });
            } else {
                const response = await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: t('admin.apiIntegrations.customApi.createdSuccess') });
                setIntegration(response.data);
            }

            fetchIntegration();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || t('admin.apiIntegrations.saveFailed'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateApiKey = async () => {
        setMessage({ type: '', text: '' });
        setIsGeneratingKey(true);

        try {
            const response = await api.post('/api-integrations/custom-api/generate-key', {
                integration_id: integration?.id,
            });

            setIntegration(response.data);
            setMessage({ type: 'success', text: t('admin.apiIntegrations.customApi.apiKeyGenerated') });
            setShowApiKey(true);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || t('admin.apiIntegrations.customApi.apiKeyGenerateFailed'),
            });
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: `${label} copied to clipboard!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleDelete = async () => {
        if (!integration) return;
        if (!confirm(t('admin.apiIntegrations.customApi.deleteConfirm'))) return;

        try {
            await api.delete(`/api-integrations/${integration.id}`);
            setMessage({ type: 'success', text: t('admin.apiIntegrations.deleteSuccess') });
            setIntegration(null);
            setFormData({
                name: 'Custom API Integration',
                is_active: true,
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || t('admin.apiIntegrations.deleteFailed'),
            });
        }
    };

    const apiEndpoints = [
        {
            method: 'POST',
            path: '/api/orders',
            description: 'Create a new order',
            color: 'green',
        },
        {
            method: 'GET',
            path: '/api/orders',
            description: 'Get all orders',
            color: 'blue',
        },
        {
            method: 'GET',
            path: '/api/orders/{id}',
            description: 'Get specific order details',
            color: 'blue',
        },
        {
            method: 'PATCH',
            path: '/api/orders/{id}/status',
            description: 'Update order status',
            color: 'yellow',
        },
        {
            method: 'GET',
            path: '/api/products',
            description: 'Get all products',
            color: 'blue',
        },
        {
            method: 'GET',
            path: '/api/products/{id}',
            description: 'Get specific product details',
            color: 'blue',
        },
    ];

    const getMethodColor = (color) => {
        const colors = {
            green: 'bg-green-100 text-green-700 border-green-300',
            blue: 'bg-blue-100 text-blue-700 border-blue-300',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            red: 'bg-red-100 text-red-700 border-red-300',
        };
        return colors[color] || colors.blue;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Link to={appPath('/api-integrations')} className="text-gray-500 hover:text-gray-700">
                        {t('admin.apiIntegrations.backToIntegrations')}
                    </Link>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
                        {t('admin.apiIntegrations.back')}
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Code className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('admin.apiIntegrations.customApi.title')}</h1>
                            <p className="text-gray-600">{t('admin.apiIntegrations.customApi.description')}</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                        {integration.is_active ? t('admin.apiIntegrations.active') : t('admin.apiIntegrations.inactive')}
                    </span>
                )}
            </div>

            {/* Message */}
            {message.text && (
                <div className={`px-4 py-3 rounded-lg flex items-center justify-between ${
                    message.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    <span>{message.text}</span>
                    <button
                        onClick={() => setMessage({ type: '', text: '' })}
                        className="text-sm font-medium underline"
                    >
                        {t('admin.apiIntegrations.customApi.dismiss')}
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('admin.apiIntegrations.customApi.integrationSettings')}</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('admin.apiIntegrations.integrationName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder={t('admin.apiIntegrations.customApi.placeholder')}
                                    required
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="custom-api-active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="custom-api-active" className="ml-3 text-sm text-gray-700">
                                    {t('admin.apiIntegrations.enableIntegration')}
                                </label>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? t('admin.apiIntegrations.saving') : (integration ? t('admin.apiIntegrations.customApi.updateIntegration') : t('admin.apiIntegrations.customApi.createIntegration'))}
                                </button>
                                {integration && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        {t('admin.apiIntegrations.delete')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* API Key Section */}
                    {integration && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">{t('admin.apiIntegrations.customApi.apiAuthentication')}</h2>
                                <button
                                    onClick={handleGenerateApiKey}
                                    disabled={isGeneratingKey}
                                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={isGeneratingKey ? 'animate-spin' : ''} />
                                    <span>{integration.credentials?.api_key ? t('admin.apiIntegrations.customApi.regenerate') : t('admin.apiIntegrations.customApi.generate')} {t('admin.apiIntegrations.customApi.apiKey')}</span>
                                </button>
                            </div>

                            {integration.credentials?.api_key ? (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-purple-900">
                                                {t('admin.apiIntegrations.customApi.yourApiKey')}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <code className="flex-1 bg-white px-3 py-2 rounded border border-purple-300 text-sm text-gray-800 break-all font-mono">
                                                {showApiKey ? integration.credentials.api_key : '••••••••••••••••••••••••••••••••'}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(integration.credentials.api_key, 'API key')}
                                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                title="Copy API key"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-purple-700">
                                            {t('admin.apiIntegrations.customApi.keepSecure')}
                                        </p>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-blue-900 mb-2">
                                            {t('admin.apiIntegrations.customApi.baseApiUrl')}
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-300 text-sm text-gray-800 break-all">
                                                {window.location.origin}/api
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(`${window.location.origin}/api`, 'Base URL')}
                                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                title="Copy base URL"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-900 mb-3">{t('admin.apiIntegrations.customApi.authHeader')}</h3>
                                        <p className="text-sm text-gray-600 mb-2">{t('admin.apiIntegrations.customApi.authHeaderHelp')}</p>
                                        <code className="block bg-gray-800 text-green-400 px-4 py-3 rounded text-sm font-mono overflow-x-auto">
                                            Authorization: Bearer {showApiKey ? integration.credentials.api_key : 'YOUR_API_KEY'}
                                        </code>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Key className="mx-auto text-gray-400 mb-4" size={48} />
                                    <p className="text-gray-600 mb-4">{t('admin.apiIntegrations.customApi.noApiKey')}</p>
                                    <p className="text-sm text-gray-500">{t('admin.apiIntegrations.customApi.noApiKeyHelp')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* API Endpoints Documentation */}
                    {integration && integration.credentials?.api_key && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center space-x-2 mb-6">
                                <BookOpen className="text-purple-600" size={20} />
                                <h2 className="text-lg font-semibold text-gray-900">{t('admin.apiIntegrations.customApi.availableEndpoints')}</h2>
                            </div>
                            <div className="space-y-3">
                                {apiEndpoints.map((endpoint, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className={`px-2 py-1 text-xs font-bold rounded border ${getMethodColor(endpoint.color)}`}>
                                            {endpoint.method}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                                            <p className="text-xs text-gray-600 mt-1">{endpoint.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900 font-medium mb-2">{t('admin.apiIntegrations.customApi.needDocs')}</p>
                                <p className="text-sm text-blue-700">
                                    {t('admin.apiIntegrations.customApi.contactAdmin')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                    {/* How it works */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.howItWorks')}</h2>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start space-x-2">
                                <span className="text-purple-600 font-bold mt-0.5">1.</span>
                                <p>{t('admin.apiIntegrations.customApi.step1')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-purple-600 font-bold mt-0.5">2.</span>
                                <p>{t('admin.apiIntegrations.customApi.step2')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-purple-600 font-bold mt-0.5">3.</span>
                                <p>{t('admin.apiIntegrations.customApi.step3')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-purple-600 font-bold mt-0.5">4.</span>
                                <p>{t('admin.apiIntegrations.customApi.step4')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-purple-600 font-bold mt-0.5">5.</span>
                                <p>{t('admin.apiIntegrations.customApi.step5')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    {integration && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.status').replace(':', '')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin.apiIntegrations.customApi.apiKeyStatus')}</p>
                                    <p className="font-medium text-gray-900">
                                        {integration.credentials?.api_key ? (
                                            <span className="text-green-600">{t('admin.apiIntegrations.active')}</span>
                                        ) : (
                                            <span className="text-gray-500">{t('admin.apiIntegrations.customApi.notGenerated')}</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin.apiIntegrations.customApi.lastUpdated')}</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(integration.updated_at).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin.apiIntegrations.created')}</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(integration.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Help */}
                    <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
                        <h2 className="text-lg font-semibold text-purple-900 mb-3">{t('admin.apiIntegrations.customApi.useCases')}</h2>
                        <ul className="text-sm text-purple-800 space-y-2">
                            <li>• {t('admin.apiIntegrations.customApi.useCase1')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.useCase2')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.useCase3')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.useCase4')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.useCase5')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.useCase6')}</li>
                        </ul>
                    </div>

                    {/* Security Notice */}
                    <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                        <h2 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ {t('admin.apiIntegrations.customApi.securityNotice')}</h2>
                        <ul className="text-sm text-yellow-800 space-y-2">
                            <li>• {t('admin.apiIntegrations.customApi.security1')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.security2')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.security3')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.security4')}</li>
                            <li>• {t('admin.apiIntegrations.customApi.security5')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
