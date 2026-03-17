import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, MapPin, Truck, UserCheck, X } from 'lucide-react';
import api from '../utils/api';

export default function DeliveryCompanyModal({
    isOpen,
    onClose,
    onConfirm,
    preferredCompanyId = null,
    preferredCity = '',
    preferredDeliveryPersonId = null,
}) {
    const [assignmentType, setAssignmentType] = useState('person');
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const companyId = preferredCompanyId ? String(preferredCompanyId) : '';
        const deliveryPersonId = preferredDeliveryPersonId ? String(preferredDeliveryPersonId) : '';

        setAssignmentType(deliveryPersonId ? 'person' : 'company');
        setSelectedPersonId(deliveryPersonId);
        setSelectedCompanyId(companyId);
        setSelectedCity(preferredCity || '');
        setCitySearch('');
        setCities([]);
        setError('');
        fetchAssignmentOptions(companyId);
    }, [isOpen, preferredCity, preferredCompanyId, preferredDeliveryPersonId]);

    const fetchAssignmentOptions = async (companyId = '') => {
        try {
            setLoading(true);
            const [personsResponse, companiesResponse] = await Promise.all([
                api.get('/delivery-persons'),
                api.get('/orders/delivery-companies/available'),
            ]);

            setDeliveryPersons(personsResponse.data || []);
            setDeliveryCompanies(companiesResponse.data || []);

            if (companyId) {
                await fetchCities(companyId);
            }
        } catch (fetchError) {
            console.error('Error loading delivery assignment options:', fetchError);
            setError('Failed to load delivery options.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCities = async (companyId) => {
        if (!companyId) {
            setCities([]);
            return;
        }

        try {
            setLoadingCities(true);
            setError('');
            const response = await api.get(`/orders/delivery-companies/${companyId}/cities`);
            const cityList = Array.isArray(response.data) ? response.data : [];
            setCities(cityList);
            if (cityList.length === 0) {
                setError('No cities are configured for this delivery company.');
            }
        } catch (fetchError) {
            console.error('Error loading delivery company cities:', fetchError);
            setCities([]);
            setError('Failed to load delivery cities.');
        } finally {
            setLoadingCities(false);
        }
    };

    const filteredCities = useMemo(() => {
        return cities.filter((city) => {
            const cityName = typeof city === 'object' ? (city.name || city.ville || city.city || '') : city;
            return cityName.toLowerCase().includes(citySearch.toLowerCase());
        });
    }, [cities, citySearch]);

    const handleCompanyChange = async (companyId) => {
        setSelectedCompanyId(companyId);
        setSelectedCity('');
        setCitySearch('');
        await fetchCities(companyId);
    };

    const handleSubmit = async () => {
        setError('');

        if (assignmentType === 'person') {
            if (!selectedPersonId) {
                setError('Select a delivery person.');
                return;
            }
        } else {
            if (!selectedCompanyId) {
                setError('Select a delivery company.');
                return;
            }

            if (!selectedCity) {
                setError('Select a delivery city.');
                return;
            }
        }

        try {
            setSubmitting(true);
            await onConfirm(
                assignmentType === 'person'
                    ? {
                        delivery_person_id: Number(selectedPersonId),
                        delivery_integration_id: null,
                        delivery_city: null,
                    }
                    : {
                        delivery_person_id: null,
                        delivery_integration_id: Number(selectedCompanyId),
                        delivery_city: selectedCity,
                    }
            );
            onClose();
        } catch (submitError) {
            console.error('Error confirming delivery assignment:', submitError);
            setError(submitError.response?.data?.message || 'Failed to save delivery assignment.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confirm Order</p>
                        <h3 className="text-xl font-bold text-white">Choose delivery type</h3>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setAssignmentType('person')}
                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                                assignmentType === 'person'
                                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-xl p-3 ${assignmentType === 'person' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    <UserCheck size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Delivery person</p>
                                    <p className="text-sm text-slate-500">Assign a specific delivery agent.</p>
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAssignmentType('company')}
                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                                assignmentType === 'company'
                                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-xl p-3 ${assignmentType === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                    <Truck size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Delivery company</p>
                                    <p className="text-sm text-slate-500">Send the order to an integration with tracking.</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            Loading delivery options...
                        </div>
                    ) : assignmentType === 'person' ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">Delivery person</label>
                            <select
                                value={selectedPersonId}
                                onChange={(event) => setSelectedPersonId(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3"
                            >
                                <option value="">Select delivery person</option>
                                {deliveryPersons.map((person) => (
                                    <option key={person.id} value={person.id}>{person.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">Once confirmed, the confirmation agent will no longer be able to change the order status manually.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Delivery company</label>
                                <select
                                    value={selectedCompanyId}
                                    onChange={(event) => handleCompanyChange(event.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3"
                                >
                                    <option value="">Select delivery company</option>
                                    {deliveryCompanies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name} ({company.provider})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedCompanyId && (
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <MapPin size={16} />
                                        <span>Delivery city</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={citySearch}
                                        onChange={(event) => setCitySearch(event.target.value)}
                                        placeholder="Search city..."
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                    />

                                    {loadingCities ? (
                                        <p className="text-sm text-slate-500">Loading cities...</p>
                                    ) : (
                                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                            {filteredCities.length === 0 && (
                                                <div className="px-4 py-3 text-sm text-slate-500">No cities found.</div>
                                            )}
                                            {filteredCities.map((city, index) => {
                                                const cityName = typeof city === 'object'
                                                    ? (city.name || city.ville || city.city || '')
                                                    : city;

                                                return (
                                                    <label
                                                        key={`${cityName}-${index}`}
                                                        className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 ${
                                                            selectedCity === cityName ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="delivery_city"
                                                            checked={selectedCity === cityName}
                                                            onChange={() => setSelectedCity(cityName)}
                                                            className="h-4 w-4"
                                                        />
                                                        <span>{cityName}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {submitting ? 'Saving...' : 'Confirm order'}
                    </button>
                </div>
            </div>
        </div>
    );
}
