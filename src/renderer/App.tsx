import * as React from 'react';
import { AppStateProvider } from './contexts/AppStateContext';
import { ThreePaneLayout } from './components/Layout';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightPane } from './components/RightPane';
import { useAppState } from './contexts/AppStateContext';

function AppContent() {
  const { dispatch } = useAppState();

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

  const handleFileClick = (filePath: string, fileName: string) => {
    // Will be implemented in Phase 4
  };

  return (
    <ThreePaneLayout
      leftPane={<LeftPane onAddTerminal={handleAddTerminal} />}
      centerPane={<CenterPane />}
      rightPane={<RightPane onFileClick={handleFileClick} />}
    />
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
