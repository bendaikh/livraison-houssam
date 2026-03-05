import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, MapPin } from 'lucide-react';
import api from '../utils/api';

export default function DeliveryCompanyModal({ isOpen, onClose, onConfirm, orderId }) {
    const [step, setStep] = useState(1); // 1 = select company, 2 = select city
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchDeliveryCompanies();
            setStep(1);
            setSelectedCompanyId(null);
            setSelectedCity('');
            setCities([]);
            setCitySearch('');
            setError(null);
        }
    }, [isOpen]);

    const fetchDeliveryCompanies = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/orders/delivery-companies/available');
            setDeliveryCompanies(response.data);
            
            if (response.data.length === 0) {
                setError('No active delivery companies found. Please configure delivery integrations first.');
            }
        } catch (err) {
            console.error('Error fetching delivery companies:', err);
            setError('Failed to load delivery companies. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCities = async (companyId) => {
        try {
            setLoadingCities(true);
            setError(null);
            const response = await api.get(`/orders/delivery-companies/${companyId}/cities`);
            
            // Response may be array of objects or array of strings
            const cityList = response.data;
            setCities(cityList);
            
            if (cityList.length === 0) {
                setError('No cities available for this delivery company');
            }
        } catch (err) {
            console.error('Error fetching cities:', err);
            setError('Failed to load cities. Please try again.');
        } finally {
            setLoadingCities(false);
        }
    };

    const handleCompanySelect = async (companyId) => {
        setSelectedCompanyId(companyId);
        setCitySearch('');
        setError(null);
        setStep(2);
        await fetchCities(companyId);
    };

    const handleBack = () => {
        setStep(1);
        setSelectedCity('');
        setCities([]);
        setCitySearch('');
        setError(null);
    };

    const handleConfirm = async () => {
        if (!selectedCity) {
            setError('Please select a city');
            return;
        }

        setSubmitting(true);
        try {
            await onConfirm(selectedCompanyId, selectedCity);
            onClose();
        } catch (err) {
            console.error('Error confirming order:', err);
            setError(err.response?.data?.message || 'Failed to send order to delivery company');
        } finally {
            setSubmitting(false);
        }
    };

    const getProviderLogo = (provider) => {
        const logos = {
            bmdelivery: 'https://bmdelivery.ma/assets/img/logo.png',
            tawsilex: 'https://tawsilex.com/assets/img/logo.png',
        };
        return logos[provider] || null;
    };

    const getCityName = (city) => {
        // Handle if city is object with 'name' property or just a string
        return typeof city === 'object' ? (city.name || city.ville || city.city || 'Unknown') : city;
    };

    if (!isOpen) return null;

    const hasCompanies = deliveryCompanies.length > 0;
    const selectedCompany = deliveryCompanies.find(c => c.id === selectedCompanyId);
    const filteredCities = cities.filter((city) =>
        getCityName(city).toLowerCase().includes(citySearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Background overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {step === 1 ? (
                            <Truck className="text-white" size={24} />
                        ) : (
                            <MapPin className="text-white" size={24} />
                        )}
                        <h3 className="text-xl font-semibold text-white">
                            {step === 1 ? 'Select Delivery Company' : 'Select Delivery City'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    {step === 1 && (
                        <>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-500 text-sm">Loading delivery companies...</p>
                                </div>
                            ) : error && !hasCompanies ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm text-red-800 font-medium">Error</p>
                                        <p className="text-sm text-red-700 mt-1">{error}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-gray-600 mb-4">
                                        Choose which delivery company should handle this order:
                                    </p>

                                    <div className="space-y-3">
                                        {deliveryCompanies.map((company) => (
                                            <div
                                                key={company.id}
                                                onClick={() => handleCompanySelect(company.id)}
                                                className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                            >
                                                <div className="flex-1 flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        {getProviderLogo(company.provider) && (
                                                            <img
                                                                src={getProviderLogo(company.provider)}
                                                                alt={company.name}
                                                                className="h-8 w-auto object-contain"
                                                                onError={(e) => e.target.style.display = 'none'}
                                                            />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {company.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 capitalize">
                                                                {company.provider}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Truck className="text-gray-400" size={20} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            {loadingCities ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-500 text-sm">Loading cities...</p>
                                </div>
                            ) : (
                                <>
                                    {selectedCompany && (
                                        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center space-x-2">
                                            <Truck className="text-blue-600" size={18} />
                                            <span className="text-sm text-blue-900 font-medium">
                                                {selectedCompany.name}
                                            </span>
                                        </div>
                                    )}

                                    <p className="text-gray-600 mb-4">
                                        Select the client's delivery city:
                                    </p>

                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={citySearch}
                                            onChange={(e) => setCitySearch(e.target.value)}
                                            placeholder="Search city..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
                                            <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
                                            <p className="text-sm text-red-700">{error}</p>
                                        </div>
                                    )}

                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                                        {filteredCities.length === 0 && (
                                            <div className="px-4 py-3 text-sm text-gray-500">
                                                No cities found.
                                            </div>
                                        )}
                                        {filteredCities.map((city, index) => {
                                            const cityName = getCityName(city);
                                            return (
                                                <label
                                                    key={index}
                                                    className={`flex items-center px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                                                        selectedCity === cityName
                                                            ? 'bg-blue-50 text-blue-900'
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="delivery_city"
                                                        value={cityName}
                                                        checked={selectedCity === cityName}
                                                        onChange={() => {
                                                            setSelectedCity(cityName);
                                                            setError(null);
                                                        }}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                                        {cityName}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {step === 1 && !loading && !hasCompanies && (
                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Close
                        </button>
                    </div>
                )}

                {step === 2 && !loadingCities && (
                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                        <button
                            onClick={handleBack}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedCity || submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Confirming...</span>
                                </>
                            ) : (
                                <>
                                    <Truck size={16} />
                                    <span>Confirm & Send</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
