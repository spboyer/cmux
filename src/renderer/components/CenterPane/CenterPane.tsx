import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';
import { AgentView } from './AgentView';
import { FileView } from './FileView';
import { Icon } from '../Icon';

export function CenterPane() {
  const { state } = useAppState();
  const activeItem = getActiveItem(state);
  const agents = state.agents;

  const isShowingFile = activeItem?.type === 'file';
  const isShowingAgent = activeItem?.type === 'agent';

  if (agents.length === 0) {
    return (
      <div className="pane-content center-empty">
        <Icon name="terminal" size={48} />
        <p>Select or create an agent</p>
      </div>
    );
  }

  // Always render both agents and file view to prevent unmounting
  // Use CSS to show/hide based on active item
  return (
    <>
      {/* Agents - always rendered to preserve state */}
      <div 
        className="pane-content agent-pane"
        style={{ display: isShowingAgent ? 'block' : 'none' }}
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
      {isShowingFile && activeItem && (
        <div className="pane-content file-view-pane">
          <FileView 
            filePath={activeItem.item.path}
            fileName={activeItem.item.name}
          />
        </div>
      )}
    </>
  );
}
