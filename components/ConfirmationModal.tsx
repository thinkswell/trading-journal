import React from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText = 'Confirm Delete' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-2">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-4">{title}</h2>
        <p className="text-[#E0E0E0] mb-8 leading-relaxed">{message}</p>
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