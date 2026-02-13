import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ThreePaneLayout } from './components/Layout';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightPane } from './components/RightPane';
import { HotkeyHelp } from './components/HotkeyHelp';
import { ScratchPad } from './components/ScratchPad';
import { UpdateToast } from './components/UpdateToast';
import { Icon } from './components/Icon';
import { AppStateProvider, useAppState, getActiveItem } from './contexts/AppStateContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { useSessionRestore } from './hooks/useSessionRestore';
import { AgentEvent } from '../shared/types';

function AppContent() {
  const { state, dispatch } = useAppState();
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [showScratchPad, setShowScratchPad] = useState(false);
  const [renamingAgentId, setRenamingAgentId] = useState<string | null>(null);
  const { updateState, isUpdateDismissed, handleDownload: handleDownloadUpdate, handleInstall: handleInstallUpdate, handleDismiss: handleDismissUpdate } = useAutoUpdater();

  // Listen for agent session events from main process
  useEffect(() => {
    const cleanupEvent = window.electronAPI.agentSession.onEvent((agentId: string, event: unknown) => {
      const agentEvent = event as AgentEvent;
      dispatch({ type: 'ADD_AGENT_EVENT', payload: { agentId, event: agentEvent } });

      // Update agent status based on event type
      if (agentEvent.kind === 'tool-start' || agentEvent.kind === 'assistant-delta' || agentEvent.kind === 'subagent-started') {
        dispatch({ type: 'SET_AGENT_STATUS', payload: { agentId, status: 'working' } });
      } else if (agentEvent.kind === 'session-idle') {
        dispatch({ type: 'SET_AGENT_STATUS', payload: { agentId, status: 'idle' } });
      } else if (agentEvent.kind === 'error') {
        dispatch({ type: 'SET_AGENT_STATUS', payload: { agentId, status: 'error' } });
      }
    });

    return () => {
      cleanupEvent();
    };
  }, [dispatch]);

  // Listen for orchestrator-created agents (chat tool calls create_agent)
  useEffect(() => {
    const cleanup = window.electronAPI.agentSession.onAgentCreated((info) => {
      // Register file access for the new agent
      window.electronAPI.fs.addAllowedRoot(info.cwd);
      // Add agent to state with hasSession flag
      dispatch({
        type: 'ADD_AGENT',
        payload: {
          id: info.agentId,
          label: info.label,
          cwd: info.cwd,
          hasSession: true,
        },
      });
    });
    return cleanup;
  }, [dispatch]);

  // Restore session on mount
  useSessionRestore(dispatch);

  // Save session on close
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.electronAPI.session.save({
        agents: state.agents.map(a => ({
          id: a.id,
          label: a.label,
          cwd: a.cwd,
          openFiles: a.openFiles,
          isWorktree: a.isWorktree,
          hasSession: a.hasSession,
        })),
        activeItemId: state.activeItemId,
        activeAgentId: state.activeAgentId,
        activeConversationId: state.activeConversationId,
        agentNotes: state.agentNotes,
        showHiddenFiles: state.showHiddenFiles,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  const handleAddAgent = async () => {
    const directory = await window.electronAPI.openDirectory();
    if (directory) {
      const id = `agent-${Date.now()}`;
      const label = directory.split(/[/\\]/).pop() || 'Agent';
      // Register allowed root BEFORE adding agent so FileTree can access it
      await window.electronAPI.fs.addAllowedRoot(directory);
      // Create agent and get worktree status
      const result = await window.electronAPI.agent.create(
        id, directory, window.electronAPI.config.autoCopilot ? 'copilot' : undefined
      );
      dispatch({
        type: 'ADD_AGENT',
        payload: { id, label, cwd: directory, isWorktree: result.isWorktree },
      });
    }
  };

  const handleCloseAgent = (agentId: string) => {
    const agent = state.agents.find(a => a.id === agentId);
    if (agent?.hasSession) {
      window.electronAPI.agentSession.destroy(agentId);
    }
    window.electronAPI.agent.kill(agentId);
    dispatch({ type: 'REMOVE_AGENT', payload: { id: agentId } });
  };

  // Keyboard shortcut handlers
  const cycleAgent = useCallback((direction: 1 | -1) => {
    if (state.agents.length === 0) return;
    const currentIndex = state.agents.findIndex(a => a.id === state.activeAgentId);
    const nextIndex = (currentIndex + direction + state.agents.length) % state.agents.length;
    dispatch({ type: 'SET_ACTIVE_AGENT', payload: { id: state.agents[nextIndex].id } });
  }, [state.agents, state.activeAgentId, dispatch]);

  const handleCloseCurrentItem = useCallback(() => {
    const activeItem = getActiveItem(state);
    if (!activeItem) return;
    
    if (activeItem.type === 'agent') {
      handleCloseAgent(activeItem.item.id);
    } else if (activeItem.type === 'file') {
      dispatch({
        type: 'REMOVE_FILE',
        payload: { agentId: activeItem.agent.id, fileId: activeItem.item.id },
      });
    }
  }, [state, dispatch]);

  const handleRenameAgent = useCallback(() => {
    if (state.activeAgentId) {
      setRenamingAgentId(state.activeAgentId);
    }
  }, [state.activeAgentId]);

  const shortcuts = useMemo(() => [
    { key: 'Tab', ctrl: true, action: () => cycleAgent(1) },
    { key: 'Tab', ctrl: true, shift: true, action: () => cycleAgent(-1) },
    { key: '\\', ctrl: true, alt: true, action: handleAddAgent },
    { key: 'w', ctrl: true, action: handleCloseCurrentItem },
    { key: 'F2', action: handleRenameAgent },
    { key: '?', ctrl: true, shift: true, action: () => setShowHotkeyHelp(true) },
    { key: 'j', ctrl: true, action: () => setShowScratchPad(prev => !prev) },
  ], [cycleAgent, handleCloseCurrentItem, handleRenameAgent]);

  useKeyboardShortcuts(shortcuts);

  const handleFileClick = (filePath: string, fileName: string) => {
    // Check if file is already open in the current agent
    const activeAgent = state.agents.find(a => a.id === state.activeAgentId);
    if (!activeAgent) return;

    const existingFile = activeAgent.openFiles.find(f => f.path === filePath);
    if (existingFile) {
      // File already open, just switch to it
      dispatch({ 
        type: 'SET_ACTIVE_ITEM', 
        payload: { id: existingFile.id, agentId: activeAgent.id } 
      });
    } else {
      // Open new file
      const fileId = `file-${Date.now()}`;
      dispatch({
        type: 'ADD_FILE',
        payload: {
          agentId: activeAgent.id,
          file: {
            id: fileId,
            path: filePath,
            name: fileName,
            parentAgentId: activeAgent.id,
          },
        },
      });
      dispatch({ 
        type: 'SET_ACTIVE_ITEM', 
        payload: { id: fileId, agentId: activeAgent.id } 
      });
    }
  };

  return (
    <div className="app-container">
      <div className="title-bar">
        <span className="cmux-icon">
          <Icon name="copilot" size={14} />
          <span className="cmux-icon-badge"><Icon name="terminal" size={8} /></span>
        </span>
        <span className="title-bar-text">cmux</span>
      </div>
      <div className="app-content">
        <ThreePaneLayout
          leftPane={
            <LeftPane
              onAddAgent={handleAddAgent}
              onCloseAgent={handleCloseAgent}
              renamingAgentId={renamingAgentId}
              onRenameComplete={(id, newLabel) => {
                if (newLabel) {
                  dispatch({ type: 'RENAME_AGENT', payload: { id, label: newLabel } });
                }
                setRenamingAgentId(null);
              }}
            />
          }
          centerPane={<CenterPane />}
          rightPane={<RightPane onFileClick={handleFileClick} />}
        />
      </div>
      <HotkeyHelp isOpen={showHotkeyHelp} onClose={() => setShowHotkeyHelp(false)} />
      <ScratchPad
        isOpen={showScratchPad && state.viewMode === 'agents' && !!state.activeAgentId}
        onClose={() => setShowScratchPad(false)}
        content={state.activeAgentId ? (state.agentNotes[state.activeAgentId] ?? '') : ''}
        onChange={(content) => {
          if (state.activeAgentId) {
            dispatch({ type: 'SET_AGENT_NOTES', payload: { agentId: state.activeAgentId, content } });
          }
        }}
      />
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
