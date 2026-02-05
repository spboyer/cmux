import * as React from 'react';
import { AppStateProvider } from './contexts/AppStateContext';
import { ThreePaneLayout } from './components/Layout';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightPane } from './components/RightPane';
import { useAppState } from './contexts/AppStateContext';

function AppContent() {
  const { state, dispatch } = useAppState();

  const handleAddTerminal = async () => {
    const directory = await window.electronAPI.openDirectory();
    if (directory) {
      const id = `term-${Date.now()}`;
      const label = directory.split(/[/\\]/).pop() || 'Terminal';
      dispatch({
        type: 'ADD_TERMINAL',
        payload: { id, label, cwd: directory },
      });
    }
  };

  const handleCloseTerminal = (terminalId: string) => {
    window.electronAPI.terminal.kill(terminalId);
    dispatch({ type: 'REMOVE_TERMINAL', payload: { id: terminalId } });
  };

  const handleFileClick = (filePath: string, fileName: string) => {
    // Check if file is already open in the current terminal
    const activeTerminal = state.terminals.find(t => t.id === state.activeTerminalId);
    if (!activeTerminal) return;

    const existingFile = activeTerminal.openFiles.find(f => f.path === filePath);
    if (existingFile) {
      // File already open, just switch to it
      dispatch({ 
        type: 'SET_ACTIVE_ITEM', 
        payload: { id: existingFile.id, terminalId: activeTerminal.id } 
      });
    } else {
      // Open new file
      const fileId = `file-${Date.now()}`;
      dispatch({
        type: 'ADD_FILE',
        payload: {
          terminalId: activeTerminal.id,
          file: {
            id: fileId,
            path: filePath,
            name: fileName,
            parentTerminalId: activeTerminal.id,
          },
        },
      });
      dispatch({ 
        type: 'SET_ACTIVE_ITEM', 
        payload: { id: fileId, terminalId: activeTerminal.id } 
      });
    }
  };

  return (
    <div className="app-container">
      <div className="title-bar">
        <span className="title-bar-text">Multi-Repo Terminal</span>
      </div>
      <div className="app-content">
        <ThreePaneLayout
          leftPane={
            <LeftPane
              onAddTerminal={handleAddTerminal}
              onCloseTerminal={handleCloseTerminal}
            />
          }
          centerPane={<CenterPane />}
          rightPane={<RightPane onFileClick={handleFileClick} />}
        />
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
};

export default App;
