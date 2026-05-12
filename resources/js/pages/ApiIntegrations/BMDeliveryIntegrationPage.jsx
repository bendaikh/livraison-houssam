import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';

export default function BMDeliveryIntegrationPage() {
    const { t } = useTranslation();
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: 'BMDelivery',
        api_token: '',
        is_active: true,
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [cities, setCities] = useState([]);

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-integrations');
            const bmdeliveryIntegration = response.data.find(i => i.provider === 'bmdelivery');
            if (bmdeliveryIntegration) {
                setIntegration(bmdeliveryIntegration);
                setFormData({
                    name: bmdeliveryIntegration.name,
                    api_token: bmdeliveryIntegration.credentials?.api_token || '',
                    is_active: bmdeliveryIntegration.is_active,
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
                provider: 'bmdelivery',
                is_active: formData.is_active,
                credentials: {
                    api_token: formData.api_token,
                },
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: t('admin.apiIntegrations.bmdelivery.updatedSuccess') });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: t('admin.apiIntegrations.bmdelivery.createdSuccess') });
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

    const handleTestConnection = async () => {
        if (!integration) {
            setMessage({ type: 'error', text: t('admin.apiIntegrations.bmdelivery.saveFirst') });
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
                text: error.response?.data?.message || t('admin.apiIntegrations.bmdelivery.connectionFailed'),
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleFetchCities = async () => {
        if (!integration) return;

        try {
            const response = await api.get(`/api-integrations/${integration.id}/cities`);
            setCities(response.data.data || []);
            setMessage({ type: 'success', text: t('admin.apiIntegrations.bmdelivery.fetchSuccess', { count: response.data.data?.length || 0 }) });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || t('admin.apiIntegrations.bmdelivery.fetchFailed'),
            });
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
                name: 'BMDelivery',
                api_token: '',
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🚚</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('admin.apiIntegrations.bmdelivery.title')}</h1>
                            <p className="text-gray-600">{t('admin.apiIntegrations.bmdelivery.description')}</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active
                            ? 'bg-blue-100 text-blue-800'
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
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('admin.apiIntegrations.bmdelivery.connectionSettings')}</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('admin.apiIntegrations.integrationName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="BMDelivery"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('admin.apiIntegrations.bmdelivery.apiToken')}
                                </label>
                                <input
                                    type="password"
                                    value={formData.api_token}
                                    onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('admin.apiIntegrations.bmdelivery.apiTokenPlaceholder')}
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    {t('admin.apiIntegrations.bmdelivery.apiTokenHelp')}{' '}
                                    <a
                                        href="https://bmdelivery.ma"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        bmdelivery.ma
                                    </a>
                                    {' '}{t('admin.apiIntegrations.bmdelivery.backOffice')}
                                </p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="bmdelivery-active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="bmdelivery-active" className="ml-3 text-sm text-gray-700">
                                    {t('admin.apiIntegrations.enableIntegration')}
                                </label>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? t('admin.apiIntegrations.saving') : (integration ? t('admin.apiIntegrations.bmdelivery.updateIntegration') : t('admin.apiIntegrations.bmdelivery.connectBMDelivery'))}
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

                    {/* Features */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.bmdelivery.features')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.bmdelivery.createShipments')}</h3>
                                <p className="text-sm text-blue-700 mt-1">{t('admin.apiIntegrations.bmdelivery.createShipmentsDesc')}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.bmdelivery.trackPackages')}</h3>
                                <p className="text-sm text-blue-700 mt-1">{t('admin.apiIntegrations.bmdelivery.trackPackagesDesc')}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.bmdelivery.getCities')}</h3>
                                <p className="text-sm text-blue-700 mt-1">{t('admin.apiIntegrations.bmdelivery.getCitiesDesc')}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.bmdelivery.exchanges')}</h3>
                                <p className="text-sm text-blue-700 mt-1">{t('admin.apiIntegrations.bmdelivery.exchangesDesc')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cities List */}
                    {cities.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.bmdelivery.availableCities')} ({cities.length})</h2>
                            <div className="max-h-60 overflow-y-auto">
                                <div className="grid grid-cols-3 gap-2">
                                    {cities.map((city, index) => (
                                        <div key={index} className="px-3 py-2 bg-gray-50 rounded text-sm">
                                            {city.name || city}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Section */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.apiIntegrations.bmdelivery.quickActions')}</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleTestConnection}
                                disabled={!integration || isTesting}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTesting ? t('admin.apiIntegrations.bmdelivery.testing') : t('admin.apiIntegrations.bmdelivery.testConnection')}
                            </button>
                            <button
                                onClick={handleFetchCities}
                                disabled={!integration}
                                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('admin.apiIntegrations.bmdelivery.fetchCities')}
                            </button>
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
                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                        <h2 className="text-lg font-semibold text-blue-900 mb-3">{t('admin.apiIntegrations.needHelp')}</h2>
                        <ul className="text-sm text-blue-800 space-y-2">
                            <li>• {t('admin.apiIntegrations.bmdelivery.help1')}</li>
                            <li>• {t('admin.apiIntegrations.bmdelivery.help2')}</li>
                            <li>• {t('admin.apiIntegrations.bmdelivery.help3')}</li>
                            <li>• {t('admin.apiIntegrations.bmdelivery.help4')}</li>
                        </ul>
                        <a
                            href="https://bmdelivery.ma/doc/api-client"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-blue-700 hover:text-blue-800 font-medium"
                        >
                            {t('admin.apiIntegrations.bmdelivery.viewDocs')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
