import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        app_name: 'Livraison',
        app_description: 'Admin Panel',
        currency_symbol: 'DH',
        currency_code: 'MAD',
        currency_position: 'after',
        currency_decimals: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.app_name) {
            document.title = `${settings.app_name} - ${settings.app_description}`;
        }
    }, [settings.app_name, settings.app_description]);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            setSettings(prevSettings => ({ ...prevSettings, ...response.data }));
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '';
        
        const numAmount = parseFloat(amount);
        const formattedNumber = numAmount.toFixed(parseInt(settings.currency_decimals))
            .replace('.', settings.currency_decimal_separator)
            .replace(/\B(?=(\d{3})+(?!\d))/g, settings.currency_thousand_separator);
        
        return settings.currency_position === 'before'
            ? `${settings.currency_symbol}${formattedNumber}`
            : `${formattedNumber} ${settings.currency_symbol}`;
    };

    const updateSettings = async (newSettings) => {
        try {
            await api.put('/settings', { settings: newSettings });
            await fetchSettings();
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            loading, 
            formatCurrency, 
            refreshSettings: fetchSettings,
            updateSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
