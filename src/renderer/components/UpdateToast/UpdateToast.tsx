import * as React from 'react';
import { UpdateState } from '../../../shared/types';
import './UpdateToast.css';

interface UpdateToastProps {
  updateState: UpdateState;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateToast: React.FC<UpdateToastProps> = ({
  updateState,
  onDownload,
  onInstall,
  onDismiss,
}) => {
  const { status, info, progress, error } = updateState;

  // Don't show for these statuses
  if (status === 'idle' || status === 'not-available' || status === 'dev-mode') {
    return null;
  }

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="update-toast-content">
            <span className="update-toast-icon">🔄</span>
            <span className="update-toast-message">Checking for updates...</span>
          </div>
        );

      case 'available':
        return (
          <div className="update-toast-content">
            <span className="update-toast-icon">🎉</span>
            <div className="update-toast-text">
              <span className="update-toast-message">Update available</span>
              <span className="update-toast-version">v{info?.version}</span>
            </div>
            <button className="update-toast-button download" onClick={onDownload}>
              Download
            </button>
          </div>
        );

      case 'downloading':
        return (
          <div className="update-toast-content">
            <span className="update-toast-icon">⬇️</span>
            <div className="update-toast-text">
              <span className="update-toast-message">Downloading update...</span>
              <span className="update-toast-percent">{Math.round(progress?.percent || 0)}%</span>
            </div>
            <div className="update-toast-progress" role="progressbar" aria-valuenow={progress?.percent || 0}>
              <div
                className="update-toast-progress-bar"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="update-toast-content">
            <span className="update-toast-icon">✅</span>
            <div className="update-toast-text">
              <span className="update-toast-message">Update ready!</span>
              <span className="update-toast-version">v{info?.version}</span>
            </div>
            <button className="update-toast-button install" onClick={onInstall}>
              Restart Now
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="update-toast-content error">
            <span className="update-toast-icon">❌</span>
            <div className="update-toast-text">
              <span className="update-toast-message">Update failed</span>
              <span className="update-toast-error">{error}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="update-toast">
      {renderContent()}
      <button
        className="update-toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
