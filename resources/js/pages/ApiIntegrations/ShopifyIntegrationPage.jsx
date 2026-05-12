import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';

export default function ShopifyIntegrationPage() {
    const { t } = useTranslation();
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
                setMessage({ type: 'success', text: t('admin.apiIntegrations.shopify.updatedSuccess') });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: t('admin.apiIntegrations.shopify.createdSuccess') });
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

    const handleDelete = async () => {
        if (!integration) return;
        if (!confirm(t('admin.apiIntegrations.deleteConfirm'))) return;

        try {
            await api.delete(`/api-integrations/${integration.id}`);
            setMessage({ type: 'success', text: t('admin.apiIntegrations.deleteSuccess') });
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
                text: error.response?.data?.message || t('admin.apiIntegrations.deleteFailed'),
            });
        }
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
                        {t('admin.apiIntegrations.back')}
                    </Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🛍️</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('admin.apiIntegrations.shopify.title')}</h1>
                            <p className="text-gray-600">{t('admin.apiIntegrations.shopify.description')}</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                        {integration.is_active ? t('admin.apiIntegrations.active') : t('admin.apiIntegrations.inactive')}
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
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('admin.apiIntegrations.shopify.webhookSettings')}</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('admin.apiIntegrations.integrationName')}
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
                                    {t('admin.apiIntegrations.shopify.shopName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.shop_name}
                                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder={t('admin.apiIntegrations.shopify.shopNamePlaceholder')}
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    {t('admin.apiIntegrations.shopify.shopNameHelp')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('admin.apiIntegrations.shopify.webhookSecret')}
                                </label>
                                <input
                                    type="password"
                                    value={formData.webhook_secret}
                                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder={t('admin.apiIntegrations.shopify.webhookSecretPlaceholder')}
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    {t('admin.apiIntegrations.shopify.webhookSecretHelp')}
                                </p>
                            </div>

                            {/* Display webhook URL */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-blue-900 mb-2">
                                    {t('admin.apiIntegrations.shopify.yourWebhookUrl')}
                                </label>
                                <div className="flex items-center space-x-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-300 text-sm text-gray-800 break-all">
                                        {window.location.origin}/api/webhooks/shopify/orders/create
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/shopify/orders/create`);
                                            setMessage({ type: 'success', text: t('admin.apiIntegrations.shopify.webhookUrlCopied') });
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                    >
                                        {t('admin.apiIntegrations.shopify.copy')}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-blue-700">
                                    {t('admin.apiIntegrations.shopify.webhookUrlHelp')}
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
                                    {t('admin.apiIntegrations.enableIntegration')}
                                </label>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? t('admin.apiIntegrations.saving') : (integration ? t('admin.apiIntegrations.shopify.updateIntegration') : t('admin.apiIntegrations.shopify.connectShopify'))}
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
                </div>

                {/* Actions Section */}
                <div className="space-y-6">
                    {/* Webhook Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.howItWorks')}</h2>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">1.</span>
                                <p>{t('admin.apiIntegrations.shopify.step1')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">2.</span>
                                <p>{t('admin.apiIntegrations.shopify.step2')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">3.</span>
                                <p>{t('admin.apiIntegrations.shopify.step3')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">4.</span>
                                <p>{t('admin.apiIntegrations.shopify.step4')}</p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-600 font-bold mt-0.5">5.</span>
                                <p>{t('admin.apiIntegrations.shopify.step5')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    {integration && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.status').replace(':', '')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">{t('admin.apiIntegrations.lastSync').replace(':', '')}</p>
                                    <p className="font-medium text-gray-900">
                                        {integration.last_sync_at
                                            ? new Date(integration.last_sync_at).toLocaleString()
                                            : t('admin.apiIntegrations.never')}
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
                    <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                        <h2 className="text-lg font-semibold text-green-900 mb-3">{t('admin.apiIntegrations.needHelp')}</h2>
                        <ul className="text-sm text-green-800 space-y-2">
                            <li>• {t('admin.apiIntegrations.shopify.help1')}</li>
                            <li>• {t('admin.apiIntegrations.shopify.help2')}</li>
                            <li>• {t('admin.apiIntegrations.shopify.help3')}</li>
                            <li>• {t('admin.apiIntegrations.shopify.help4')}</li>
                            <li>• {t('admin.apiIntegrations.shopify.help5')}</li>
                        </ul>
                        <a
                            href="https://shopify.dev/docs/api/admin-rest/latest/resources/webhook"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-green-700 hover:text-green-800 font-medium"
                        >
                            {t('admin.apiIntegrations.shopify.viewDocs')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
