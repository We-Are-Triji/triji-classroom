import { AlertTriangle, X } from 'lucide-react';

const toneMap = {
  danger: 'danger',
  warning: 'mustard',
  info: 'sky',
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel compact brutal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Please confirm</p>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-copy">{message}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="status-badge" data-tone={toneMap[type] || 'danger'}>
          <AlertTriangle size={16} />
          <span>This action changes live data for students and staff.</span>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={type === 'danger' ? 'danger-button' : 'secondary-button'}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
