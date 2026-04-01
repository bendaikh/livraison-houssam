import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '../../utils/api';

const EMPTY_FORM = {
    phone_number: '',
    reason: '',
    cancellation_timing: 'before_confirmation',
};

export default function BlacklistPage() {
    const { t } = useTranslation();
    const [entries, setEntries] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchEntries();
    }, [search]);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await api.get('/blacklist', {
                params: {
                    search: search || undefined,
                    per_page: 50,
                },
            });
            setEntries(response.data.data || []);
        } catch (error) {
            console.error('Error loading blacklist entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingEntry(null);
        setFormData(EMPTY_FORM);
        setErrors({});
    };

    const startEditing = (entry) => {
        setEditingEntry(entry);
        setFormData({
            phone_number: entry.phone_number || '',
            reason: entry.reason || '',
            cancellation_timing: entry.cancellation_timing || 'before_confirmation',
        });
        setErrors({});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});

        try {
            setSaving(true);

            if (editingEntry) {
                await api.put(`/blacklist/${editingEntry.id}`, formData);
            } else {
                await api.post('/blacklist', formData);
            }

            resetForm();
            await fetchEntries();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                alert(error.response?.data?.message || t('admin.blacklist.saveFailed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry) => {
        if (!window.confirm(t('admin.blacklist.deleteConfirm', { phone: entry.phone_number }))) {
            return;
        }

        try {
            await api.delete(`/blacklist/${entry.id}`);
            if (editingEntry?.id === entry.id) {
                resetForm();
            }
            await fetchEntries();
        } catch (error) {
            console.error('Error deleting blacklist entry:', error);
            alert(error.response?.data?.message || t('admin.blacklist.deleteFailed'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                            <Ban size={22} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('admin.blacklist.title')}</h1>
                            <p className="text-slate-500">{t('admin.blacklist.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('admin.blacklist.searchPlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3"
                    />
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingEntry ? t('admin.blacklist.editEntry') : t('admin.blacklist.addNumber')}
                            </h2>
                            <p className="text-sm text-slate-500">{t('admin.blacklist.manageDescription')}</p>
                        </div>
                        {editingEntry && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl border border-slate-300 p-2 text-slate-500 hover:bg-slate-50"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.blacklist.phoneNumber')}</label>
                            <input
                                type="text"
                                value={formData.phone_number}
                                onChange={(event) => setFormData((prev) => ({ ...prev, phone_number: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                placeholder="06XXXXXXXX"
                            />
                            {errors.phone_number && <p className="mt-1 text-xs text-rose-600">{errors.phone_number[0]}</p>}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.blacklist.cancellationTiming')}</label>
                            <select
                                value={formData.cancellation_timing}
                                onChange={(event) => setFormData((prev) => ({ ...prev, cancellation_timing: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            >
                                <option value="before_confirmation">{t('admin.blacklist.beforeConfirmation')}</option>
                                <option value="after_confirmation">{t('admin.blacklist.afterConfirmation')}</option>
                            </select>
                            {errors.cancellation_timing && <p className="mt-1 text-xs text-rose-600">{errors.cancellation_timing[0]}</p>}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.blacklist.reason')}</label>
                            <textarea
                                rows="5"
                                value={formData.reason}
                                onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                placeholder={t('admin.blacklist.reasonPlaceholder')}
                            />
                            {errors.reason && <p className="mt-1 text-xs text-rose-600">{errors.reason[0]}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            <Plus size={16} />
                            <span>{saving ? t('admin.common.saving') : editingEntry ? t('admin.blacklist.updateEntry') : t('admin.blacklist.addToBlacklist')}</span>
                        </button>
                    </form>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">{t('admin.blacklist.blockedNumbers')}</h2>
                        <p className="text-sm text-slate-500">{entries.length} {t('admin.blacklist.entriesLoaded')}</p>
                    </div>

                    {loading ? (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">{t('admin.common.loading')}</div>
                    ) : entries.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">{t('admin.blacklist.noEntries')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('admin.blacklist.phone')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('admin.blacklist.reason')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('admin.blacklist.whenCancelled')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('admin.common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{entry.phone_number}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{entry.reason}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {entry.cancellation_timing === 'before_confirmation' 
                                                    ? t('admin.blacklist.beforeConfirmation') 
                                                    : t('admin.blacklist.afterConfirmation')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(entry)}
                                                        className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(entry)}
                                                        className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
