import * as React from 'react';
import { Icon } from '../Icon';

interface HotkeyHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl + Tab', description: 'Next terminal' },
  { keys: 'Ctrl + Shift + Tab', description: 'Previous terminal' },
  { keys: 'Ctrl + Alt + \\', description: 'New terminal' },
  { keys: 'Ctrl + W', description: 'Close current terminal/file' },
  { keys: 'F2', description: 'Rename terminal' },
  { keys: 'Ctrl + ?', description: 'Show this help' },
  { keys: 'Ctrl + Shift + I', description: 'Open DevTools' },
];

export function HotkeyHelp({ isOpen, onClose }: HotkeyHelpProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content hotkey-help">
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size="sm" />
          </button>
        </div>
        <div className="modal-body">
          <table className="hotkey-table">
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="hotkey-keys">
                    {shortcut.keys.split(' + ').map((key, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="hotkey-separator">+</span>}
                        <kbd>{key}</kbd>
                      </React.Fragment>
                    ))}
                  </td>
                  <td className="hotkey-description">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
