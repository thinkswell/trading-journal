import React, { useState } from 'react';
import Modal from './Modal';
import { Strategy } from '../types';

interface CopyTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (targetStrategyId: string) => void;
  strategies: Strategy[];
  currentStrategyId: string;
  tradeAsset: string;
}

const CopyTradeModal: React.FC<CopyTradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onCopy, 
  strategies, 
  currentStrategyId,
  tradeAsset
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const isCopyingToSameStrategy = selectedStrategyId === currentStrategyId;

  const handleCopy = () => {
    if (selectedStrategyId) {
      onCopy(selectedStrategyId);
      setSelectedStrategyId('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedStrategyId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-2">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-4">Copy Trade</h2>
        <p className="text-[#E0E0E0] mb-6 leading-relaxed">
          Create a copy of <strong className="text-white">{tradeAsset}</strong> in another strategy. The original trade will remain in the current strategy.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Select Target Strategy</label>
          <select
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white bg-[rgba(0,0,0,0.2)]
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] appearance-none cursor-pointer"
          >
            <option value="">Choose a strategy...</option>
            {strategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        {isCopyingToSameStrategy && (
          <div className="mb-6 p-4 rounded-lg bg-[rgba(106,90,205,0.1)] border border-[rgba(106,90,205,0.3)]">
            <p className="text-sm text-[#E0E0E0]">
              <strong className="text-[#6A5ACD]">Note:</strong> This will create a duplicate trade in the same strategy.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={handleClose}
            className="bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={!selectedStrategyId}
            className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                      shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Copy Trade
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CopyTradeModal;

