import { useEffect, useRef } from 'react';
import { AppAction } from '../../shared/types';

export function useSessionRestore(dispatch: React.Dispatch<AppAction>): void {
  const hasRestoredRef = useRef(false);

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
          for (const agent of sessionData.agents) {
            if (agent.hasSession) {
              await window.electronAPI.fs.addAllowedRoot(agent.cwd);
              await window.electronAPI.agentSession.registerAgent(agent.id, agent.label, agent.cwd);
              dispatch({
                type: 'ADD_AGENT',
                payload: {
                  id: agent.id,
                  label: agent.label,
                  cwd: agent.cwd,
                  hasSession: true,
                },
              });
            } else {
              const result = await window.electronAPI.agent.create(agent.id, agent.cwd);
              dispatch({
                type: 'ADD_AGENT',
                payload: {
                  id: agent.id,
                  label: agent.label,
                  cwd: agent.cwd,
                  isWorktree: result.isWorktree,
                },
              });
            }

            for (const file of agent.openFiles) {
              dispatch({
                type: 'ADD_FILE',
                payload: { agentId: agent.id, file },
              });
            }
          }

          if (sessionData.activeItemId) {
            dispatch({
              type: 'SET_ACTIVE_ITEM',
              payload: {
                id: sessionData.activeItemId,
                agentId: sessionData.activeAgentId ?? undefined,
              },
            });
          }

          // Restore agent notes
          if (sessionData.agentNotes) {
            for (const [agentId, content] of Object.entries(sessionData.agentNotes)) {
              if (content && sessionData.agents.some(a => a.id === agentId)) {
                dispatch({ type: 'SET_AGENT_NOTES', payload: { agentId, content } });
              }
            }
          }

          // Restore hidden files preference
          if (sessionData.showHiddenFiles !== undefined) {
            dispatch({ type: 'SET_SHOW_HIDDEN_FILES', payload: { show: sessionData.showHiddenFiles } });
          }
        }

        // Restore active conversation and its messages
        if (sessionData?.activeConversationId && conversations.some(c => c.id === sessionData.activeConversationId)) {
          dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: { id: sessionData.activeConversationId } });
          const convData = await window.electronAPI.conversation.load(sessionData.activeConversationId);
          if (convData) {
            dispatch({ type: 'SET_CHAT_MESSAGES', payload: { messages: convData.messages } });
            if (convData.model) {
              dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: convData.model } });
            }
          }
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
}
