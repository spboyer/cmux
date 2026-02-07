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
  const [renamingAgentId, setRenamingAgentId] = useState<string | null>(null);
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

        // Always restore conversation list
        const conversations = await window.electronAPI.conversation.list();
        if (conversations.length > 0) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: { conversations } });
        }

        if (sessionData && sessionData.agents.length > 0) {
          // Restore each agent
          for (const agent of sessionData.agents) {
            // Create the PTY process and get worktree status
            const result = await window.electronAPI.agent.create(agent.id, agent.cwd);
            
            // Dispatch to add agent to state
            dispatch({
              type: 'ADD_AGENT',
              payload: { 
                id: agent.id, 
                label: agent.label, 
                cwd: agent.cwd,
                isWorktree: result.isWorktree,
              },
            });

            // Restore open files for this agent
            for (const file of agent.openFiles) {
              dispatch({
                type: 'ADD_FILE',
                payload: { agentId: agent.id, file },
              });
            }
          }

          // Restore active item selection
          if (sessionData.activeItemId) {
            dispatch({
              type: 'SET_ACTIVE_ITEM',
              payload: { 
                id: sessionData.activeItemId, 
                agentId: sessionData.activeAgentId ?? undefined 
              },
            });
          }
        }

        // Restore active conversation and its messages
        if (sessionData?.activeConversationId && conversations.some(c => c.id === sessionData.activeConversationId)) {
          dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: { id: sessionData.activeConversationId } });
          const convData = await window.electronAPI.conversation.load(sessionData.activeConversationId);
          if (convData) {
            dispatch({ type: 'SET_CHAT_MESSAGES', payload: { messages: convData.messages } });
            // Restore the conversation's model selection
            if (convData.model) {
              dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: convData.model } });
            }
          }
          // Restore chat view mode if that was the last active view
          if (!sessionData.activeItemId && sessionData.activeConversationId) {
            dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'chat' } });
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
        agents: state.agents,
        activeItemId: state.activeItemId,
        activeAgentId: state.activeAgentId,
        activeConversationId: state.activeConversationId,
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
      const result = await window.electronAPI.agent.create(id, directory);
      dispatch({
        type: 'ADD_AGENT',
        payload: { id, label, cwd: directory, isWorktree: result.isWorktree },
      });
    }
  };

  const handleCloseAgent = (agentId: string) => {
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
        <span className="title-bar-text">Vibe Playground</span>
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
