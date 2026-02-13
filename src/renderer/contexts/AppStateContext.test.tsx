import {
  appReducer,
  initialState,
  getActiveAgent,
  getActiveItem,
  getFilesForAgent,
} from './AppStateContext';
import { AppState, OpenFile } from '../../shared/types';

describe('appReducer', () => {
  describe('ADD_AGENT', () => {
    it('should add an agent and set it as active', () => {
      const state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('agent-1');
      expect(state.agents[0].label).toBe('Agent 1');
      expect(state.agents[0].cwd).toBe('/home/user');
      expect(state.agents[0].openFiles).toEqual([]);
      expect(state.activeItemId).toBe('agent-1');
      expect(state.activeAgentId).toBe('agent-1');
    });

    it('should add multiple agents', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-2', label: 'Agent 2', cwd: '/home/user/project' },
      });

      expect(state.agents).toHaveLength(2);
      expect(state.activeItemId).toBe('agent-2');
      expect(state.activeAgentId).toBe('agent-2');
    });
  });

  describe('REMOVE_AGENT', () => {
    it('should remove an agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-2', label: 'Agent 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'REMOVE_AGENT',
        payload: { id: 'agent-1' },
      });

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('agent-2');
    });

    it('should select next agent when active agent is removed', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-2', label: 'Agent 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'SET_ACTIVE_AGENT',
        payload: { id: 'agent-1' },
      });
      state = appReducer(state, {
        type: 'REMOVE_AGENT',
        payload: { id: 'agent-1' },
      });

      expect(state.activeItemId).toBe('agent-2');
      expect(state.activeAgentId).toBe('agent-2');
    });

    it('should set activeAgentId to null when last agent is removed', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'REMOVE_AGENT',
        payload: { id: 'agent-1' },
      });

      expect(state.agents).toHaveLength(0);
      expect(state.activeItemId).toBeNull();
      expect(state.activeAgentId).toBeNull();
    });
  });

  describe('SET_ACTIVE_AGENT', () => {
    it('should set the active agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-2', label: 'Agent 2', cwd: '/home/user/project' },
      });
      state = appReducer(state, {
        type: 'SET_ACTIVE_AGENT',
        payload: { id: 'agent-1' },
      });

      expect(state.activeItemId).toBe('agent-1');
      expect(state.activeAgentId).toBe('agent-1');
    });
  });

  describe('ADD_FILE', () => {
    it('should add a file to an agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });

      const file: OpenFile = {
        id: 'file-1',
        path: '/home/user/test.ts',
        name: 'test.ts',
        parentAgentId: 'agent-1',
      };

      state = appReducer(state, {
        type: 'ADD_FILE',
        payload: { agentId: 'agent-1', file },
      });

      expect(state.agents[0].openFiles).toHaveLength(1);
      expect(state.agents[0].openFiles[0].id).toBe('file-1');
      expect(state.activeItemId).toBe('file-1');
    });
  });

  describe('REMOVE_FILE', () => {
    it('should remove a file from an agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });

      const file: OpenFile = {
        id: 'file-1',
        path: '/home/user/test.ts',
        name: 'test.ts',
        parentAgentId: 'agent-1',
      };

      state = appReducer(state, {
        type: 'ADD_FILE',
        payload: { agentId: 'agent-1', file },
      });

      state = appReducer(state, {
        type: 'REMOVE_FILE',
        payload: { agentId: 'agent-1', fileId: 'file-1' },
      });

      expect(state.agents[0].openFiles).toHaveLength(0);
      expect(state.activeItemId).toBe('agent-1');
    });
  });

  describe('RENAME_AGENT', () => {
    it('should rename an agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });

      state = appReducer(state, {
        type: 'RENAME_AGENT',
        payload: { id: 'agent-1', label: 'My Project' },
      });

      expect(state.agents[0].label).toBe('My Project');
    });
  });

  describe('SET_VIEW_MODE', () => {
    it('should set view mode to chat', () => {
      const state = appReducer(initialState, {
        type: 'SET_VIEW_MODE',
        payload: { mode: 'chat' },
      });
      expect(state.viewMode).toBe('chat');
    });

    it('should set view mode back to agents', () => {
      let state = appReducer(initialState, {
        type: 'SET_VIEW_MODE',
        payload: { mode: 'chat' },
      });
      state = appReducer(state, {
        type: 'SET_VIEW_MODE',
        payload: { mode: 'agents' },
      });
      expect(state.viewMode).toBe('agents');
    });
  });

  describe('SET_ACTIVE_AGENT switches viewMode', () => {
    it('should set viewMode to agents when selecting an agent', () => {
      let state = appReducer(initialState, {
        type: 'ADD_AGENT',
        payload: { id: 'agent-1', label: 'Agent 1', cwd: '/home/user' },
      });
      state = appReducer(state, {
        type: 'SET_VIEW_MODE',
        payload: { mode: 'chat' },
      });
      state = appReducer(state, {
        type: 'SET_ACTIVE_AGENT',
        payload: { id: 'agent-1' },
      });
      expect(state.viewMode).toBe('agents');
    });
  });

  describe('ADD_CHAT_MESSAGE', () => {
    it('should add a chat message', () => {
      const message = { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: Date.now() };
      const state = appReducer(initialState, {
        type: 'ADD_CHAT_MESSAGE',
        payload: { message },
      });
      expect(state.chatMessages).toHaveLength(1);
      expect(state.chatMessages[0].content).toBe('Hello');
    });
  });

  describe('APPEND_CHAT_CHUNK', () => {
    it('should append content to a specific message', () => {
      const message = { id: 'msg-1', role: 'assistant' as const, content: '', timestamp: Date.now() };
      let state = appReducer(initialState, {
        type: 'ADD_CHAT_MESSAGE',
        payload: { message },
      });
      state = appReducer(state, {
        type: 'APPEND_CHAT_CHUNK',
        payload: { messageId: 'msg-1', content: 'Hello' },
      });
      state = appReducer(state, {
        type: 'APPEND_CHAT_CHUNK',
        payload: { messageId: 'msg-1', content: ' world' },
      });
      expect(state.chatMessages[0].content).toBe('Hello world');
    });
  });

  describe('SET_CHAT_LOADING', () => {
    it('should set chat loading state', () => {
      const state = appReducer(initialState, {
        type: 'SET_CHAT_LOADING',
        payload: { loading: true },
      });
      expect(state.chatLoading).toBe(true);
    });
  });

  describe('SET_AVAILABLE_MODELS', () => {
    it('should set available models', () => {
      const models = [{ id: 'gpt-4o', name: 'GPT-4o' }, { id: 'claude-sonnet', name: 'Claude Sonnet' }];
      const state = appReducer(initialState, {
        type: 'SET_AVAILABLE_MODELS',
        payload: { models },
      });
      expect(state.availableModels).toEqual(models);
    });
  });

  describe('SET_SELECTED_MODEL', () => {
    it('should set selected model', () => {
      const state = appReducer(initialState, {
        type: 'SET_SELECTED_MODEL',
        payload: { model: 'gpt-4o' },
      });
      expect(state.selectedModel).toBe('gpt-4o');
    });

    it('should clear selected model', () => {
      const stateWithModel = { ...initialState, selectedModel: 'gpt-4o' };
      const state = appReducer(stateWithModel, {
        type: 'SET_SELECTED_MODEL',
        payload: { model: null },
      });
      expect(state.selectedModel).toBeNull();
    });
  });
});

