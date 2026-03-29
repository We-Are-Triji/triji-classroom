import { AlertCircle, RefreshCw, X } from 'lucide-react';

const ErrorModal = ({ isOpen, onClose, title = 'Something went wrong', message, details = '', onRetry }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel compact brutal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Action blocked</p>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-copy">{message}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="status-badge" data-tone="danger">
          <AlertCircle size={16} />
          <span>Nothing was changed.</span>
        </div>

        {details ? (
          <div className="content-panel" style={{ marginTop: 16, background: '#fff1ef' }}>
            <p className="eyebrow">Technical details</p>
            <p className="row-copy" style={{ wordBreak: 'break-word' }}>
              {details}
            </p>
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Close
          </button>
          {onRetry ? (
            <button
              className="secondary-button"
              onClick={() => {
                onRetry();
                onClose();
              }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
