import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
import api from '../utils/api';

export default function DeliveryCompanyModal({ isOpen, onClose, onConfirm, orderId }) {
    const [deliveryCompanies, setDeliveryCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchDeliveryCompanies();
            setSelectedCompanyId(null);
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

    const handleConfirm = async () => {
        if (!selectedCompanyId) {
            setError('Please select a delivery company');
            return;
        }

        setSubmitting(true);
        try {
            await onConfirm(selectedCompanyId);
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

    if (!isOpen) return null;

    const hasCompanies = deliveryCompanies.length > 0;
    const showFooter = !loading && hasCompanies;

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
                        <Truck className="text-white" size={24} />
                        <h3 className="text-xl font-semibold text-white">
                            Select Delivery Company
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

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
                                    <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {deliveryCompanies.map((company) => (
                                    <label
                                        key={company.id}
                                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            selectedCompanyId === company.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="delivery_company"
                                            value={company.id}
                                            checked={selectedCompanyId === company.id}
                                            onChange={() => {
                                                setSelectedCompanyId(company.id);
                                                setError(null);
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="ml-3 flex-1 flex items-center justify-between">
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
                                            <Truck 
                                                className={selectedCompanyId === company.id ? 'text-blue-600' : 'text-gray-400'} 
                                                size={20} 
                                            />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {showFooter && (
                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedCompanyId || submitting}
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

                {/* Footer for error state */}
                {!loading && !hasCompanies && (
                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
