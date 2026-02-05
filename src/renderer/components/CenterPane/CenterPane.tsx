import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';
import { TerminalView } from './TerminalView';
import { FileView } from './FileView';
import { Icon } from '../Icon';

export function CenterPane() {
  const { state } = useAppState();
  const activeItem = getActiveItem(state);
  const terminals = state.terminals;

  const isShowingFile = activeItem?.type === 'file';
  const isShowingTerminal = activeItem?.type === 'terminal';

  if (terminals.length === 0) {
    return (
      <div className="pane-content center-empty">
        <Icon name="terminal" size={48} />
        <p>Select or create a terminal</p>
      </div>
    );
  }

  // Always render both terminals and file view to prevent unmounting
  // Use CSS to show/hide based on active item
  return (
    <>
      {/* Terminals - always rendered to preserve state */}
      <div 
        className="pane-content terminal-pane"
        style={{ display: isShowingTerminal ? 'block' : 'none' }}
      >
        {terminals.map(terminal => (
          <TerminalView
            key={terminal.id}
            terminalId={terminal.id}
            cwd={terminal.cwd}
            isActive={state.activeTerminalId === terminal.id && isShowingTerminal}
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
