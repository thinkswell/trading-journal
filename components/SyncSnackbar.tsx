import React from 'react';

interface SyncSnackbarProps {
  visible: boolean;
  message: string;
  isRetrying: boolean;
  showSuccess?: boolean;
  successMessage?: string;
  onRetry: () => void;
}

const SyncSnackbar: React.FC<SyncSnackbarProps> = ({
  visible,
  message,
  isRetrying,
  showSuccess,
  successMessage = 'Synced to cloud successfully.',
  onRetry,
}) => {
  if (!visible && !showSuccess) {
    return null;
  }

  if (showSuccess) {
    return (
      <div
        className="fixed bottom-20 md:bottom-5 right-4 md:right-5 left-4 md:left-auto max-w-md p-4 rounded-xl shadow-lg text-white font-semibold animate-scale-in z-50 bg-[#28A745] border border-[#28A745]/30"
        role="status"
      >
        {successMessage}
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-20 md:bottom-5 right-4 md:right-5 left-4 md:left-auto max-w-md glass-card rounded-xl shadow-lg animate-scale-in z-50 border border-[#DC3545]/40"
      style={{ boxShadow: 'var(--shadow-glow-red)' }}
      role="alert"
    >
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug">{message}</p>
        <p className="text-[#A0A0A0] text-xs mt-1">
          Your changes are saved on this device. Retry when you are back online.
        </p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="px-4 py-2 rounded-lg bg-[#6A5ACD] hover:bg-[#5a4ab8] text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncSnackbar;
