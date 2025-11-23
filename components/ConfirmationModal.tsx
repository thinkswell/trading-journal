import React from 'react';
import Modal from './Modal';
import { formatCurrency } from '../lib/formatters';
import { Currency } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  // Optional strategy deletion details
  openTradesCount?: number;
  closedTradesCount?: number;
  amountInvested?: number;
  currency?: Currency;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmButtonText = 'Confirm Delete',
  openTradesCount,
  closedTradesCount,
  amountInvested,
  currency
}) => {
  const hasStrategyDetails = openTradesCount !== undefined || closedTradesCount !== undefined || amountInvested !== undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-2">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-4">{title}</h2>
        <p className="text-[#E0E0E0] mb-6 leading-relaxed">{message}</p>
        
        {hasStrategyDetails && (
          <div className="mb-8 p-4 rounded-lg bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.3)]">
            <h3 className="text-lg font-semibold text-[#DC3545] mb-3">Strategy Details:</h3>
            <div className="space-y-2 text-[#E0E0E0]">
              {openTradesCount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#A0A0A0]">Open Trades:</span>
                  <span className="font-semibold text-white">{openTradesCount}</span>
                </div>
              )}
              {closedTradesCount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#A0A0A0]">Closed Trades:</span>
                  <span className="font-semibold text-white">{closedTradesCount}</span>
                </div>
              )}
              {amountInvested !== undefined && currency && (
                <div className="flex justify-between items-center">
                  <span className="text-[#A0A0A0]">Amount Invested (Open Positions):</span>
                  <span className="font-semibold text-white">{formatCurrency(amountInvested, currency)}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[rgba(220,53,69,0.3)]">
              <p className="text-sm text-[#DC3545] font-medium">
                ⚠️ This action cannot be undone. All trades and data associated with this strategy will be permanently deleted.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={onClose}
            className="bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-[#DC3545] hover:bg-[#e85d75] text-white font-bold py-3 px-6 rounded-lg 
                      shadow-sm shadow-[#DC3545]/10 hover:shadow-md hover:shadow-[#DC3545]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;