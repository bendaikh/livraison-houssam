import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useAuth } from '../../contexts/AuthContext';

export default function ApiIntegrations() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const isVendor = user?.role?.slug === 'vendor';

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-integrations');
            setIntegrations(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching integrations:', err);
            setError(t('admin.apiIntegrations.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const getIntegrationByProvider = (provider) => {
        return integrations.find(i => i.provider === provider);
    };

    // All available integrations
    const allIntegrations = [
        {
            id: 'shopify',
            path: appPath('/api-integrations/shopify'),
            icon: '🛍️',
            title: 'Shopify',
            description: 'E-commerce Platform - Import orders and sync products',
            color: 'green',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            textColor: 'text-green-700',
            badgeColor: 'bg-green-100 text-green-800',
            vendorVisible: true, // Vendors can see this
        },
        {
            id: 'google_sheet',
            path: appPath('/api-integrations/google-sheet'),
            icon: '📊',
            title: 'Google Sheets',
            description: 'Import orders from a spreadsheet',
            color: 'emerald',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            textColor: 'text-emerald-700',
            badgeColor: 'bg-emerald-100 text-emerald-800',
            vendorVisible: true,
        },
        {
            id: 'custom_api',
            path: appPath('/api-integrations/custom-api'),
            icon: '🔌',
            title: 'Custom API',
            description: 'Connect your own platform, website, or mobile app',
            color: 'purple',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-700',
            badgeColor: 'bg-purple-100 text-purple-800',
            vendorVisible: true, // Vendors can use this
        },
        {
            id: 'tawsilex',
            path: appPath('/api-integrations/tawsilex'),
            icon: '📦',
            title: 'Tawsilex',
            description: 'Moroccan Delivery Service - Create and track shipments',
            color: 'orange',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700',
            badgeColor: 'bg-orange-100 text-orange-800',
            vendorVisible: false, // Hidden from vendors
        },
        {
            id: 'bmdelivery',
            path: appPath('/api-integrations/bmdelivery'),
            icon: '🚚',
            title: 'BMDelivery',
            description: 'Moroccan Delivery Service - Create and track shipments',
            color: 'blue',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-700',
            badgeColor: 'bg-blue-100 text-blue-800',
            vendorVisible: false, // Hidden from vendors
        },
    ];
    
    // Filter integrations based on user role
    const integrationsList = isVendor 
        ? allIntegrations.filter(item => item.vendorVisible)
        : allIntegrations;

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">{t('admin.apiIntegrations.title')}</h1>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('admin.apiIntegrations.title')}</h1>
                    <p className="mt-2 text-gray-600">
                        {t('admin.apiIntegrations.subtitle')}
                    </p>
                </div>
                <button
                    onClick={fetchIntegrations}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{t('admin.apiIntegrations.refresh')}</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrationsList.map((item) => {
                    const integration = getIntegrationByProvider(item.id);
                    
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`block bg-white rounded-xl shadow-sm border ${item.borderColor} hover:shadow-md transition-all duration-200 overflow-hidden`}
                        >
                            {/* Card Header */}
                            <div className={`${item.bgColor} px-6 py-4 border-b ${item.borderColor}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-3xl">{item.icon}</span>
                                        <h3 className={`text-xl font-bold ${item.textColor}`}>
                                            {item.title}
                                        </h3>
                                    </div>
                                    {integration && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            integration.is_active
                                                ? item.badgeColor
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {integration.is_active ? t('admin.apiIntegrations.active') : t('admin.apiIntegrations.inactive')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">
                                <p className="text-gray-600 mb-4">{item.description}</p>
                                
                                {integration ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">{t('admin.apiIntegrations.status')}</span>
                                            <span className={`font-medium ${integration.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                                {integration.is_active ? t('admin.apiIntegrations.connected') : t('admin.apiIntegrations.disabled')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">{t('admin.apiIntegrations.lastSync')}</span>
                                            <span className="font-medium text-gray-700">
                                                {integration.last_sync_at
                                                    ? new Date(integration.last_sync_at).toLocaleDateString()
                                                    : t('admin.apiIntegrations.never')}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <span className="text-gray-500 text-sm">{t('admin.apiIntegrations.notConfigured')}</span>
                                    </div>
                                )}

                                {/* Action */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <span className={`${item.textColor} font-medium text-sm flex items-center justify-center`}>
                                        {integration ? t('admin.apiIntegrations.manageIntegration') : t('admin.apiIntegrations.configure')}
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">{t('admin.apiIntegrations.quickGuide')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">1</div>
                        <div>
                            <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.selectIntegration')}</h3>
                            <p className="text-sm text-blue-700">{t('admin.apiIntegrations.clickToConfig')}</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">2</div>
                        <div>
                            <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.enterCredentials')}</h3>
                            <p className="text-sm text-blue-700">{t('admin.apiIntegrations.addApiKeys')}</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">3</div>
                        <div>
                            <h3 className="font-medium text-blue-900">{t('admin.apiIntegrations.testConnect')}</h3>
                            <p className="text-sm text-blue-700">{t('admin.apiIntegrations.verifyStartSync')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
