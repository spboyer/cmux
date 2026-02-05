import * as React from 'react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ThreePaneLayout } from './components/Layout';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightPane } from './components/RightPane';
import { HotkeyHelp } from './components/HotkeyHelp';
import { UpdateToast } from './components/UpdateToast';
import { AppStateProvider, useAppState, getActiveItem } from './contexts/AppStateContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { UpdateState } from '../shared/types';

function AppContent() {
  const { state, dispatch } = useAppState();
  const hasRestoredRef = useRef(false);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [renamingTerminalId, setRenamingTerminalId] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);

  // Set up auto-update listeners
  useEffect(() => {
    const unsubStatus = window.electronAPI.updates.onStatus((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: data.status as UpdateState['status'],
        info: data.info as UpdateState['info'],
        error: data.message,
      }));
      // Reset dismissed state when a new update becomes available or ready
      if (data.status === 'available' || data.status === 'ready') {
        setIsUpdateDismissed(false);
      }
    });

    const unsubProgress = window.electronAPI.updates.onProgress((progress) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        progress,
      }));
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  const handleDownloadUpdate = useCallback(() => {
    window.electronAPI.updates.download();
  }, []);

  const handleInstallUpdate = useCallback(() => {
    window.electronAPI.updates.install();
  }, []);

  const handleDismissUpdate = useCallback(() => {
    setIsUpdateDismissed(true);
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreSession = async () => {
      try {
        const sessionData = await window.electronAPI.session.load();
        if (sessionData && sessionData.terminals.length > 0) {
          // Restore each terminal
          for (const terminal of sessionData.terminals) {
            // Create the PTY process and get worktree status
            const result = await window.electronAPI.terminal.create(terminal.id, terminal.cwd);
            
            // Dispatch to add terminal to state
            dispatch({
              type: 'ADD_TERMINAL',
              payload: { 
                id: terminal.id, 
                label: terminal.label, 
                cwd: terminal.cwd,
                isWorktree: result.isWorktree,
              },
            });

            // Restore open files for this terminal
            for (const file of terminal.openFiles) {
              dispatch({
                type: 'ADD_FILE',
                payload: { terminalId: terminal.id, file },
              });
            }
          }

          // Restore active item selection
          if (sessionData.activeItemId) {
            dispatch({
              type: 'SET_ACTIVE_ITEM',
              payload: { 
                id: sessionData.activeItemId, 
                terminalId: sessionData.activeTerminalId ?? undefined 
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    };

    restoreSession();
  }, [dispatch]);

  // Save session on close
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.electronAPI.session.save({
        terminals: state.terminals,
        activeItemId: state.activeItemId,
        activeTerminalId: state.activeTerminalId,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  const handleAddTerminal = async () => {
    const directory = await window.electronAPI.openDirectory();
    if (directory) {
      const id = `term-${Date.now()}`;
      const label = directory.split(/[/\\]/).pop() || 'Terminal';
      // Register allowed root BEFORE adding terminal so FileTree can access it
      await window.electronAPI.fs.addAllowedRoot(directory);
      // Create terminal and get worktree status
      const result = await window.electronAPI.terminal.create(id, directory);
      dispatch({
        type: 'ADD_TERMINAL',
        payload: { id, label, cwd: directory, isWorktree: result.isWorktree },
      });
    }
  };

  const handleCloseTerminal = (terminalId: string) => {
    window.electronAPI.terminal.kill(terminalId);
    dispatch({ type: 'REMOVE_TERMINAL', payload: { id: terminalId } });
  };

  // Keyboard shortcut handlers
  const cycleTerminal = useCallback((direction: 1 | -1) => {
    if (state.terminals.length === 0) return;
    const currentIndex = state.terminals.findIndex(t => t.id === state.activeTerminalId);
    const nextIndex = (currentIndex + direction + state.terminals.length) % state.terminals.length;
    dispatch({ type: 'SET_ACTIVE_TERMINAL', payload: { id: state.terminals[nextIndex].id } });
  }, [state.terminals, state.activeTerminalId, dispatch]);

  const handleCloseCurrentItem = useCallback(() => {
    const activeItem = getActiveItem(state);
    if (!activeItem) return;
    
    if (activeItem.type === 'terminal') {
      handleCloseTerminal(activeItem.item.id);
    } else if (activeItem.type === 'file') {
      dispatch({
        type: 'REMOVE_FILE',
        payload: { terminalId: activeItem.terminal.id, fileId: activeItem.item.id },
      });
    }
  }, [state, dispatch]);

  const handleRenameTerminal = useCallback(() => {
    if (state.activeTerminalId) {
      setRenamingTerminalId(state.activeTerminalId);
    }
  }, [state.activeTerminalId]);

  const shortcuts = useMemo(() => [
    { key: 'Tab', ctrl: true, action: () => cycleTerminal(1) },
    { key: 'Tab', ctrl: true, shift: true, action: () => cycleTerminal(-1) },
    { key: '\\', ctrl: true, alt: true, action: handleAddTerminal },
    { key: 'w', ctrl: true, action: handleCloseCurrentItem },
    { key: 'F2', action: handleRenameTerminal },
    { key: '?', ctrl: true, shift: true, action: () => setShowHotkeyHelp(true) },
  ], [cycleTerminal, handleCloseCurrentItem, handleRenameTerminal]);

  useKeyboardShortcuts(shortcuts);

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
        <span className="title-bar-text">Vibe Playground</span>
      </div>
      <div className="app-content">
        <ThreePaneLayout
          leftPane={
            <LeftPane
              onAddTerminal={handleAddTerminal}
              onCloseTerminal={handleCloseTerminal}
              renamingTerminalId={renamingTerminalId}
              onRenameComplete={(id, newLabel) => {
                if (newLabel) {
                  dispatch({ type: 'RENAME_TERMINAL', payload: { id, label: newLabel } });
                }
                setRenamingTerminalId(null);
              }}
            />
          }
          centerPane={<CenterPane />}
          rightPane={<RightPane onFileClick={handleFileClick} />}
        />
      </div>
      <HotkeyHelp isOpen={showHotkeyHelp} onClose={() => setShowHotkeyHelp(false)} />
      {!isUpdateDismissed && (
        <UpdateToast
          updateState={updateState}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
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
