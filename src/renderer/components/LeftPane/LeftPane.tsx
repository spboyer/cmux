import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { Icon, getFileIcon } from '../Icon';

interface LeftPaneProps {
  onAddAgent: () => void;
  onCloseAgent: (id: string) => void;
  renamingAgentId?: string | null;
  onRenameComplete?: (id: string, newLabel: string | null) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  agentId: string | null;
  fileId: string | null;
}

export function LeftPane({ onAddAgent, onCloseAgent, renamingAgentId, onRenameComplete }: LeftPaneProps) {
  const { state, dispatch } = useAppState();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    agentId: null,
    fileId: null,
  });
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Handle rename mode
  useEffect(() => {
    if (renamingAgentId) {
      const agent = state.agents.find(a => a.id === renamingAgentId);
      if (agent) {
        setRenameValue(agent.label);
        setTimeout(() => renameInputRef.current?.select(), 0);
      }
    }
  }, [renamingAgentId, state.agents]);

  const handleRenameKeyDown = (e: React.KeyboardEvent, agentId: string) => {
    if (e.key === 'Enter') {
      onRenameComplete?.(agentId, renameValue.trim() || null);
    } else if (e.key === 'Escape') {
      onRenameComplete?.(agentId, null);
    }
  };

  const handleRenameBlur = (agentId: string) => {
    onRenameComplete?.(agentId, renameValue.trim() || null);
  };

  const handleAgentClick = (agentId: string) => {
    dispatch({ type: 'SET_ACTIVE_AGENT', payload: { id: agentId } });
  };

  const handleFileClick = (fileId: string, agentId: string) => {
    dispatch({ type: 'SET_ACTIVE_ITEM', payload: { id: fileId, agentId } });
  };

  const handleAgentContextMenu = (e: React.MouseEvent, agentId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      agentId,
      fileId: null,
    });
  };

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string, agentId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      agentId,
      fileId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, agentId: null, fileId: null });
  };

  const handleCloseAgent = () => {
    if (contextMenu.agentId) {
      onCloseAgent(contextMenu.agentId);
    }
    closeContextMenu();
  };

  const handleCloseFile = () => {
    if (contextMenu.agentId && contextMenu.fileId) {
      dispatch({
        type: 'REMOVE_FILE',
        payload: { agentId: contextMenu.agentId, fileId: contextMenu.fileId },
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
        <span>Agents</span>
        <button className="add-btn" onClick={onAddAgent} title="New Agent">
          <Icon name="add" size="sm" />
        </button>
      </div>
      <div className="pane-content">
        {/* Persistent Chat button */}
        <div
          className={`chat-nav-item ${state.viewMode === 'chat' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'chat' } })}
        >
          <Icon name="copilot" size="sm" />
          <span className="chat-nav-label">Copilot Chat</span>
        </div>

        {state.agents.length === 0 ? (
          <p className="empty-message">No agents open</p>
        ) : (
          <ul className="agent-list">
            {state.agents.map(agent => (
              <li key={agent.id} className="agent-group">
                <div
                  className={`agent-item ${state.viewMode === 'agents' && state.activeItemId === agent.id ? 'active' : ''}`}
                  onClick={() => handleAgentClick(agent.id)}
                  onContextMenu={(e) => handleAgentContextMenu(e, agent.id)}
                >
                  <span className="agent-icon-wrapper">
                    <Icon name="terminal" size="sm" />
                    {agent.isWorktree && (
                      <span className="worktree-badge" title="Git worktree">
                        <Icon name="git-branch" size={10} />
                      </span>
                    )}
                  </span>
                  {renamingAgentId === agent.id ? (
                    <input
                      ref={renameInputRef}
                      className="agent-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, agent.id)}
                      onBlur={() => handleRenameBlur(agent.id)}
                      autoFocus
                    />
                  ) : (
                    <span className="agent-label">{agent.label}</span>
                  )}
                </div>
                {agent.openFiles.length > 0 && (
                  <ul className="file-list">
                    {agent.openFiles.map(file => (
                      <li
                        key={file.id}
                        className={`file-item ${state.viewMode === 'agents' && state.activeItemId === file.id ? 'active' : ''}`}
                        onClick={() => handleFileClick(file.id, agent.id)}
                        onContextMenu={(e) => handleFileContextMenu(e, file.id, agent.id)}
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
            <button onClick={handleCloseAgent}>
              <Icon name="close" size="sm" />
              Close Agent
            </button>
          )}
        </div>
      )}
    </>
  );
}