describe('selectors', () => {
  describe('getActiveAgent', () => {
    it('should return null when no agents exist', () => {
      expect(getActiveAgent(initialState)).toBeNull();
    });

    it('should return the active agent', () => {
      const state: AppState = {
        agents: [
          { id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] },
          { id: 'agent-2', label: 'Agent 2', cwd: '/home/project', openFiles: [] },
        ],
        activeItemId: 'agent-2',
        activeAgentId: 'agent-2',
        viewMode: 'agents',
        chatMessages: [],
        chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
      };

      const result = getActiveAgent(state);
      expect(result?.id).toBe('agent-2');
    });
  });

  describe('getActiveItem', () => {
    it('should return null when no active item', () => {
      expect(getActiveItem(initialState)).toBeNull();
    });

    it('should return agent when active item is an agent', () => {
      const state: AppState = {
        agents: [{ id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [] }],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        viewMode: 'agents',
        chatMessages: [],
        chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
      };

      const result = getActiveItem(state);
      expect(result?.type).toBe('agent');
      expect(result?.item.id).toBe('agent-1');
    });

    it('should return file when active item is a file', () => {
      const file: OpenFile = {
        id: 'file-1',
        path: '/home/test.ts',
        name: 'test.ts',
        parentAgentId: 'agent-1',
      };

      const state: AppState = {
        agents: [{ id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [file] }],
        activeItemId: 'file-1',
        activeAgentId: 'agent-1',
        viewMode: 'agents',
        chatMessages: [],
        chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
      };

      const result = getActiveItem(state);
      expect(result?.type).toBe('file');
      expect(result?.item.id).toBe('file-1');
    });
  });

  describe('getFilesForAgent', () => {
    it('should return empty array when agent not found', () => {
      expect(getFilesForAgent(initialState, 'nonexistent')).toEqual([]);
    });

    it('should return files for agent', () => {
      const file: OpenFile = {
        id: 'file-1',
        path: '/home/test.ts',
        name: 'test.ts',
        parentAgentId: 'agent-1',
      };

      const state: AppState = {
        agents: [{ id: 'agent-1', label: 'Agent 1', cwd: '/home', openFiles: [file] }],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        viewMode: 'agents',
        chatMessages: [],
        chatLoading: false,
      conversations: [],
      activeConversationId: null,
      availableModels: [],
      selectedModel: null,
      agentEvents: {},
      agentNotes: {},
      showHiddenFiles: false,
      };

      const result = getFilesForAgent(state, 'agent-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file-1');
    });
  });
});
