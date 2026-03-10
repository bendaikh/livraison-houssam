import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const defaultForm = {
    name: 'Google Sheets Import',
    sheet_url: '',
    api_key: '',
    range: 'Orders!A1:Z1000',
    header_row: 1,
    is_active: true,
};

function extractSheetId(urlOrId = '') {
    if (!urlOrId) return '';
    if (!urlOrId.includes('docs.google.com')) return urlOrId.trim();
    const parts = urlOrId.split('/d/');
    if (parts.length < 2) return urlOrId.trim();
    const rest = parts[1];
    return rest.split('/')[0];
}

export default function GoogleSheetIntegrationPage() {
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-integrations');
            const gs = response.data.find((i) => i.provider === 'google_sheet');
            if (gs) {
                setIntegration(gs);
                setFormData({
                    name: gs.name,
                    sheet_url: gs.credentials?.sheet_id || '',
                    api_key: gs.credentials?.api_key || '',
                    range: gs.credentials?.range || 'Orders!A1:Z1000',
                    header_row: gs.credentials?.header_row || 1,
                    is_active: gs.is_active,
                });
            }
        } catch (error) {
            console.error('Error fetching Google Sheet integration', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                name: formData.name,
                type: 'google_sheet',
                provider: 'google_sheet',
                is_active: formData.is_active,
                credentials: {
                    sheet_id: extractSheetId(formData.sheet_url),
                    api_key: formData.api_key,
                    range: formData.range,
                    header_row: Number(formData.header_row) || 1,
                },
                settings: {
                    fill_missing: true,
                },
            };

            if (integration) {
                await api.put(`/api-integrations/${integration.id}`, payload);
                setMessage({ type: 'success', text: 'Google Sheet integration updated.' });
            } else {
                await api.post('/api-integrations', payload);
                setMessage({ type: 'success', text: 'Google Sheet integration created.' });
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

    const handleTest = async () => {
        if (!integration) {
            setMessage({ type: 'error', text: 'Save the integration first.' });
            return;
        }
        setIsTesting(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await api.post(`/api-integrations/${integration.id}/test-connection`);
            setMessage({ type: res.data.success ? 'success' : 'error', text: res.data.message });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Connection test failed' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSync = async () => {
        if (!integration) return;
        setIsSyncing(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await api.post(`/api-integrations/${integration.id}/sync`);
            setMessage({ type: 'success', text: res.data.message || 'Sync completed.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Sync failed' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async () => {
        if (!integration) return;
        if (!confirm('Delete Google Sheet integration?')) return;
        try {
            await api.delete(`/api-integrations/${integration.id}`);
            setIntegration(null);
            setFormData(defaultForm);
            setMessage({ type: 'success', text: 'Integration deleted.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Delete failed' });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Link to="/api-integrations" className="text-gray-500 hover:text-gray-700">← Back</Link>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/api-integrations" className="text-gray-500 hover:text-gray-700">← Back</Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Google Sheets</h1>
                            <p className="text-gray-600">Import orders from a spreadsheet and keep them in sync.</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {integration.is_active ? 'Active' : 'Inactive'}
                    </span>
                )}
            </div>

            {/* Message */}
            {message.text && (
                <div className={`px-4 py-3 rounded-lg ${
                    message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Connection</h2>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Integration Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sheet URL or ID</label>
                                <input
                                    type="text"
                                    value={formData.sheet_url}
                                    onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="https://docs.google.com/spreadsheets/d/xxxx/edit"
                                    required
                                />
                                <p className="mt-2 text-xs text-gray-500">We only store the sheet ID; you can paste a full URL.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                                <input
                                    type="password"
                                    value={formData.api_key}
                                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="AIza..."
                                    required
                                />
                                <p className="mt-2 text-xs text-gray-500">Create an API key in Google Cloud → Credentials → API key.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Range</label>
                                <input
                                    type="text"
                                    value={formData.range}
                                    onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="Orders!A1:H200"
                                />
                                <p className="mt-2 text-xs text-gray-500">Tab name + range. Leave default to fetch all columns A–Z.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Header Row</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.header_row}
                                    onChange={(e) => setFormData({ ...formData, header_row: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <p className="mt-2 text-xs text-gray-500">Where column names live.</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                {isSaving ? 'Saving…' : 'Save Integration'}
                            </button>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={!integration || isTesting}
                                className="px-5 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition disabled:opacity-40"
                            >
                                {isTesting ? 'Testing…' : 'Test Connection'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSync}
                                disabled={!integration || isSyncing}
                                className="px-5 py-2 bg-white text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition disabled:opacity-40"
                            >
                                {isSyncing ? 'Syncing…' : 'Sync Now'}
                            </button>
                            {integration && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-5 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">How the importer reads your sheet</h3>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Only <strong>client</strong>, <strong>phone</strong>, <strong>city</strong>, and <strong>price</strong> are required.</li>
                        <li>Accepted aliases: client / client_name / customer / nom_client; phone / tel / mobile; city / ville; price / total / montant / cod.</li>
                        <li>Optional extras: date, id/reference, shopify_name, address, products (product / product_name / article).</li>
                        <li>Status, quantity, shipping cost, notes, etc. are <em>not</em> required—defaults are applied automatically.</li>
                    </ul>
                    <p className="text-sm text-gray-600">
                        Defaults: status → <span className="font-semibold">pending</span>, quantity → 1, source → google_sheet, date → today if missing.
                    </p>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                        Keep your first row as headers; every other row becomes an order. Different sellers can keep their own column names.
                    </div>
                </div>
            </div>
        </div>
    );
}
