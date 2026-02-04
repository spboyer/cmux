import { AppState, AppAction, Terminal } from '../../shared/types';

export const initialState: AppState = {
  terminals: [],
  activeItemId: null,
  activeTerminalId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TERMINAL': {
      const newTerminal: Terminal = {
        id: action.payload.id,
        label: action.payload.label,
        cwd: action.payload.cwd,
        openFiles: [],
      };
      return {
        ...state,
        terminals: [...state.terminals, newTerminal],
        activeItemId: newTerminal.id,
        activeTerminalId: newTerminal.id,
      };
    }

    case 'REMOVE_TERMINAL': {
      const filteredTerminals = state.terminals.filter(t => t.id !== action.payload.id);
      const wasActive = state.activeTerminalId === action.payload.id;
      const newActiveTerminalId = wasActive
        ? filteredTerminals[0]?.id ?? null
        : state.activeTerminalId;
      const newActiveItemId = wasActive ? newActiveTerminalId : state.activeItemId;

      return {
        ...state,
        terminals: filteredTerminals,
        activeItemId: newActiveItemId,
        activeTerminalId: newActiveTerminalId,
      };
    }

    case 'SET_ACTIVE_TERMINAL': {
      return {
        ...state,
        activeItemId: action.payload.id,
        activeTerminalId: action.payload.id,
      };
    }

    case 'SET_ACTIVE_ITEM': {
      return {
        ...state,
        activeItemId: action.payload.id,
        activeTerminalId: action.payload.terminalId ?? state.activeTerminalId,
      };
    }

    case 'ADD_FILE': {
      return {
        ...state,
        terminals: state.terminals.map(t =>
          t.id === action.payload.terminalId
            ? { ...t, openFiles: [...t.openFiles, action.payload.file] }
            : t
        ),
        activeItemId: action.payload.file.id,
      };
    }

    case 'REMOVE_FILE': {
      const wasActive = state.activeItemId === action.payload.fileId;

      return {
        ...state,
        terminals: state.terminals.map(t =>
          t.id === action.payload.terminalId
            ? { ...t, openFiles: t.openFiles.filter(f => f.id !== action.payload.fileId) }
            : t
        ),
        activeItemId: wasActive ? action.payload.terminalId : state.activeItemId,
      };
    }

    case 'RENAME_TERMINAL': {
      return {
        ...state,
        terminals: state.terminals.map(t =>
          t.id === action.payload.id ? { ...t, label: action.payload.label } : t
        ),
      };
    }

    default:
      return state;
  }
}

// Selectors
export function getActiveTerminal(state: AppState) {
  return state.terminals.find(t => t.id === state.activeTerminalId) ?? null;
}

export function getActiveItem(state: AppState) {
  const terminal = state.terminals.find(t => t.id === state.activeItemId);
  if (terminal) {
    return { type: 'terminal' as const, item: terminal };
  }

  for (const t of state.terminals) {
    const file = t.openFiles.find(f => f.id === state.activeItemId);
    if (file) {
      return { type: 'file' as const, item: file, terminal: t };
    }
  }

  return null;
}

export function getFilesForTerminal(state: AppState, terminalId: string) {
  const terminal = state.terminals.find(t => t.id === terminalId);
  return terminal?.openFiles ?? [];
}
