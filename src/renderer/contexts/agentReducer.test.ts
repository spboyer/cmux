import { agentReducer } from './agentReducer';
import { initialState } from './AppStateContext';
import { AppState, OpenFile } from '../../shared/types';

describe('agentReducer', () => {
  describe('ADD_AGENT', () => {
    it('should add an agent and set it as active', () => {
      const state = agentReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0]).toEqual({
        id: 'agent-1',
        label: 'Agent 1',
        cwd: '/home/user',
        openFiles: [],
        isWorktree: undefined,
        hasSession: undefined,
        status: undefined,
      });
      expect(state.activeItemId).toBe('agent-1');
      expect(state.activeAgentId).toBe('agent-1');
    });

    it('should add agent with session', () => {
      const state = agentReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'a1', label: 'A1', cwd: '/tmp', hasSession: true },
      });

      expect(state.agents[0].hasSession).toBe(true);
      expect(state.agents[0].status).toBe('idle');
    });

    it('should add agent with worktree flag', () => {
      const state = agentReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'a1', label: 'A1', cwd: '/tmp', isWorktree: true },
      });

      expect(state.agents[0].isWorktree).toBe(true);
    });
  });

  describe('REMOVE_AGENT', () => {
    const twoAgentState: AppState = {
      ...initialState,
      agents: [
        { id: 'a1', label: 'A1', cwd: '/tmp/1', openFiles: [] },
        { id: 'a2', label: 'A2', cwd: '/tmp/2', openFiles: [] },
      ],
      activeItemId: 'a1',
      activeAgentId: 'a1',
      agentEvents: { a1: [], a2: [] },
    };

    it('should remove an agent and fallback active to first remaining', () => {
      const state = agentReducer(twoAgentState, {
        type: 'REMOVE_AGENT',
        payload: { id: 'a1' },
      });

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('a2');
      expect(state.activeAgentId).toBe('a2');
      expect(state.activeItemId).toBe('a2');
    });

    it('should set active to null when last agent removed', () => {
      const oneAgent: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [] }],
        activeItemId: 'a1',
        activeAgentId: 'a1',
      };
      const state = agentReducer(oneAgent, {
        type: 'REMOVE_AGENT',
        payload: { id: 'a1' },
      });

      expect(state.agents).toHaveLength(0);
      expect(state.activeAgentId).toBeNull();
      expect(state.activeItemId).toBeNull();
    });

    it('should not change active when non-active agent removed', () => {
      const state = agentReducer(twoAgentState, {
        type: 'REMOVE_AGENT',
        payload: { id: 'a2' },
      });

      expect(state.activeAgentId).toBe('a1');
      expect(state.activeItemId).toBe('a1');
    });

    it('should clean up agentEvents for removed agent', () => {
      const state = agentReducer(twoAgentState, {
        type: 'REMOVE_AGENT',
        payload: { id: 'a1' },
      });

      expect(state.agentEvents).not.toHaveProperty('a1');
      expect(state.agentEvents).toHaveProperty('a2');
    });
  });

  describe('SET_ACTIVE_AGENT', () => {
    it('should set active agent/item and switch viewMode to agents', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [] }],
        viewMode: 'chat',
      };

      const result = agentReducer(state, {
        type: 'SET_ACTIVE_AGENT',
        payload: { id: 'a1' },
      });

      expect(result.activeItemId).toBe('a1');
      expect(result.activeAgentId).toBe('a1');
      expect(result.viewMode).toBe('agents');
    });
  });

  describe('SET_ACTIVE_ITEM', () => {
    it('should set active item and keep current activeAgentId', () => {
      const state: AppState = {
        ...initialState,
        agents: [
          { id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [{ id: 'f1', path: '/f', name: 'f', parentAgentId: 'a1' }] },
        ],
        activeAgentId: 'a1',
      };

      const result = agentReducer(state, {
        type: 'SET_ACTIVE_ITEM',
        payload: { id: 'f1' },
      });

      expect(result.activeItemId).toBe('f1');
      expect(result.activeAgentId).toBe('a1');
      expect(result.viewMode).toBe('agents');
    });

    it('should override activeAgentId when agentId provided', () => {
      const result = agentReducer(initialState, {
        type: 'SET_ACTIVE_ITEM',
        payload: { id: 'f1', agentId: 'a2' },
      });

      expect(result.activeItemId).toBe('f1');
      expect(result.activeAgentId).toBe('a2');
    });
  });

  describe('ADD_FILE', () => {
    it('should add a file to agent and set it active', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [] }],
        activeItemId: 'a1',
      };
      const file: OpenFile = { id: 'f1', path: '/tmp/f.ts', name: 'f.ts', parentAgentId: 'a1' };

      const result = agentReducer(state, {
        type: 'ADD_FILE',
        payload: { agentId: 'a1', file },
      });

      expect(result.agents[0].openFiles).toHaveLength(1);
      expect(result.agents[0].openFiles[0]).toEqual(file);
      expect(result.activeItemId).toBe('f1');
    });
  });

  describe('REMOVE_FILE', () => {
    it('should remove file and revert active to agent when file was active', () => {
      const file: OpenFile = { id: 'f1', path: '/tmp/f.ts', name: 'f.ts', parentAgentId: 'a1' };
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [file] }],
        activeItemId: 'f1',
      };

      const result = agentReducer(state, {
        type: 'REMOVE_FILE',
        payload: { agentId: 'a1', fileId: 'f1' },
      });

      expect(result.agents[0].openFiles).toHaveLength(0);
      expect(result.activeItemId).toBe('a1');
    });

    it('should not change active when non-active file removed', () => {
      const file: OpenFile = { id: 'f1', path: '/tmp/f.ts', name: 'f.ts', parentAgentId: 'a1' };
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [file] }],
        activeItemId: 'a1',
      };

      const result = agentReducer(state, {
        type: 'REMOVE_FILE',
        payload: { agentId: 'a1', fileId: 'f1' },
      });

      expect(result.activeItemId).toBe('a1');
    });
  });

  describe('RENAME_AGENT', () => {
    it('should update agent label', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'Old', cwd: '/tmp', openFiles: [] }],
      };

      const result = agentReducer(state, {
        type: 'RENAME_AGENT',
        payload: { id: 'a1', label: 'New' },
      });

      expect(result.agents[0].label).toBe('New');
    });
  });

  describe('SET_VIEW_MODE', () => {
    it('should set view mode', () => {
      const result = agentReducer(initialState, {
        type: 'SET_VIEW_MODE',
        payload: { mode: 'chat' },
      });
      expect(result.viewMode).toBe('chat');
    });
  });

  describe('SET_AGENT_STATUS', () => {
    it('should update agent status', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [] }],
      };

      const result = agentReducer(state, {
        type: 'SET_AGENT_STATUS',
        payload: { agentId: 'a1', status: 'working' },
      });

      expect(result.agents[0].status).toBe('working');
    });

    it('should only update the targeted agent', () => {
      const state: AppState = {
        ...initialState,
        agents: [
          { id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [], status: 'idle' },
          { id: 'a2', label: 'A2', cwd: '/tmp', openFiles: [], status: 'idle' },
        ],
      };

      const result = agentReducer(state, {
        type: 'SET_AGENT_STATUS',
        payload: { agentId: 'a1', status: 'error' },
      });

      expect(result.agents[0].status).toBe('error');
      expect(result.agents[1].status).toBe('idle');
    });
  });

  describe('SET_AGENT_HAS_SESSION', () => {
    it('should set hasSession true and status idle', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [] }],
      };

      const result = agentReducer(state, {
        type: 'SET_AGENT_HAS_SESSION',
        payload: { agentId: 'a1', hasSession: true },
      });

      expect(result.agents[0].hasSession).toBe(true);
      expect(result.agents[0].status).toBe('idle');
    });

    it('should set hasSession false and clear status', () => {
      const state: AppState = {
        ...initialState,
        agents: [{ id: 'a1', label: 'A1', cwd: '/tmp', openFiles: [], hasSession: true, status: 'working' }],
      };

      const result = agentReducer(state, {
        type: 'SET_AGENT_HAS_SESSION',
        payload: { agentId: 'a1', hasSession: false },
      });

      expect(result.agents[0].hasSession).toBe(false);
      expect(result.agents[0].status).toBeUndefined();
    });
  });

  describe('ADD_AGENT_EVENT', () => {
    it('should append event to agent events', () => {
      const event = { kind: 'session-idle' as const, timestamp: Date.now() };
      const result = agentReducer(initialState, {
        type: 'ADD_AGENT_EVENT',
        payload: { agentId: 'a1', event },
      });

      expect(result.agentEvents['a1']).toHaveLength(1);
      expect(result.agentEvents['a1'][0]).toEqual(event);
    });

    it('should append to existing events', () => {
      const e1 = { kind: 'session-idle' as const, timestamp: 1 };
      const e2 = { kind: 'session-idle' as const, timestamp: 2 };
      const state: AppState = {
        ...initialState,
        agentEvents: { a1: [e1] },
      };

      const result = agentReducer(state, {
        type: 'ADD_AGENT_EVENT',
        payload: { agentId: 'a1', event: e2 },
      });

      expect(result.agentEvents['a1']).toHaveLength(2);
    });
  });

  describe('CLEAR_AGENT_EVENTS', () => {
    it('should clear events for agent', () => {
      const state: AppState = {
        ...initialState,
        agentEvents: {
          a1: [{ kind: 'session-idle' as const, timestamp: 1 }],
          a2: [{ kind: 'session-idle' as const, timestamp: 2 }],
        },
      };

      const result = agentReducer(state, {
        type: 'CLEAR_AGENT_EVENTS',
        payload: { agentId: 'a1' },
      });

      expect(result.agentEvents['a1']).toEqual([]);
      expect(result.agentEvents['a2']).toHaveLength(1);
    });
  });

  describe('SET_SHOW_HIDDEN_FILES', () => {
    it('should set showHiddenFiles to true', () => {
      const result = agentReducer(initialState, {
        type: 'SET_SHOW_HIDDEN_FILES',
        payload: { show: true },
      });

      expect(result.showHiddenFiles).toBe(true);
    });

    it('should set showHiddenFiles to false', () => {
      const state: AppState = {
        ...initialState,
        showHiddenFiles: true,
      };

      const result = agentReducer(state, {
        type: 'SET_SHOW_HIDDEN_FILES',
        payload: { show: false },
      });

      expect(result.showHiddenFiles).toBe(false);
    });
  });

  describe('default', () => {
    it('should return state unchanged for unknown actions', () => {
      const result = agentReducer(initialState, { type: 'UNKNOWN' } as any);
      expect(result).toBe(initialState);
    });
  });
});
