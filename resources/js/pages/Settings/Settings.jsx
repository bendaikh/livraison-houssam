import React, { useState, useEffect } from 'react';
import { 
    Save, Building2, Globe, DollarSign, ShoppingCart, 
    Bell, Percent, AlertCircle, CheckCircle2, Loader2,
    Settings as SettingsIcon, Mail, Phone, MapPin, FileText
} from 'lucide-react';
import api from '../../utils/api';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    
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
                </div>
            </div>
        </div>
    );
}
