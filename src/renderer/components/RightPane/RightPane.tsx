import * as React from 'react';
import { useAppState, getActiveAgent } from '../../contexts/AppStateContext';
import { FileTree } from './FileTree';
import { Icon } from '../Icon';

interface RightPaneProps {
  onFileClick: (filePath: string, fileName: string) => void;
}

export function RightPane({ onFileClick }: RightPaneProps) {
  const { state } = useAppState();
  const activeAgent = getActiveAgent(state);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFileClick = (filePath: string) => {
    // Extract filename from path
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    onFileClick(filePath, fileName);
  };

  if (state.viewMode === 'chat') {
    return (
      <>
        <div className="pane-header">
          <span>Chat</span>
        </div>
        <div className="pane-content">
          <p className="empty-message">Conversation history coming soon</p>
        </div>
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
