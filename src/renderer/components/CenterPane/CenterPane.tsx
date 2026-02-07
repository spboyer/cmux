import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';
import { AgentView } from './AgentView';
import { FileView } from './FileView';
import { ChatView } from './ChatView';
import { Icon } from '../Icon';

export function CenterPane() {
  const { state } = useAppState();
  const activeItem = getActiveItem(state);
  const agents = state.agents;

  const isShowingFile = activeItem?.type === 'file';
  const isShowingAgent = activeItem?.type === 'agent';
  const isShowingChat = state.viewMode === 'chat';

  // Always render both agents and file view to prevent unmounting
  // Use CSS to show/hide based on active item
  return (
    <>
      {/* Chat view */}
      <div
        className="pane-content chat-pane"
        style={{ display: isShowingChat ? 'flex' : 'none' }}
      >
        <ChatView />
      </div>

      {/* Agents - always rendered to preserve state */}
      <div 
        className="pane-content agent-pane"
        style={{ display: !isShowingChat && isShowingAgent ? 'block' : 'none' }}
      >
        {agents.map(agent => (
          <AgentView
            key={agent.id}
            agentId={agent.id}
            cwd={agent.cwd}
            isActive={state.activeAgentId === agent.id && isShowingAgent}
          />
        ))}
      </div>

      {/* File view - only render when a file is selected */}
      {!isShowingChat && isShowingFile && activeItem && (
        <div className="pane-content file-view-pane">
          <FileView 
            filePath={activeItem.item.path}
            fileName={activeItem.item.name}
          />
        </div>
      )}

      {/* Empty state - no agents and not in chat mode */}
      {!isShowingChat && agents.length === 0 && (
        <div className="pane-content center-empty">
          <Icon name="terminal" size={48} />
          <p>Select or create an agent</p>
        </div>
      )}
    </>
  );
}
