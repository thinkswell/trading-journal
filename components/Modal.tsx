import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-3xl',
    '2xl': 'md:max-w-4xl',
    '4xl': 'md:max-w-6xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300 animate-fade-in"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className={`glass-modal rounded-none md:rounded-xl shadow-lg p-2 md:p-6 w-full h-full md:h-auto max-w-full md:max-h-[90vh] flex flex-col md:block ${sizeClasses[size]} md:mx-4 animate-scale-in md:overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none md:block">
        {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;