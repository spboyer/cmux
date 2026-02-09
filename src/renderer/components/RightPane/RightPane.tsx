import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAppState, getActiveAgent } from '../../contexts/AppStateContext';
import { FileTree } from './FileTree';
import { Icon } from '../Icon';
import { useContextMenu } from '../../hooks/useContextMenu';

interface RightPaneProps {
  onFileClick: (filePath: string, fileName: string) => void;
}

interface RightPaneMenuTarget {
  conversationId: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RightPane({ onFileClick }: RightPaneProps) {
  const { state, dispatch } = useAppState();
  const activeAgent = getActiveAgent(state);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu<RightPaneMenuTarget>();

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFileClick = (filePath: string) => {
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    onFileClick(filePath, fileName);
  };

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.select(), 0);
    }
  }, [renamingId]);

  // Close context menu on click outside — handled by useContextMenu hook

  const handleConversationClick = async (id: string) => {
    if (id === state.activeConversationId) return;
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: { id } });
    const data = await window.electronAPI.conversation.load(id);
    if (data) {
      dispatch({ type: 'SET_CHAT_MESSAGES', payload: { messages: data.messages } });
      if (data.model) {
        dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: data.model } });
      }
    }
  };

  const handleNewConversation = () => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: { id: null } });
    // Reset to last-used model for new conversations
    const lastUsed = localStorage.getItem('lastUsedModel');
    if (lastUsed) {
      dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: lastUsed } });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    openContextMenu(e, { conversationId });
  };

  const handleRenameStart = () => {
    const conv = state.conversations.find(c => c.id === contextMenu.target?.conversationId);
    if (conv) {
      setRenamingId(conv.id);
      setRenameValue(conv.title);
    }
    closeContextMenu();
  };

  const handleRenameComplete = (id: string, newTitle: string | null) => {
    if (newTitle) {
      dispatch({ type: 'RENAME_CONVERSATION', payload: { id, title: newTitle } });
      window.electronAPI.conversation.rename(id, newTitle);
    }
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameComplete(id, renameValue.trim() || null);
    } else if (e.key === 'Escape') {
      setRenamingId(null);
    }
  };

  const handleDelete = () => {
    const id = contextMenu.target?.conversationId;
    if (id) {
      dispatch({ type: 'REMOVE_CONVERSATION', payload: { id } });
      window.electronAPI.conversation.delete(id);
    }
    closeContextMenu();
  };

  if (state.viewMode === 'chat') {
    return (
      <>
        <div className="pane-header">
          <span>Chat</span>
          <button
            className="add-btn"
            onClick={handleNewConversation}
            title="New conversation"
          >
            <Icon name="add" size="sm" />
          </button>
        </div>
        <div className="pane-content">
          {state.conversations.length === 0 ? (
            <p className="empty-message">No conversations yet</p>
          ) : (
            <ul className="conversation-list">
              {state.conversations.map(conv => (
                <li
                  key={conv.id}
                  className={`conversation-item ${state.activeConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => handleConversationClick(conv.id)}
                  onContextMenu={(e) => handleContextMenu(e, conv.id)}
                >
                  {renamingId === conv.id ? (
                    <input
                      ref={renameInputRef}
                      className="conversation-rename-input"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => handleRenameKeyDown(e, conv.id)}
                      onBlur={() => handleRenameComplete(conv.id, renameValue.trim() || null)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="conversation-title">{conv.title}</span>
                      <span className="conversation-time">{formatRelativeTime(conv.updatedAt)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {contextMenu.visible && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={handleRenameStart}>
              <Icon name="ellipsis" size="sm" />
              Rename
            </button>
            <button onClick={handleDelete}>
              <Icon name="close" size="sm" />
              Delete
            </button>
          </div>
        )}
      </>
    );
  }

  if (!activeAgent) {
    return (
      <>
        <div className="pane-header">
          <span>Files</span>
        </div>
        <div className="pane-content">
          <p className="empty-message">No directory selected</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pane-header">
        <span>Files</span>
        <button 
          className="refresh-button" 
          onClick={handleRefresh}
          title="Refresh file tree"
          aria-label="Refresh file tree"
        >
          <Icon name="refresh" size="sm" />
        </button>
      </div>
      <div className="pane-content file-tree-container">
        <FileTree 
          rootPath={activeAgent.cwd} 
          onFileClick={handleFileClick}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </>
  );
}
