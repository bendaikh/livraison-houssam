import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const aliasMap = {
    customer_name: ['client', 'client_name', 'customer', 'first_name', 'nom', 'nom_client'],
    phone: ['phone', 'tel', 'telephone', 'mobile'],
    city: ['city', 'ville'],
    total_price: ['price', 'total_price', 'total', 'montant', 'cod'],
    address: ['address', 'address_2', 'adresse'],
    product_name: ['product', 'product_name', 'article', 'product_name_variant', 'product_name___variant'],
    quantity: ['quantity', 'qty', 'qte'],
    external_order_id: ['order_id', 'reference', 'id', 'order_number'],
    notes: ['notes', 'note', 'comment'],
    date: ['date', 'order_date', 'created_at'],
};

const requiredFields = ['customer_name', 'phone'];

const extractSheetId = (urlOrId = '') => {
    if (!urlOrId) return '';
    if (!urlOrId.includes('docs.google.com')) return urlOrId.trim();
    const parts = urlOrId.split('/d/');
    if (parts.length < 2) return urlOrId.trim();
    return parts[1].split('/')[0];
};

const hashKey = (values) => values.join('|').toLowerCase();

export default function GoogleSheetIntegrationPage() {
    const { user } = useAuth();
    const [integration, setIntegration] = useState(null);
    const [sheetUrl, setSheetUrl] = useState('');
    const [tabs, setTabs] = useState([]);
    const [selectedTab, setSelectedTab] = useState('');
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [mapping, setMapping] = useState({});
    const [validRows, setValidRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [duplicateRows, setDuplicateRows] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loadingTabs, setLoadingTabs] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const response = await api.get('/api-integrations');
            const gs = response.data.find((i) => i.provider === 'google_sheet');
            if (gs) {
                setIntegration(gs);
                const savedUrl = gs.credentials?.sheet_url || '';
                if (savedUrl) {
                    setSheetUrl(savedUrl);
                }
            }
        } catch (error) {
            console.error('Error fetching Google Sheet integration', error);
        }
    };

    const detectMapping = (normalizedHeaders) => {
        const preferred = {
            customer_name: 'first_name',
            phone: 'phone',
            city: 'ville',
            address: 'address_2',
            total_price: 'total_price',
            product_name: 'product_name_variant',
            quantity: 'quantity',
            external_order_id: 'order_id',
            notes: null,
            date: null,
        };

        const detected = {};
        Object.entries(preferred).forEach(([field, header]) => {
            if (header && normalizedHeaders.includes(header)) {
                detected[field] = header;
            }
        });

        Object.entries(aliasMap).forEach(([field, aliases]) => {
            if (detected[field]) return;
            const match = normalizedHeaders.find((h) => aliases.includes(h));
            if (match) detected[field] = match;
        });
        return detected;
    };

    const normalizeHeaders = (raw) => raw.map((h) => (h || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));

    const loadTabs = async () => {
        setMessage({});
        if (!sheetUrl) {
            setMessage({ type: 'error', text: 'Paste a Google Sheet URL first.' });
            return;
        }
        setLoadingTabs(true);
        try {
            const response = await api.get(`/api-integrations/${integration.id}/google-sheet/tabs`, {
                params: { sheet_url: sheetUrl },
            });
            setTabs(response.data.data || []);
            if ((response.data.data || []).length > 0) {
                setSelectedTab(response.data.data[0]);
            }
            setMessage({ type: 'success', text: 'Tabs loaded. Choose the tab that has your orders.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load tabs.' });
        } finally {
            setLoadingTabs(false);
        }
    };

    const loadPreview = async () => {
        if (!selectedTab) {
            setMessage({ type: 'error', text: 'Select a tab to preview.' });
            return;
        }
        setLoadingPreview(true);
        setMessage({});
        try {
            const response = await api.post(`/api-integrations/${integration.id}/google-sheet/preview`, {
                sheet_url: sheetUrl,
                tab: selectedTab,
                limit: 200,
            });
            const data = response.data.data || { headers: [], rows: [] };
            const normalized = normalizeHeaders(data.headers || []);
            setHeaders(normalized);
            setRows(data.rows || []);
            const detected = detectMapping(normalized);
            setMapping(detected);
            buildPreview(data.rows || [], detected, normalized.includes('check'));
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load preview.' });
        } finally {
            setLoadingPreview(false);
        }
    };

    const isPresent = (val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') {
            const t = val.trim();
            if (t === '-') return true;
            return t !== '';
        }
        return true;
    };

    const buildPreview = (previewRows, detectedMapping, hasCheck) => {
        const valids = [];
        const invalids = [];
        const duplicates = [];
        const seen = new Set();

        previewRows.forEach((row) => {
            const pick = (field) => {
                const col = detectedMapping[field];
                if (!col) return undefined;
                return row[col];
            };

            if (hasCheck && (row.check === null || row.check === undefined || row.check === '')) {
                invalids.push({ row, reason: 'CHECK column empty' });
                return;
            }

            const customer = pick('customer_name');
            const phone = pick('phone');
            const city = pick('city');
            const address2 = pick('address');

            if (!isPresent(customer) || !isPresent(phone)) {
                invalids.push({ row, reason: 'Missing required fields (customer, phone)' });
                return;
            }

            if (!(isPresent(city) || isPresent(address2))) {
                invalids.push({ row, reason: 'Missing required fields (city or address)' });
                return;
            }

            const product = pick('product_name') || 'Sheet Item';
            const total = pick('total_price') || 0;
            const qty = pick('quantity') || 1;
            const external = pick('external_order_id');

            const dedupKey = external || hashKey([customer, phone, city || address2, product, total]);
            if (seen.has(dedupKey)) {
                duplicates.push({ row, reason: 'Duplicate in sheet' });
                return;
            }
            seen.add(dedupKey);

            valids.push({
                row,
                parsed: {
                    customer_name: customer,
                    phone,
                    city,
                    address: address2,
                    total_price: total,
                    product_name: product,
                    quantity: qty || 1,
                    external_order_id: external,
                    notes: pick('notes'),
                    date: pick('date'),
                },
            });
        });

        setValidRows(valids);
        setInvalidRows(invalids);
        setDuplicateRows(duplicates);
    };

    useEffect(() => {
        if (rows.length && Object.keys(mapping).length) {
            buildPreview(rows, mapping, headers.includes('check'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapping]);

    const persistAndImport = async () => {
        if (!integration) {
            setMessage({ type: 'error', text: 'Integration missing. Ask admin to enable Google Sheets.' });
            return;
        }
        if (!sheetUrl || !selectedTab) {
            setMessage({ type: 'error', text: 'Paste a sheet URL and select a tab first.' });
            return;
        }
        if (!validRows.length) {
            setMessage({ type: 'error', text: 'No valid rows to import.' });
            return;
        }

        setImporting(true);
        setMessage({});
        const credentials = {
            api_key: integration.credentials?.api_key || '',
            sheet_id: extractSheetId(sheetUrl),
            sheet_url: sheetUrl,
            range: `${selectedTab}!A1:Z1000`,
            header_row: 1,
        };
        const payload = {
            name: integration.name || 'Google Sheets',
            type: 'google_sheet',
            provider: 'google_sheet',
            is_active: true,
            vendor_id: user?.vendor?.id || integration.vendor_id || null,
            credentials,
        };

        try {
            await api.put(`/api-integrations/${integration.id}`, payload);
            const res = await api.post(`/api-integrations/${integration.id}/sync`);
            const logMsg = res.data?.log?.message || res.data.message || 'Import started.';
            setMessage({ type: 'success', text: logMsg });
            fetchIntegration();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Import failed.' });
        } finally {
            setImporting(false);
        }
    };

    const mappingList = useMemo(() => {
        const fields = ['customer_name', 'phone', 'city', 'address', 'total_price', 'product_name', 'quantity', 'external_order_id', 'notes', 'date'];
        return fields.map((field) => ({ field, column: mapping[field] || 'Not detected' }));
    }, [mapping]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/api-integrations" className="text-gray-500 hover:text-gray-700">← Back</Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Google Sheets Import</h1>
                            <p className="text-gray-600">Paste a sheet URL → pick the tab → review → import.</p>
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
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Google Sheet URL</label>
                        <input
                            type="text"
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500">We only need the URL. Tabs and headers are detected automatically.</p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <button
                            type="button"
                            onClick={loadTabs}
                            disabled={!integration || loadingTabs}
                            className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 disabled:opacity-40"
                        >
                            {loadingTabs ? 'Loading tabs...' : 'Load Tabs'}
                        </button>
                        <select
                            value={selectedTab}
                            onChange={(e) => setSelectedTab(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Select tab</option>
                            {tabs.map((tab) => (
                                <option key={tab} value={tab}>{tab}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={loadPreview}
                            disabled={!selectedTab || loadingPreview}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loadingPreview ? 'Loading preview...' : 'Preview'}
                        </button>
                    </div>

                    {headers.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">Detected mapping</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {mappingList.map((item) => (
                                    <div key={item.field} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                        <span className="font-medium text-gray-700">{item.field}</span>
                                        <span className={`text-gray-800 ${item.column === 'Not detected' ? 'text-red-600' : ''}`}>
                                            {item.column}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {validRows.length + invalidRows.length + duplicateRows.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">Preview</h3>
                            <div className="flex flex-wrap gap-3 text-sm">
                                <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-700">Valid: {validRows.length}</span>
                                <span className="px-3 py-1 rounded bg-amber-50 text-amber-700">Duplicates: {duplicateRows.length}</span>
                                <span className="px-3 py-1 rounded bg-red-50 text-red-700">Invalid: {invalidRows.length}</span>
                            </div>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {headers.slice(0, 8).map((h) => (
                                                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {validRows.slice(0, 10).map((rowObj, idx) => (
                                            <tr key={idx} className="border-t">
                                                {headers.slice(0, 8).map((h) => (
                                                    <td key={h} className="px-3 py-2 text-gray-800">{rowObj.row[h]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {validRows.length === 0 && (
                                            <tr><td className="px-3 py-2 text-gray-500" colSpan={headers.length}>No valid rows found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={persistAndImport}
                            disabled={importing || !validRows.length}
                            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : 'Confirm Import'}
                        </button>
                        <p className="text-xs text-gray-500 self-center">Only valid, non-duplicate rows are imported. Required: customer, phone, city.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
                    <h3 className="text-base font-semibold text-gray-900">How it works</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Paste the Google Sheet URL; we extract the ID automatically.</li>
                        <li>Select the tab; the first row becomes headers.</li>
                        <li>We auto-detect columns (client/phone/city are required).</li>
                        <li>Defaults: status pending, quantity 1, source google_sheet, date = today if missing.</li>
                        <li>If a column named CHECK exists, only rows with a value in CHECK are imported.</li>
                    </ul>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-sm text-emerald-800">
                        Supported aliases: client/client_name/customer/nom, phone/tel/mobile, city/ville, price/total/montant/cod, product/product_name/article, quantity/qty/qte, order_id/reference.
                    </div>
                </div>
            </div>
        </div>
    );
}
