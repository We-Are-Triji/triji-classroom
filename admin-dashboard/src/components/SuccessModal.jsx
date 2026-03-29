import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

const SuccessModal = ({
  isOpen,
  onClose,
  title = 'Saved',
  message,
  autoClose = false,
  autoCloseDelay = 2000,
}) => {
  useEffect(() => {
    if (!isOpen || !autoClose) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, autoCloseDelay);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel compact brutal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">All set</p>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-copy">{message}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="status-badge" data-tone="mint">
          <CheckCircle2 size={16} />
          <span>Your change is live and synced.</span>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
