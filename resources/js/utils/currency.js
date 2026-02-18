/**
 * Currency Formatter Utility
 * 
 * This utility provides currency formatting functions that work both
 * with the SettingsContext and as standalone utilities.
 */

/**
 * Format a number as currency using provided settings
 * @param {number} amount - The amount to format
 * @param {object} settings - Currency settings object
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, settings = {}) {
    if (!amount && amount !== 0) return '';
    
    const {
        currency_symbol = 'DH',
        currency_position = 'after',
        currency_decimals = 2,
        currency_decimal_separator = '.',
        currency_thousand_separator = ','
    } = settings;
    
    const numAmount = parseFloat(amount);
    
    // Format the number with decimals
    const parts = numAmount.toFixed(parseInt(currency_decimals)).split('.');
    
    // Add thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency_thousand_separator);
    
    // Join with decimal separator
    const formattedNumber = parts.join(currency_decimal_separator);
    
    // Add currency symbol
    return currency_position === 'before'
        ? `${currency_symbol}${formattedNumber}`
        : `${formattedNumber} ${currency_symbol}`;
}

/**
 * Parse a formatted currency string back to a number
 * @param {string} formattedCurrency - The formatted currency string
 * @param {object} settings - Currency settings object
 * @returns {number} Parsed number value
 */
export function parseCurrency(formattedCurrency, settings = {}) {
    if (!formattedCurrency) return 0;
    
    const {
        currency_symbol = 'DH',
        currency_decimal_separator = '.',
        currency_thousand_separator = ','
    } = settings;
    
    // Remove currency symbol and spaces
    let numStr = formattedCurrency.replace(currency_symbol, '').trim();
    
    // Remove thousand separators
    numStr = numStr.replace(new RegExp(`\\${currency_thousand_separator}`, 'g'), '');
    
    // Replace decimal separator with standard dot
    numStr = numStr.replace(currency_decimal_separator, '.');
    
    return parseFloat(numStr) || 0;
}

/**
 * Format a number with thousand separators (no currency symbol)
 * @param {number} number - The number to format
 * @param {string} separator - The thousand separator
 * @returns {string} Formatted number string
 */
export function formatNumber(number, separator = ',') {
    if (!number && number !== 0) return '0';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Get currency symbol from code
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
    const symbols = {
        'MAD': 'DH',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'AED': 'د.إ',
        'SAR': '﷼',
        'EGP': 'E£',
    };
    
    return symbols[currencyCode] || currencyCode;
}

/**
 * Common currency presets
 */
export const CURRENCY_PRESETS = {
    MAD: {
        currency_code: 'MAD',
        currency_symbol: 'DH',
        currency_position: 'after',
        currency_decimals: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
    },
    USD: {
        currency_code: 'USD',
        currency_symbol: '$',
        currency_position: 'before',
        currency_decimals: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
    },
    EUR: {
        currency_code: 'EUR',
        currency_symbol: '€',
        currency_position: 'before',
        currency_decimals: 2,
        currency_decimal_separator: ',',
        currency_thousand_separator: '.',
    },
    GBP: {
        currency_code: 'GBP',
        currency_symbol: '£',
        currency_position: 'before',
        currency_decimals: 2,
        currency_decimal_separator: '.',
        currency_thousand_separator: ',',
    },
};
