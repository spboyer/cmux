import * as React from 'react';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction } from '../../shared/types';
import { agentReducer } from './agentReducer';
import { conversationReducer } from './conversationReducer';

export const initialState: AppState = {
  agents: [],
  activeItemId: null,
  activeAgentId: null,
  viewMode: 'agents',
  conversations: [],
  activeConversationId: null,
  chatMessages: [],
  chatLoading: false,
  availableModels: [],
  selectedModel: null,
  agentEvents: {},
  agentNotes: {},
  showHiddenFiles: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_AGENT':
    case 'REMOVE_AGENT':
    case 'SET_ACTIVE_AGENT':
    case 'SET_ACTIVE_ITEM':
    case 'ADD_FILE':
    case 'REMOVE_FILE':
    case 'RENAME_AGENT':
    case 'SET_VIEW_MODE':
    case 'SET_AGENT_STATUS':
    case 'SET_AGENT_HAS_SESSION':
    case 'ADD_AGENT_EVENT':
    case 'CLEAR_AGENT_EVENTS':
    case 'SET_AGENT_NOTES':
    case 'SET_SHOW_HIDDEN_FILES':
      return agentReducer(state, action);

    case 'ADD_CHAT_MESSAGE':
    case 'APPEND_CHAT_CHUNK':
    case 'SET_CHAT_LOADING':
    case 'SET_CONVERSATIONS':
    case 'ADD_CONVERSATION':
    case 'REMOVE_CONVERSATION':
    case 'RENAME_CONVERSATION':
    case 'SET_ACTIVE_CONVERSATION':
    case 'SET_CHAT_MESSAGES':
    case 'SET_AVAILABLE_MODELS':
    case 'SET_SELECTED_MODEL':
      return conversationReducer(state, action);

    default:
      return state;
  }
}

// Selectors
export function getActiveAgent(state: AppState) {
  return state.agents.find(a => a.id === state.activeAgentId) ?? null;
}

export function getActiveItem(state: AppState) {
  const agent = state.agents.find(a => a.id === state.activeItemId);
  if (agent) {
    return { type: 'agent' as const, item: agent };
  }

  for (const a of state.agents) {
    const file = a.openFiles.find(f => f.id === state.activeItemId);
    if (file) {
      return { type: 'file' as const, item: file, agent: a };
    }
  }

  return null;
}

export function getFilesForAgent(state: AppState, agentId: string) {
  const agent = state.agents.find(a => a.id === agentId);
  return agent?.openFiles ?? [];
}

// Context
interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

interface AppStateProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

export function AppStateProvider({ children, initialState: customInitialState }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, customInitialState ?? initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
