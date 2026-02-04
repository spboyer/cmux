import * as React from 'react';
import { useAppState, getActiveTerminal } from '../../contexts/AppStateContext';

interface RightPaneProps {
  onFileClick: (filePath: string, fileName: string) => void;
}

export function RightPane({ onFileClick }: RightPaneProps) {
  const { state } = useAppState();
  const activeTerminal = getActiveTerminal(state);

  if (!activeTerminal) {
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
      </div>
      <div className="pane-content">
        <div className="file-tree-placeholder">
          <p>Directory: {activeTerminal.cwd}</p>
          <p className="hint">(File tree will be implemented in Phase 4)</p>
        </div>
      </div>
    </>
  );
}
