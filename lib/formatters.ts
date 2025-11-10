import { Currency } from "../types";

export const formatCurrency = (value: number, currency: Currency): string => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch (e) {
        // Fallback for any unsupported currency or error
        const symbols: Record<Currency, string> = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        }
        return `${symbols[currency] || '$'}${value.toFixed(2)}`;
    }
};
