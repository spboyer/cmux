import * as React from 'react';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, Agent } from '../../shared/types';

export const initialState: AppState = {
  agents: [],
  activeItemId: null,
  activeAgentId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_AGENT': {
      const newAgent: Agent = {
        id: action.payload.id,
        label: action.payload.label,
        cwd: action.payload.cwd,
        openFiles: [],
        isWorktree: action.payload.isWorktree,
      };
      return {
        ...state,
        agents: [...state.agents, newAgent],
        activeItemId: newAgent.id,
        activeAgentId: newAgent.id,
      };
    }

    case 'REMOVE_AGENT': {
      const filteredAgents = state.agents.filter(a => a.id !== action.payload.id);
      const wasActive = state.activeAgentId === action.payload.id;
      const newActiveAgentId = wasActive
        ? filteredAgents[0]?.id ?? null
        : state.activeAgentId;
      const newActiveItemId = wasActive ? newActiveAgentId : state.activeItemId;

      return {
        ...state,
        agents: filteredAgents,
        activeItemId: newActiveItemId,
        activeAgentId: newActiveAgentId,
      };
    }

    case 'SET_ACTIVE_AGENT': {
      return {
        ...state,
        activeItemId: action.payload.id,
        activeAgentId: action.payload.id,
      };
    }

    case 'SET_ACTIVE_ITEM': {
      return {
        ...state,
        activeItemId: action.payload.id,
        activeAgentId: action.payload.agentId ?? state.activeAgentId,
      };
    }

    case 'ADD_FILE': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.agentId
            ? { ...a, openFiles: [...a.openFiles, action.payload.file] }
            : a
        ),
        activeItemId: action.payload.file.id,
      };
    }

    case 'REMOVE_FILE': {
      const wasActive = state.activeItemId === action.payload.fileId;

      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.agentId
            ? { ...a, openFiles: a.openFiles.filter(f => f.id !== action.payload.fileId) }
            : a
        ),
        activeItemId: wasActive ? action.payload.agentId : state.activeItemId,
      };
    }

    case 'RENAME_AGENT': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.id ? { ...a, label: action.payload.label } : a
        ),
      };
    }

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
