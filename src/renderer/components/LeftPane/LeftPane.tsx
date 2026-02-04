import * as React from 'react';
import { useAppState } from '../../contexts/AppStateContext';

interface LeftPaneProps {
  onAddTerminal: () => void;
}

export function LeftPane({ onAddTerminal }: LeftPaneProps) {
  const { state, dispatch } = useAppState();

  const handleTerminalClick = (terminalId: string) => {
    dispatch({ type: 'SET_ACTIVE_TERMINAL', payload: { id: terminalId } });
  };

  const handleFileClick = (fileId: string, terminalId: string) => {
    dispatch({ type: 'SET_ACTIVE_ITEM', payload: { id: fileId, terminalId } });
  };

  return (
    <>
      <div className="pane-header">
        <span>Terminals</span>
        <button className="add-btn" onClick={onAddTerminal}>+</button>
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
                >
                  <span className="terminal-icon">▸</span>
                  <span className="terminal-label">{terminal.label}</span>
                </div>
                {terminal.openFiles.length > 0 && (
                  <ul className="file-list">
                    {terminal.openFiles.map(file => (
                      <li
                        key={file.id}
                        className={`file-item ${state.activeItemId === file.id ? 'active' : ''}`}
                        onClick={() => handleFileClick(file.id, terminal.id)}
                      >
                        <span className="file-icon">📄</span>
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
    </>
  );
}
