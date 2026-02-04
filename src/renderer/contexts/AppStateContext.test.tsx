import {
  appReducer,
  initialState,
  getActiveTerminal,
  getActiveItem,
  getFilesForTerminal,
} from './AppStateContext';
import { AppState, OpenFile } from '../../shared/types';

describe('appReducer', () => {
  describe('ADD_TERMINAL', () => {
    it('should add a terminal and set it as active', () => {
      const state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });

      expect(state.terminals).toHaveLength(1);
      expect(state.terminals[0].id).toBe('term-1');
      expect(state.terminals[0].label).toBe('Terminal 1');
      expect(state.terminals[0].cwd).toBe('/home/user');
      expect(state.terminals[0].openFiles).toEqual([]);
      expect(state.activeItemId).toBe('term-1');
      expect(state.activeTerminalId).toBe('term-1');
    });

    it('should add multiple terminals', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-2', label: 'Terminal 2', cwd: '/home/user/project' },
      });

      expect(state.terminals).toHaveLength(2);
      expect(state.activeItemId).toBe('term-2');
      expect(state.activeTerminalId).toBe('term-2');
    });
  });

  describe('REMOVE_TERMINAL', () => {
    it('should remove a terminal', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-2', label: 'Terminal 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'REMOVE_TERMINAL',
        payload: { id: 'term-1' },
      });

      expect(state.terminals).toHaveLength(1);
      expect(state.terminals[0].id).toBe('term-2');
    });

    it('should select next terminal when active terminal is removed', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-2', label: 'Terminal 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'SET_ACTIVE_TERMINAL',
        payload: { id: 'term-1' },
      });
      state = appReducer(state, {
        type: 'REMOVE_TERMINAL',
        payload: { id: 'term-1' },
      });

      expect(state.activeItemId).toBe('term-2');
      expect(state.activeTerminalId).toBe('term-2');
    });

    it('should set activeTerminalId to null when last terminal is removed', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'REMOVE_TERMINAL',
        payload: { id: 'term-1' },
      });

      expect(state.terminals).toHaveLength(0);
      expect(state.activeItemId).toBeNull();
      expect(state.activeTerminalId).toBeNull();
    });
  });

  describe('SET_ACTIVE_TERMINAL', () => {
    it('should set the active terminal', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-2', label: 'Terminal 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'SET_ACTIVE_TERMINAL',
        payload: { id: 'term-1' },
      });

      expect(state.activeItemId).toBe('term-1');
      expect(state.activeTerminalId).toBe('term-1');
    });
  });

  describe('ADD_FILE', () => {
    it('should add a file to a terminal', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });

      const file: OpenFile = {
        id: 'file-1',
        path: '/home/user/test.ts',
        name: 'test.ts',
        parentTerminalId: 'term-1',
      };

      state = appReducer(state, {
        type: 'ADD_FILE',
        payload: { terminalId: 'term-1', file },
      });

      expect(state.terminals[0].openFiles).toHaveLength(1);
      expect(state.terminals[0].openFiles[0].id).toBe('file-1');
      expect(state.activeItemId).toBe('file-1');
    });
  });

  describe('REMOVE_FILE', () => {
    it('should remove a file from a terminal', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });

      const file: OpenFile = {
        id: 'file-1',
        path: '/home/user/test.ts',
        name: 'test.ts',
        parentTerminalId: 'term-1',
      };

      state = appReducer(state, {
        type: 'ADD_FILE',
        payload: { terminalId: 'term-1', file },
      });

      state = appReducer(state, {
        type: 'REMOVE_FILE',
        payload: { terminalId: 'term-1', fileId: 'file-1' },
      });

      expect(state.terminals[0].openFiles).toHaveLength(0);
      expect(state.activeItemId).toBe('term-1');
    });
  });

  describe('RENAME_TERMINAL', () => {
    it('should rename a terminal', () => {
      let state = appReducer(initialState, {
        type: 'ADD_TERMINAL',
        payload: { id: 'term-1', label: 'Terminal 1', cwd: '/home/user' },
      });

      state = appReducer(state, {
        type: 'RENAME_TERMINAL',
        payload: { id: 'term-1', label: 'My Project' },
      });

      expect(state.terminals[0].label).toBe('My Project');
    });
  });
});

describe('selectors', () => {
  describe('getActiveTerminal', () => {
    it('should return null when no terminals exist', () => {
      expect(getActiveTerminal(initialState)).toBeNull();
    });

    it('should return the active terminal', () => {
      const state: AppState = {
        terminals: [
          { id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] },
          { id: 'term-2', label: 'Terminal 2', cwd: '/home/project', openFiles: [] },
        ],
        activeItemId: 'term-2',
        activeTerminalId: 'term-2',
      };

      const result = getActiveTerminal(state);
      expect(result?.id).toBe('term-2');
    });
  });

  describe('getActiveItem', () => {
    it('should return null when no active item', () => {
      expect(getActiveItem(initialState)).toBeNull();
    });

    it('should return terminal when active item is a terminal', () => {
      const state: AppState = {
        terminals: [{ id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [] }],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      const result = getActiveItem(state);
      expect(result?.type).toBe('terminal');
      expect(result?.item.id).toBe('term-1');
    });

    it('should return file when active item is a file', () => {
      const file: OpenFile = {
        id: 'file-1',
        path: '/home/test.ts',
        name: 'test.ts',
        parentTerminalId: 'term-1',
      };

      const state: AppState = {
        terminals: [{ id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [file] }],
        activeItemId: 'file-1',
        activeTerminalId: 'term-1',
      };

      const result = getActiveItem(state);
      expect(result?.type).toBe('file');
      expect(result?.item.id).toBe('file-1');
    });
  });

  describe('getFilesForTerminal', () => {
    it('should return empty array when terminal not found', () => {
      expect(getFilesForTerminal(initialState, 'nonexistent')).toEqual([]);
    });

    it('should return files for terminal', () => {
      const file: OpenFile = {
        id: 'file-1',
        path: '/home/test.ts',
        name: 'test.ts',
        parentTerminalId: 'term-1',
      };

      const state: AppState = {
        terminals: [{ id: 'term-1', label: 'Terminal 1', cwd: '/home', openFiles: [file] }],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      const result = getFilesForTerminal(state, 'term-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file-1');
    });
  });
});
