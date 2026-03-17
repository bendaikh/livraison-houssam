import React, { useState, useEffect } from 'react';
import { 
    Save, Building2, Globe, DollarSign, ShoppingCart, 
    Bell, Percent, AlertCircle, CheckCircle2, Loader2,
    Settings as SettingsIcon, Mail, Phone, MapPin, FileText, MapPinned, Plus, Trash2, Edit2, RefreshCw, Search
} from 'lucide-react';
import api from '../../utils/api';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    
    // Cities management state
    const [cities, setCities] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [syncingCities, setSyncingCities] = useState(false);
    const [editingCity, setEditingCity] = useState(null);
    const [cityForm, setCityForm] = useState({ name: '', delivery_cost: '', is_active: true });
    const [showCityModal, setShowCityModal] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const normalizedCitySearch = citySearch.trim().toLowerCase();
    const filteredCities = normalizedCitySearch
        ? cities.filter((city) => city.name.toLowerCase().includes(normalizedCitySearch))
        : cities;
    
    const [settings, setSettings] = useState({
        // General Settings
        app_name: '',
        app_description: '',
        app_timezone: 'Africa/Casablanca',
        app_language: 'en',
        
        // Currency Settings
        currency_code: 'MAD',
        currency_symbol: 'DH',
        currency_position: 'after',
        currency_decimals: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
        
        // Company Settings
        company_name: '',
        company_email: '',
        company_phone: '',
        company_address: '',
        company_tax_number: '',
        company_registration_number: '',
        
        // Order Settings
        order_prefix: 'ORD-',
        order_auto_confirm: false,
        order_low_stock_warning: true,
        order_low_stock_threshold: 10,
        order_fulfillment_cost: 10,
        
        // Notification Settings
        notifications_enabled: true,
        notifications_email: true,
        notifications_sms: false,
        notifications_low_stock: true,
        notifications_new_order: true,
        
        // Commission Settings
        commission_enabled: true,
        commission_type: 'percentage',
        commission_value: 10,
    });

    useEffect(() => {
        fetchSettings();
        fetchCities({ syncSources: true });
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/settings');
            setSettings(prevSettings => ({ ...prevSettings, ...response.data }));
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const fetchCities = async ({ syncSources = false } = {}) => {
        try {
            setLoadingCities(true);

            if (syncSources) {
                try {
                    await api.post('/cities/sync-sources');
                } catch (syncError) {
                    console.error('Initial cities sync warning:', syncError);
                }
            }

            const response = await api.get('/cities');
            setCities(response.data);
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setLoadingCities(false);
        }
    };

    const handleCitySubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);

            const payload = {
                ...cityForm,
                delivery_cost: cityForm.delivery_cost === '' ? null : parseFloat(cityForm.delivery_cost),
            };

            if (editingCity) {
                await api.put(`/cities/${editingCity.id}`, payload);
                setMessage({ type: 'success', text: 'City updated successfully!' });
            } else {
                await api.post('/cities', payload);
                setMessage({ type: 'success', text: 'City added successfully!' });
            }
            setShowCityModal(false);
            setCityForm({ name: '', delivery_cost: '', is_active: true });
            setEditingCity(null);
            fetchCities();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving city:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save city' });
        } finally {
            setSaving(false);
        }
    };

    const handleEditCity = (city) => {
        setEditingCity(city);
        setCityForm({
            name: city.name,
            delivery_cost: city.delivery_cost ?? '',
            is_active: city.is_active,
        });
        setShowCityModal(true);
    };

    const handleDeleteCity = async (cityId) => {
        if (!confirm('Are you sure you want to delete this city?')) return;
        try {
            await api.delete(`/cities/${cityId}`);
            setMessage({ type: 'success', text: 'City deleted successfully!' });
            fetchCities();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error deleting city:', error);
            setMessage({ type: 'error', text: 'Failed to delete city' });
        }
    };

    const handleSyncCities = async () => {
        try {
            setSyncingCities(true);
            const response = await api.post('/cities/sync-sources');
            const synced = response.data?.synced;
            await fetchCities();

            if (synced) {
                setMessage({
                    type: 'success',
                    text: `Cities synced. Added ${synced.created}, kept ${synced.already_existing} existing.`,
                });
            } else {
                setMessage({ type: 'success', text: 'Cities synchronized successfully!' });
            }

            setTimeout(() => setMessage(null), 4000);
        } catch (error) {
            console.error('Error syncing cities:', error);
            setMessage({ type: 'error', text: 'Failed to sync cities from BMDelivery/Tawsilex sources' });
        } finally {
            setSyncingCities(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/settings', { settings });
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'currency', label: 'Currency', icon: DollarSign },
        { id: 'company', label: 'Company', icon: Building2 },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'cities', label: 'Cities', icon: MapPinned },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'commission', label: 'Commission', icon: Percent },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600 mt-1">Manage your application settings and preferences</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                        <AlertCircle size={20} className="text-red-600" />
                    )}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm p-2 space-y-1 sticky top-24">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <tab.icon size={20} />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-blue-100 rounded-xl">
                                        <Globe className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                                        <p className="text-sm text-gray-600">Configure basic application settings</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Application Name
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.app_name}
                                            onChange={(e) => handleChange('app_name', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Livraison"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">This name appears in the sidebar and browser title</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Application Description
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.app_description}
                                            onChange={(e) => handleChange('app_description', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Admin Panel"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Brief description shown under the app name</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Timezone
                                        </label>
                                        <select
                                            value={settings.app_timezone}
                                            onChange={(e) => handleChange('app_timezone', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Africa/Casablanca">Africa/Casablanca (GMT)</option>
                                            <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                                            <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                                            <option value="Europe/London">Europe/London (GMT)</option>
                                            <option value="America/New_York">America/New_York (GMT-5)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Language
                                        </label>
                                        <select
                                            value={settings.app_language}
                                            onChange={(e) => handleChange('app_language', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="en">English</option>
                                            <option value="fr">Français</option>
                                            <option value="ar">العربية</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Currency Settings */}
                        {activeTab === 'currency' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-green-100 rounded-xl">
                                        <DollarSign className="text-green-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Currency Settings</h2>
                                        <p className="text-sm text-gray-600">Configure currency display and formatting</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Currency Code
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.currency_code}
                                            onChange={(e) => handleChange('currency_code', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="MAD"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">ISO 4217 currency code (e.g., MAD, USD, EUR)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Currency Symbol
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.currency_symbol}
                                            onChange={(e) => handleChange('currency_symbol', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="DH"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Symbol displayed with amounts</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Currency Position
                                        </label>
                                        <select
                                            value={settings.currency_position}
                                            onChange={(e) => handleChange('currency_position', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="before">Before amount (€100)</option>
                                            <option value="after">After amount (100 DH)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Decimal Places
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.currency_decimals}
                                            onChange={(e) => handleChange('currency_decimals', parseInt(e.target.value))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            min="0"
                                            max="4"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Decimal Separator
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.currency_decimal_separator}
                                            onChange={(e) => handleChange('currency_decimal_separator', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            maxLength="1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Thousand Separator
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.currency_thousand_separator}
                                            onChange={(e) => handleChange('currency_thousand_separator', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            maxLength="1"
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Preview:</strong> {
                                            settings.currency_position === 'before' 
                                                ? `${settings.currency_symbol}1${settings.currency_thousand_separator}234${settings.currency_decimal_separator}${Array(parseInt(settings.currency_decimals)).fill('5').join('')}`
                                                : `1${settings.currency_thousand_separator}234${settings.currency_decimal_separator}${Array(parseInt(settings.currency_decimals)).fill('5').join('')} ${settings.currency_symbol}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Company Settings */}
                        {activeTab === 'company' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-purple-100 rounded-xl">
                                        <Building2 className="text-purple-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
                                        <p className="text-sm text-gray-600">Manage company details and contact information</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.company_name}
                                            onChange={(e) => handleChange('company_name', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                            <Mail size={16} />
                                            <span>Email Address</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.company_email}
                                            onChange={(e) => handleChange('company_email', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                            <Phone size={16} />
                                            <span>Phone Number</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.company_phone}
                                            onChange={(e) => handleChange('company_phone', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                            <MapPin size={16} />
                                            <span>Address</span>
                                        </label>
                                        <textarea
                                            value={settings.company_address}
                                            onChange={(e) => handleChange('company_address', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows="3"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                            <FileText size={16} />
                                            <span>Tax Number</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.company_tax_number || ''}
                                            onChange={(e) => handleChange('company_tax_number', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                            <FileText size={16} />
                                            <span>Registration Number</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.company_registration_number || ''}
                                            onChange={(e) => handleChange('company_registration_number', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Settings */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-orange-100 rounded-xl">
                                        <ShoppingCart className="text-orange-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Order Settings</h2>
                                        <p className="text-sm text-gray-600">Configure order management preferences</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Order Prefix
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.order_prefix}
                                            onChange={(e) => handleChange('order_prefix', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Prefix for order numbers (e.g., ORD-001)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Low Stock Threshold
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.order_low_stock_threshold}
                                            onChange={(e) => handleChange('order_low_stock_threshold', parseInt(e.target.value))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            min="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Fulfillment Cost
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={settings.order_fulfillment_cost}
                                                onChange={(e) => handleChange('order_fulfillment_cost', parseFloat(e.target.value) || 0)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min="0"
                                                step="0.01"
                                            />
                                            <span className="absolute right-4 top-2.5 text-gray-500">{settings.currency_symbol}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Fixed emballage and handling cost used in profit calculations. Default: 10 {settings.currency_symbol}
                                        </p>
                                    </div>

                                    <div className="md:col-span-2 space-y-4">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.order_auto_confirm}
                                                onChange={(e) => handleChange('order_auto_confirm', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <div>
                                                <span className="font-semibold text-gray-700">Auto-confirm orders</span>
                                                <p className="text-xs text-gray-500">Automatically confirm new orders</p>
                                            </div>
                                        </label>

                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.order_low_stock_warning}
                                                onChange={(e) => handleChange('order_low_stock_warning', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <div>
                                                <span className="font-semibold text-gray-700">Enable low stock warnings</span>
                                                <p className="text-xs text-gray-500">Show alerts when products are low in stock</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cities Management */}
                        {activeTab === 'cities' && (
                            <div className="space-y-6">
                                <div className="pb-4 border-b border-gray-200">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-3 bg-teal-100 rounded-xl">
                                                <MapPinned className="text-teal-600" size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">Cities Management</h2>
                                                <p className="text-sm text-gray-600">Auto-sync cities from BMDelivery API + Tawsilex list, then edit manually if needed.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSyncCities}
                                                disabled={syncingCities}
                                                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <RefreshCw size={18} className={syncingCities ? 'animate-spin' : ''} />
                                                <span>{syncingCities ? 'Syncing...' : 'Sync BM + Tawsilex Cities'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCityForm({ name: '', delivery_cost: '', is_active: true });
                                                    setEditingCity(null);
                                                    setShowCityModal(true);
                                                }}
                                                className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                                            >
                                                <Plus size={18} />
                                                <span>Add City</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {loadingCities ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="relative w-full md:w-80">
                                                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                                                    <Search size={16} />
                                                </div>
                                                <input
                                                    type="search"
                                                    value={citySearch}
                                                    onChange={(e) => setCitySearch(e.target.value)}
                                                    placeholder="Search cities..."
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                />
                                            </div>
                                            {citySearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCitySearch('')}
                                                    className="text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                    Clear search
                                                </button>
                                            )}
                                        </div>

                                        {!cities.length ? (
                                            <div className="text-center py-12">
                                                <MapPinned className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                                <p className="text-gray-600">No cities added yet</p>
                                                <p className="text-sm text-gray-500 mt-1">Click "Add City" to get started</p>
                                            </div>
                                        ) : filteredCities.length === 0 ? (
                                            <div className="text-center py-12 space-y-1 text-sm text-gray-500">
                                                <p>No cities match "{citySearch}".</p>
                                                <p className="text-gray-400">Clear the search to return to the full list.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                                                {filteredCities.map((city) => {
                                                    const costLabel = (city.delivery_cost !== null && city.delivery_cost !== undefined)
                                                        ? `${city.delivery_cost} DH`
                                                        : '-';

                                                    return (
                                                        <div
                                                            key={city.id}
                                                            className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between hover:bg-gray-50"
                                                        >
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-semibold text-gray-900">{city.name}</p>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">Cost: {costLabel}</span>
                                                                    <span className={`px-2 py-1 rounded ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                        {city.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 md:gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditCity(city)}
                                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-100 rounded-lg"
                                                                >
                                                                    <Edit2 size={14} />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteCity(city.id)}
                                                                    className="flex items-center gap-1 text-red-600 hover:text-red-900 px-3 py-1 border border-red-100 rounded-lg"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    <span>Delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}

                            </div>
                        )}

                        {/* Notification Settings */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-yellow-100 rounded-xl">
                                        <Bell className="text-yellow-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                                        <p className="text-sm text-gray-600">Control how and when you receive notifications</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-center space-x-3 cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications_enabled}
                                            onChange={(e) => handleChange('notifications_enabled', e.target.checked)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div>
                                            <span className="font-semibold text-gray-700">Enable notifications</span>
                                            <p className="text-xs text-gray-500">Master switch for all notifications</p>
                                        </div>
                                    </label>

                                    <div className="pl-8 space-y-3">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_email}
                                                onChange={(e) => handleChange('notifications_email', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                disabled={!settings.notifications_enabled}
                                            />
                                            <div>
                                                <span className="font-semibold text-gray-700">Email notifications</span>
                                                <p className="text-xs text-gray-500">Receive notifications via email</p>
                                            </div>
                                        </label>

                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifications_sms}
                                                onChange={(e) => handleChange('notifications_sms', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                disabled={!settings.notifications_enabled}
                                            />
                                            <div>
                                                <span className="font-semibold text-gray-700">SMS notifications</span>
                                                <p className="text-xs text-gray-500">Receive notifications via SMS</p>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <h3 className="font-semibold text-gray-700 mb-3">Event Notifications</h3>
                                        <div className="space-y-3 pl-4">
                                            <label className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications_new_order}
                                                    onChange={(e) => handleChange('notifications_new_order', e.target.checked)}
                                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    disabled={!settings.notifications_enabled}
                                                />
                                                <span className="text-gray-700">New order notifications</span>
                                            </label>

                                            <label className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications_low_stock}
                                                    onChange={(e) => handleChange('notifications_low_stock', e.target.checked)}
                                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    disabled={!settings.notifications_enabled}
                                                />
                                                <span className="text-gray-700">Low stock alerts</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commission Settings */}
                        {activeTab === 'commission' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                                    <div className="p-3 bg-pink-100 rounded-xl">
                                        <Percent className="text-pink-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Commission Settings</h2>
                                        <p className="text-sm text-gray-600">Configure commission rates and calculations</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="flex items-center space-x-3 cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                        <input
                                            type="checkbox"
                                            checked={settings.commission_enabled}
                                            onChange={(e) => handleChange('commission_enabled', e.target.checked)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div>
                                            <span className="font-semibold text-gray-700">Enable commission system</span>
                                            <p className="text-xs text-gray-500">Track and calculate commissions for agents/vendors</p>
                                        </div>
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Commission Type
                                            </label>
                                            <select
                                                value={settings.commission_type}
                                                onChange={(e) => handleChange('commission_type', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                disabled={!settings.commission_enabled}
                                            >
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed Amount</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Commission Value
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={settings.commission_value}
                                                    onChange={(e) => handleChange('commission_value', parseFloat(e.target.value))}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={!settings.commission_enabled}
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <span className="absolute right-4 top-2.5 text-gray-500">
                                                    {settings.commission_type === 'percentage' ? '%' : settings.currency_symbol}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {settings.commission_enabled && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-blue-800">
                                                <strong>Example:</strong> For an order of 1,000 {settings.currency_symbol}, the commission will be{' '}
                                                {settings.commission_type === 'percentage' 
                                                    ? `${(1000 * settings.commission_value / 100).toFixed(2)} ${settings.currency_symbol} (${settings.commission_value}%)`
                                                    : `${settings.commission_value} ${settings.currency_symbol}`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </form>
                    {showCityModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl p-6 w-full max-w-md">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    {editingCity ? 'Edit City' : 'Add New City'}
                                </h3>
                                <form onSubmit={handleCitySubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            City Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={cityForm.name}
                                            onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            required
                                            placeholder="Enter city name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Delivery Cost
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={cityForm.delivery_cost}
                                            onChange={(e) => setCityForm({ ...cityForm, delivery_cost: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            min="0"
                                            placeholder="Optional (default 0)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Keep empty if you use provider-specific pricing.</p>
                                    </div>
                                    <div>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={cityForm.is_active}
                                                onChange={(e) => setCityForm({ ...cityForm, is_active: e.target.checked })}
                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-gray-700">Active</span>
                                        </label>
                                    </div>
                                    <div className="flex justify-end space-x-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCityModal(false);
                                                setEditingCity(null);
                                                setCityForm({ name: '', delivery_cost: '', is_active: true });
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? 'Saving...' : (editingCity ? 'Update' : 'Add')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
