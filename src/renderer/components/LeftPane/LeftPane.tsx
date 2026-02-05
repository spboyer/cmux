import * as React from 'react';
import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { Icon, getFileIcon } from '../Icon';

interface LeftPaneProps {
  onAddTerminal: () => void;
  onCloseTerminal: (id: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  terminalId: string | null;
  fileId: string | null;
}

export function LeftPane({ onAddTerminal, onCloseTerminal }: LeftPaneProps) {
  const { state, dispatch } = useAppState();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    terminalId: null,
    fileId: null,
  });

  const handleTerminalClick = (terminalId: string) => {
    dispatch({ type: 'SET_ACTIVE_TERMINAL', payload: { id: terminalId } });
  };

  const handleFileClick = (fileId: string, terminalId: string) => {
    dispatch({ type: 'SET_ACTIVE_ITEM', payload: { id: fileId, terminalId } });
  };

  const handleTerminalContextMenu = (e: React.MouseEvent, terminalId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      terminalId,
      fileId: null,
    });
  };

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string, terminalId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      terminalId,
      fileId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, terminalId: null, fileId: null });
  };

  const handleCloseTerminal = () => {
    if (contextMenu.terminalId) {
      onCloseTerminal(contextMenu.terminalId);
    }
    closeContextMenu();
  };

  const handleCloseFile = () => {
    if (contextMenu.terminalId && contextMenu.fileId) {
      dispatch({
        type: 'REMOVE_FILE',
        payload: { terminalId: contextMenu.terminalId, fileId: contextMenu.fileId },
      });
    }
    closeContextMenu();
  };

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.visible) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  return (
    <>
      <div className="pane-header">
        <span>Terminals</span>
        <button className="add-btn" onClick={onAddTerminal} title="New Terminal">
          <Icon name="add" size="sm" />
        </button>
      </div>
      <div className="pane-content">
        {state.terminals.length === 0 ? (
          <p className="empty-message">No terminals open</p>
        ) : (
          <ul className="terminal-list">
            {state.terminals.map(terminal => (
              <li key={terminal.id} className="terminal-group">
                <div
                  className={`terminal-item ${state.activeItemId === terminal.id ? 'active' : ''}`}
                  onClick={() => handleTerminalClick(terminal.id)}
                  onContextMenu={(e) => handleTerminalContextMenu(e, terminal.id)}
                >
                  <span className="terminal-icon">
                    <Icon name="terminal" size="sm" />
                  </span>
                  <span className="terminal-label">{terminal.label}</span>
                </div>
                {terminal.openFiles.length > 0 && (
                  <ul className="file-list">
                    {terminal.openFiles.map(file => (
                      <li
                        key={file.id}
                        className={`file-item ${state.activeItemId === file.id ? 'active' : ''}`}
                        onClick={() => handleFileClick(file.id, terminal.id)}
                        onContextMenu={(e) => handleFileContextMenu(e, file.id, terminal.id)}
                      >
                        <span className="file-icon">
                          <Icon name={getFileIcon(file.name)} size="sm" />
                        </span>
                        <span className="file-name">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.fileId ? (
            <button onClick={handleCloseFile}>
              <Icon name="close" size="sm" />
              Close File
            </button>
          ) : (
            <button onClick={handleCloseTerminal}>
              <Icon name="close" size="sm" />
              Close Terminal
            </button>
          )}
        </div>
      )}
    </>
  );
}
