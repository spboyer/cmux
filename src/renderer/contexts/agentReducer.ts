import { AppState, AppAction, Agent } from '../../shared/types';

type AgentAction = Extract<AppAction,
  | { type: 'ADD_AGENT' }
  | { type: 'REMOVE_AGENT' }
  | { type: 'SET_ACTIVE_AGENT' }
  | { type: 'SET_ACTIVE_ITEM' }
  | { type: 'ADD_FILE' }
  | { type: 'REMOVE_FILE' }
  | { type: 'RENAME_AGENT' }
  | { type: 'SET_VIEW_MODE' }
  | { type: 'SET_AGENT_STATUS' }
  | { type: 'SET_AGENT_HAS_SESSION' }
  | { type: 'ADD_AGENT_EVENT' }
  | { type: 'CLEAR_AGENT_EVENTS' }
  | { type: 'SET_AGENT_NOTES' }
  | { type: 'SET_SHOW_HIDDEN_FILES' }
>;

export function agentReducer(state: AppState, action: AgentAction): AppState {
  switch (action.type) {
    case 'ADD_AGENT': {
      const newAgent: Agent = {
        id: action.payload.id,
        label: action.payload.label,
        cwd: action.payload.cwd,
        openFiles: [],
        isWorktree: action.payload.isWorktree,
        hasSession: action.payload.hasSession,
        status: action.payload.hasSession ? 'idle' : undefined,
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
      const { [action.payload.id]: _, ...remainingEvents } = state.agentEvents;
      const { [action.payload.id]: __, ...remainingNotes } = state.agentNotes;

      return {
        ...state,
        agents: filteredAgents,
        activeItemId: newActiveItemId,
        activeAgentId: newActiveAgentId,
        agentEvents: remainingEvents,
        agentNotes: remainingNotes,
      };
    }

    case 'SET_ACTIVE_AGENT':
      return {
        ...state,
        activeItemId: action.payload.id,
        activeAgentId: action.payload.id,
        viewMode: 'agents',
      };

    case 'SET_ACTIVE_ITEM':
      return {
        ...state,
        activeItemId: action.payload.id,
        activeAgentId: action.payload.agentId ?? state.activeAgentId,
        viewMode: 'agents',
      };

    case 'ADD_FILE':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.agentId
            ? { ...a, openFiles: [...a.openFiles, action.payload.file] }
            : a
        ),
        activeItemId: action.payload.file.id,
      };

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

    case 'RENAME_AGENT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.id ? { ...a, label: action.payload.label } : a
        ),
      };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload.mode };

    case 'SET_AGENT_STATUS':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.agentId ? { ...a, status: action.payload.status } : a
        ),
      };

    case 'SET_AGENT_HAS_SESSION':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.agentId
            ? { ...a, hasSession: action.payload.hasSession, status: action.payload.hasSession ? 'idle' : undefined }
            : a
        ),
      };

    case 'ADD_AGENT_EVENT': {
      const existing = state.agentEvents[action.payload.agentId] ?? [];
      return {
        ...state,
        agentEvents: {
          ...state.agentEvents,
          [action.payload.agentId]: [...existing, action.payload.event],
        },
      };
    }

    case 'CLEAR_AGENT_EVENTS':
      return {
        ...state,
        agentEvents: {
          ...state.agentEvents,
          [action.payload.agentId]: [],
        },
      };

    case 'SET_AGENT_NOTES':
      return {
        ...state,
        agentNotes: {
          ...state.agentNotes,
          [action.payload.agentId]: action.payload.content,
        },
      };

    case 'SET_SHOW_HIDDEN_FILES':
      return { ...state, showHiddenFiles: action.payload.show };

    default:
      return state;
  }
}
