import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';

export function CenterPane() {
  const { state } = useAppState();
  const activeItem = getActiveItem(state);

  if (!activeItem) {
    return (
      <div className="pane-content center-empty">
        <p>Select or create a terminal</p>
      </div>
    );
  }

  if (activeItem.type === 'terminal') {
    return (
      <div className="pane-content terminal-view">
        <div className="terminal-placeholder">
          <p>Terminal: {activeItem.item.label}</p>
          <p className="cwd">CWD: {activeItem.item.cwd}</p>
        </div>
      </div>
    );
  }

  // File view
  return (
    <div className="pane-content file-view">
      <div className="file-placeholder">
        <p>File: {activeItem.item.name}</p>
        <p className="path">{activeItem.item.path}</p>
      </div>
    </div>
  );
}
