// Currency formatting utility for frontend
// Provides consistent currency formatting across the application using Intl.NumberFormat

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'SAR', 'EGP'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Format a number as currency with proper symbol and decimal places
 * 
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (USD, EUR, SAR, EGP)
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(1234.56, 'USD', 'en-US') // "$1,234.56"
 */
export const formatCurrency = (
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
): string => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        // Fallback if currency code is invalid
        console.warn(`Invalid currency code: ${currency}`, error);
        return `${amount.toFixed(2)} ${currency}`;
    }
};

/**
 * Format currency for RTL languages (Arabic)
 * 
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code
 * @returns Formatted currency string with RTL support
 */
export const formatCurrencyRTL = (
    amount: number,
    currency: string = 'USD'
): string => {
    return formatCurrency(amount, currency, 'ar-EG');
};

/**
 * Get currency symbol for a given currency code
 * 
 * @param currency - ISO 4217 currency code
 * @returns Currency symbol (e.g., "$", "€", "ج.م.")
 */
export const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        SAR: 'ر.س',
        EGP: 'ج.م',
    };
    return symbols[currency] || currency;
};

/**
 * Parse a formatted currency string back to a number
 * 
 * @param formattedAmount - Formatted currency string
 * @returns Numeric value
 */
export const parseCurrency = (formattedAmount: string): number => {
    // Remove all non-numeric characters except decimal point and minus sign
    const cleaned = formattedAmount.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
};
