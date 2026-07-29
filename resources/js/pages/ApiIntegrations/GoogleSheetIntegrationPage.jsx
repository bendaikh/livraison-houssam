import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
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

const extractSheetId = (urlOrId = '') => {
    if (!urlOrId) return '';
    if (!urlOrId.includes('docs.google.com')) return urlOrId.trim();
    const parts = urlOrId.split('/d/');
    if (parts.length < 2) return urlOrId.trim();
    return parts[1].split('/')[0];
};

const hashKey = (values) => values.join('|').toLowerCase();

export default function GoogleSheetIntegrationPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();
    const [integration, setIntegration] = useState(null);
    const [connectedSheets, setConnectedSheets] = useState([]);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [spreadsheets, setSpreadsheets] = useState([]);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
    const [connectingGoogle, setConnectingGoogle] = useState(false);
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
    const [connectingSheet, setConnectingSheet] = useState(false);
    const [syncingKey, setSyncingKey] = useState('');
    const [syncingAll, setSyncingAll] = useState(false);

    useEffect(() => {
        fetchIntegration();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('connected') === '1') {
            setMessage({ type: 'success', text: t('admin.apiIntegrations.googleSheet.connectedSuccess') });
            fetchIntegration();
        } else if (params.get('error')) {
            setMessage({ type: 'error', text: params.get('error') });
        }
    }, [location.search, t]);

    const applyConnectedSheets = (sheets = []) => {
        setConnectedSheets(Array.isArray(sheets) ? sheets : []);
    };

    const fetchIntegration = async () => {
        try {
            const response = await api.get('/api-integrations');
            const gs = response.data.find((i) => i.provider === 'google_sheet');
            if (!gs) return;

            setIntegration(gs);
            const oauth = gs.credentials?.oauth || {};
            setGoogleConnected(Boolean(oauth.access_token));
            setGoogleEmail(oauth.email || '');

            try {
                const connectionsRes = await api.get(`/api-integrations/${gs.id}/google-sheet/connections`);
                applyConnectedSheets(connectionsRes.data.data || []);
            } catch {
                applyConnectedSheets(gs.settings?.connected_sheets || []);
            }

            if (oauth.access_token) {
                loadSpreadsheets(gs);
            }
        } catch (error) {
            console.error('Error fetching Google Sheet integration', error);
        }
    };

    const loadSpreadsheets = useCallback(async (activeIntegration = integration) => {
        if (!activeIntegration?.id) return;
        setLoadingSpreadsheets(true);
        try {
            const response = await api.get(`/api-integrations/${activeIntegration.id}/google/spreadsheets`);
            const files = response.data.spreadsheets || [];
            setSpreadsheets(files);
            setGoogleConnected(Boolean(response.data.connected));
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.failedLoadSpreadsheets') });
        } finally {
            setLoadingSpreadsheets(false);
        }
    }, [integration, t]);

    const ensureIntegration = async () => {
        if (integration) return integration;

        const response = await api.post('/api-integrations', {
            name: 'Google Sheets',
            type: 'google_sheet',
            provider: 'google_sheet',
            is_active: true,
            vendor_id: user?.vendor?.id || null,
            credentials: {},
            settings: { auto_sync: true, connected_sheets: [] },
        });
        setIntegration(response.data);
        return response.data;
    };

    const connectWithGoogle = async () => {
        setConnectingGoogle(true);
        setMessage({});
        try {
            const activeIntegration = await ensureIntegration();
            const response = await api.get(`/api-integrations/${activeIntegration.id}/google/oauth/url`);
            window.location.href = response.data.url;
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.connectFailed') });
            setConnectingGoogle(false);
        }
    };

    const disconnectGoogle = async () => {
        if (!integration) return;
        try {
            await api.post(`/api-integrations/${integration.id}/google/disconnect`);
            setGoogleConnected(false);
            setGoogleEmail('');
            setSpreadsheets([]);
            setSelectedSpreadsheetId('');
            setSheetUrl('');
            setTabs([]);
            setSelectedTab('');
            setMessage({ type: 'success', text: t('admin.apiIntegrations.googleSheet.disconnected') });
            fetchIntegration();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.disconnectFailed') });
        }
    };

    const handleSpreadsheetPick = async (spreadsheetId) => {
        setSelectedSpreadsheetId(spreadsheetId);
        const selected = spreadsheets.find((sheet) => sheet.id === spreadsheetId);
        const nextUrl = selected?.url || (spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '');
        setSheetUrl(nextUrl);
        setTabs([]);
        setSelectedTab('');
        setHeaders([]);
        setRows([]);
        setValidRows([]);
        setInvalidRows([]);
        setDuplicateRows([]);

        if (!spreadsheetId) return;

        setLoadingTabs(true);
        setMessage({});
        try {
            const activeIntegration = await ensureIntegration();
            const response = await api.get(`/api-integrations/${activeIntegration.id}/google-sheet/tabs`, {
                params: { sheet_url: spreadsheetId },
            });
            const loadedTabs = response.data.data || [];
            setTabs(loadedTabs);
            if (loadedTabs.length > 0) {
                setSelectedTab(loadedTabs[0]);
            }
            setMessage({
                type: loadedTabs.length > 0 ? 'success' : 'error',
                text: loadedTabs.length > 0
                    ? t('admin.apiIntegrations.googleSheet.tabsReadyToConnect')
                    : t('admin.apiIntegrations.googleSheet.noTabs'),
            });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.failedLoadTabs') });
        } finally {
            setLoadingTabs(false);
        }
    };

    const connectSpreadsheet = async () => {
        if (!selectedSpreadsheetId || !selectedTab) {
            setMessage({ type: 'error', text: t('admin.apiIntegrations.googleSheet.pasteUrlAndTab') });
            return;
        }

        setConnectingSheet(true);
        setMessage({});
        try {
            const activeIntegration = await ensureIntegration();
            const selected = spreadsheets.find((sheet) => sheet.id === selectedSpreadsheetId);
            const response = await api.post(`/api-integrations/${activeIntegration.id}/google-sheet/connections`, {
                sheet_id: selectedSpreadsheetId || extractSheetId(sheetUrl),
                sheet_name: selected?.name || '',
                sheet_url: sheetUrl || `https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}/edit`,
                tab: selectedTab,
            });

            applyConnectedSheets(response.data.connected_sheets || []);
            setIntegration((prev) => (prev ? { ...prev, ...activeIntegration } : activeIntegration));
            setMessage({ type: 'success', text: t('admin.apiIntegrations.googleSheet.connectionAdded') });

            // Immediate first sync for the new connection
            const connection = response.data.connection;
            if (connection?.key) {
                await syncConnection(connection.key, activeIntegration.id);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.connectionAddFailed') });
        } finally {
            setConnectingSheet(false);
        }
    };

    const removeConnection = async (connectionKey) => {
        if (!integration?.id) return;
        try {
            const response = await api.delete(
                `/api-integrations/${integration.id}/google-sheet/connections/${encodeURIComponent(connectionKey)}`
            );
            applyConnectedSheets(response.data.connected_sheets || []);
            setMessage({ type: 'success', text: t('admin.apiIntegrations.googleSheet.connectionRemoved') });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.connectionRemoveFailed') });
        }
    };

    const syncConnection = async (connectionKey = null, integrationId = integration?.id) => {
        if (!integrationId) return;
        if (connectionKey) {
            setSyncingKey(connectionKey);
        } else {
            setSyncingAll(true);
        }
        setMessage({});
        try {
            const res = await api.post(`/api-integrations/${integrationId}/sync`, {
                connection_key: connectionKey || undefined,
            });
            if (Array.isArray(res.data.connected_sheets)) {
                applyConnectedSheets(res.data.connected_sheets);
            } else {
                fetchIntegration();
            }
            const logMsg = res.data?.log?.message || res.data.message || t('admin.apiIntegrations.googleSheet.syncStarted');
            setMessage({ type: 'success', text: logMsg });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.importFailed') });
        } finally {
            setSyncingKey('');
            setSyncingAll(false);
        }
    };

    const normalizeHeaders = (raw) => raw.map((h) => (h || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));

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

    const isPresent = (val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed === '-') return true;
            return trimmed !== '';
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
            const total = pick('total_price');
            const product = pick('product_name');
            const qty = pick('quantity');
            const external = pick('external_order_id');

            const missing = [];
            if (!isPresent(customer)) missing.push('customer');
            if (!isPresent(phone)) missing.push('phone');
            if (!(isPresent(city) || isPresent(address2))) missing.push('city_or_address');

            if (missing.length) {
                invalids.push({ row, reason: missing.join(', ') });
                return;
            }

            const dedupe = hashKey([
                String(external || ''),
                String(customer || ''),
                String(phone || ''),
                String(city || address2 || ''),
                String(product || ''),
                String(total || ''),
            ]);

            if (seen.has(dedupe)) {
                duplicates.push({ row });
                return;
            }
            seen.add(dedupe);

            valids.push({
                row,
                mapped: {
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

    const loadPreview = async () => {
        if (!selectedTab) {
            setMessage({ type: 'error', text: t('admin.apiIntegrations.googleSheet.selectTabFirst') });
            return;
        }
        setLoadingPreview(true);
        setMessage({});
        try {
            const activeIntegration = await ensureIntegration();
            const response = await api.post(`/api-integrations/${activeIntegration.id}/google-sheet/preview`, {
                sheet_url: selectedSpreadsheetId || sheetUrl,
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
            setMessage({ type: 'error', text: error.response?.data?.message || t('admin.apiIntegrations.googleSheet.failedLoadPreview') });
        } finally {
            setLoadingPreview(false);
        }
    };

    useEffect(() => {
        if (rows.length && Object.keys(mapping).length) {
            buildPreview(rows, mapping, headers.includes('check'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapping]);

    const mappingList = useMemo(() => {
        const fields = ['customer_name', 'phone', 'city', 'address', 'total_price', 'product_name', 'quantity', 'external_order_id', 'notes', 'date'];
        return fields.map((field) => ({ field, column: mapping[field] || 'Not detected' }));
    }, [mapping]);

    const alreadyConnected = connectedSheets.some(
        (sheet) => sheet.sheet_id === selectedSpreadsheetId && sheet.tab === selectedTab
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to={appPath('/api-integrations')} className="text-gray-500 hover:text-gray-700">{t('admin.apiIntegrations.back')}</Link>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('admin.apiIntegrations.googleSheet.title')}</h1>
                            <p className="text-gray-600">{t('admin.apiIntegrations.googleSheet.subtitle')}</p>
                        </div>
                    </div>
                </div>
                {integration && (
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        integration.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {integration.is_active ? t('admin.apiIntegrations.active') : t('admin.apiIntegrations.inactive')}
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
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-900">{t('admin.apiIntegrations.googleSheet.googleAccount')}</p>
                                    <p className="text-xs text-emerald-700">
                                        {googleConnected
                                            ? t('admin.apiIntegrations.googleSheet.connectedAs', { email: googleEmail || t('admin.apiIntegrations.googleSheet.connected') })
                                            : t('admin.apiIntegrations.googleSheet.connectHint')}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {!googleConnected ? (
                                        <button
                                            type="button"
                                            onClick={connectWithGoogle}
                                            disabled={connectingGoogle}
                                            className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100 disabled:opacity-50 font-medium"
                                        >
                                            {connectingGoogle ? t('admin.apiIntegrations.googleSheet.connecting') : t('admin.apiIntegrations.googleSheet.connectWithGoogle')}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => loadSpreadsheets()}
                                                disabled={loadingSpreadsheets}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {loadingSpreadsheets ? t('admin.apiIntegrations.googleSheet.refreshing') : t('admin.apiIntegrations.googleSheet.refreshSpreadsheets')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={disconnectGoogle}
                                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                            >
                                                {t('admin.apiIntegrations.googleSheet.disconnect')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                            <h3 className="font-semibold text-gray-900">{t('admin.apiIntegrations.googleSheet.addConnectionTitle')}</h3>
                            <p className="text-sm text-gray-500">{t('admin.apiIntegrations.googleSheet.addConnectionHelp')}</p>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{t('admin.apiIntegrations.googleSheet.selectSpreadsheet')}</label>
                                <select
                                    value={selectedSpreadsheetId}
                                    onChange={(e) => handleSpreadsheetPick(e.target.value)}
                                    disabled={!googleConnected}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50"
                                >
                                    <option value="">{t('admin.apiIntegrations.googleSheet.chooseSpreadsheet')}</option>
                                    {spreadsheets.map((sheet) => (
                                        <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-3 items-center">
                                <select
                                    value={selectedTab}
                                    onChange={(e) => setSelectedTab(e.target.value)}
                                    disabled={!tabs.length || loadingTabs}
                                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                                >
                                    <option value="">{loadingTabs ? t('admin.apiIntegrations.googleSheet.loadingTabs') : t('admin.apiIntegrations.googleSheet.selectTab')}</option>
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
                                    {loadingPreview ? t('admin.apiIntegrations.googleSheet.loadingPreview') : t('admin.apiIntegrations.googleSheet.preview')}
                                </button>
                                <button
                                    type="button"
                                    onClick={connectSpreadsheet}
                                    disabled={connectingSheet || !selectedSpreadsheetId || !selectedTab || alreadyConnected}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {connectingSheet
                                        ? t('admin.apiIntegrations.googleSheet.connectingSheet')
                                        : alreadyConnected
                                            ? t('admin.apiIntegrations.googleSheet.alreadyConnected')
                                            : t('admin.apiIntegrations.googleSheet.connectSheet')}
                                </button>
                            </div>
                        </div>

                        {headers.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">{t('admin.apiIntegrations.googleSheet.detectedMapping')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {mappingList.map((item) => (
                                        <div key={item.field} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                            <span className="font-medium text-gray-700">{item.field}</span>
                                            <span className={`text-gray-800 ${item.column === 'Not detected' ? 'text-red-600' : ''}`}>
                                                {item.column === 'Not detected' ? t('admin.apiIntegrations.googleSheet.notDetected') : item.column}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {validRows.length + invalidRows.length + duplicateRows.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">{t('admin.apiIntegrations.googleSheet.previewTitle')}</h3>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-700">{t('admin.apiIntegrations.googleSheet.valid')}: {validRows.length}</span>
                                    <span className="px-3 py-1 rounded bg-amber-50 text-amber-700">{t('admin.apiIntegrations.googleSheet.duplicates')}: {duplicateRows.length}</span>
                                    <span className="px-3 py-1 rounded bg-red-50 text-red-700">{t('admin.apiIntegrations.googleSheet.invalid')}: {invalidRows.length}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-gray-900">{t('admin.apiIntegrations.googleSheet.connectedSheetsTitle')}</h3>
                                <p className="text-sm text-gray-500">{t('admin.apiIntegrations.googleSheet.connectedSheetsHelp')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => syncConnection(null)}
                                disabled={syncingAll || connectedSheets.length === 0}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {syncingAll ? t('admin.apiIntegrations.googleSheet.importing') : t('admin.apiIntegrations.googleSheet.syncAll')}
                            </button>
                        </div>

                        {connectedSheets.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                                {t('admin.apiIntegrations.googleSheet.noConnectedSheets')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {connectedSheets.map((sheet) => (
                                    <div key={sheet.key} className="rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 truncate">{sheet.sheet_name || sheet.sheet_id}</p>
                                            <p className="text-sm text-slate-500">
                                                {t('admin.apiIntegrations.googleSheet.tabLabel')}: <span className="font-medium text-slate-700">{sheet.tab}</span>
                                            </p>
                                            <p className="text-xs text-emerald-700 mt-1">
                                                {t('admin.apiIntegrations.googleSheet.autoSyncActive')}
                                                {sheet.last_sync_at
                                                    ? ` · ${t('admin.apiIntegrations.googleSheet.lastSync')}: ${new Date(sheet.last_sync_at).toLocaleString()}`
                                                    : ''}
                                            </p>
                                            {sheet.last_sync_message && (
                                                <p className="text-xs text-slate-500 mt-1">{sheet.last_sync_message}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => syncConnection(sheet.key)}
                                                disabled={syncingKey === sheet.key || syncingAll}
                                                className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                {syncingKey === sheet.key
                                                    ? t('admin.apiIntegrations.googleSheet.importing')
                                                    : t('admin.apiIntegrations.googleSheet.syncNow')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeConnection(sheet.key)}
                                                className="px-3 py-2 text-sm bg-white border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50"
                                            >
                                                {t('admin.apiIntegrations.googleSheet.removeConnection')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3 h-fit">
                    <h3 className="text-base font-semibold text-gray-900">{t('admin.apiIntegrations.howItWorks')}</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>{t('admin.apiIntegrations.googleSheet.howItWorks1')}</li>
                        <li>{t('admin.apiIntegrations.googleSheet.howItWorks2')}</li>
                        <li>{t('admin.apiIntegrations.googleSheet.howItWorks3')}</li>
                        <li>{t('admin.apiIntegrations.googleSheet.howItWorks4')}</li>
                        <li>{t('admin.apiIntegrations.googleSheet.howItWorks5')}</li>
                    </ul>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-sm text-emerald-800">
                        {t('admin.apiIntegrations.googleSheet.supportedAliases')}
                    </div>
                </div>
            </div>
        </div>
    );
}
