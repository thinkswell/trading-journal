import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Currency } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';

interface SettingsModalProps {
  onClose: () => void;
}

const currencies: { code: Currency; name: string; symbol: string }[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { currency, setCurrency } = useSettings();

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value as Currency);
  };

  return (
    <div className="p-2">
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-6 flex items-center gap-3">
        <SettingsIcon />
        Settings
      </h2>
      
      <div className="space-y-5">
        <div>
          <label htmlFor="currency-select" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
            Display Currency
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={handleCurrencyChange}
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] appearance-none cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} - {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex justify-end pt-6 border-t border-[rgba(255,255,255,0.1)]">
        <button
          onClick={onClose}
          className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                    shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;