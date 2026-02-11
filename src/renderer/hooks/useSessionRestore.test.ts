import { renderHook } from '@testing-library/react';
import { useSessionRestore } from './useSessionRestore';

describe('useSessionRestore', () => {
  let dispatch: jest.Mock;
  let mockSessionLoad: jest.Mock;
  let mockConversationList: jest.Mock;
  let mockConversationLoad: jest.Mock;
  let mockAgentCreate: jest.Mock;
  let mockAddAllowedRoot: jest.Mock;
  let mockRegisterAgent: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    mockSessionLoad = jest.fn();
    mockConversationList = jest.fn();
    mockConversationLoad = jest.fn();
    mockAgentCreate = jest.fn();
    mockAddAllowedRoot = jest.fn().mockResolvedValue(undefined);
    mockRegisterAgent = jest.fn().mockResolvedValue(undefined);

    (window as any).electronAPI = {
      session: { load: mockSessionLoad },
      conversation: {
        list: mockConversationList,
        load: mockConversationLoad,
      },
      agent: { create: mockAgentCreate },
      fs: { addAllowedRoot: mockAddAllowedRoot },
      agentSession: { registerAgent: mockRegisterAgent },
    };
  });

  it('should restore conversations when session has no agents', async () => {
    mockSessionLoad.mockResolvedValue(null);
    mockConversationList.mockResolvedValue([
      { id: 'c1', title: 'Conv 1', updatedAt: 1000 },
    ]);

    renderHook(() => useSessionRestore(dispatch));

    // Wait for async effects
    await new Promise(r => setTimeout(r, 50));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_CONVERSATIONS',
      payload: { conversations: [{ id: 'c1', title: 'Conv 1', updatedAt: 1000 }] },
    });
  });

  it('should restore terminal agents with PTY', async () => {
    mockAgentCreate.mockResolvedValue({ isWorktree: false });
    mockConversationList.mockResolvedValue([]);
    mockSessionLoad.mockResolvedValue({
      agents: [{
        id: 'a1', label: 'Agent 1', cwd: '/tmp/a1',
        openFiles: [], hasSession: false,
      }],
      activeItemId: 'a1',
      activeAgentId: 'a1',
    });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(mockAgentCreate).toHaveBeenCalledWith('a1', '/tmp/a1');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_AGENT',
      payload: { id: 'a1', label: 'Agent 1', cwd: '/tmp/a1', isWorktree: false },
    });
  });

  it('should restore SDK agents without PTY', async () => {
    mockConversationList.mockResolvedValue([]);
    mockSessionLoad.mockResolvedValue({
      agents: [{
        id: 'a2', label: 'SDK Agent', cwd: '/tmp/a2',
        openFiles: [], hasSession: true,
      }],
      activeItemId: 'a2',
      activeAgentId: 'a2',
    });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(mockAddAllowedRoot).toHaveBeenCalledWith('/tmp/a2');
    expect(mockRegisterAgent).toHaveBeenCalledWith('a2', 'SDK Agent', '/tmp/a2');
    expect(mockAgentCreate).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_AGENT',
      payload: { id: 'a2', label: 'SDK Agent', cwd: '/tmp/a2', hasSession: true },
    });
  });

  it('should not call registerAgent for non-SDK agents', async () => {
    mockAgentCreate.mockResolvedValue({ isWorktree: false });
    mockConversationList.mockResolvedValue([]);
    mockSessionLoad.mockResolvedValue({
      agents: [{
        id: 'a1', label: 'Terminal Agent', cwd: '/tmp/a1',
        openFiles: [], hasSession: false,
      }],
      activeItemId: 'a1',
      activeAgentId: 'a1',
    });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(mockRegisterAgent).not.toHaveBeenCalled();
  });

  it('should restore open files for agents', async () => {
    mockAgentCreate.mockResolvedValue({ isWorktree: false });
    mockConversationList.mockResolvedValue([]);
    mockSessionLoad.mockResolvedValue({
      agents: [{
        id: 'a1', label: 'Agent', cwd: '/tmp',
        openFiles: [{ id: 'f1', path: '/tmp/file.ts', name: 'file.ts', parentAgentId: 'a1' }],
        hasSession: false,
      }],
      activeItemId: 'f1',
      activeAgentId: 'a1',
    });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_FILE',
      payload: { agentId: 'a1', file: { id: 'f1', path: '/tmp/file.ts', name: 'file.ts', parentAgentId: 'a1' } },
    });
  });

  it('should restore active conversation with messages and model', async () => {
    mockSessionLoad.mockResolvedValue({
      agents: [],
      activeConversationId: 'c1',
    });
    mockConversationList.mockResolvedValue([
      { id: 'c1', title: 'Test', updatedAt: 1000 },
    ]);
    mockConversationLoad.mockResolvedValue({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4',
    });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_CONVERSATION',
      payload: { id: 'c1' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_CHAT_MESSAGES',
      payload: { messages: [{ role: 'user', content: 'hi' }] },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SELECTED_MODEL',
      payload: { model: 'gpt-4' },
    });
  });

  it('should switch to chat view if conversation was active but no agent item', async () => {
    mockSessionLoad.mockResolvedValue({
      agents: [],
      activeConversationId: 'c1',
      activeItemId: null,
    });
    mockConversationList.mockResolvedValue([
      { id: 'c1', title: 'Test', updatedAt: 1000 },
    ]);
    mockConversationLoad.mockResolvedValue({ messages: [] });

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_VIEW_MODE',
      payload: { mode: 'chat' },
    });
  });

  it('should only run once even if re-rendered', async () => {
    mockSessionLoad.mockResolvedValue(null);
    mockConversationList.mockResolvedValue([]);

    const { rerender } = renderHook(() => useSessionRestore(dispatch));

    rerender();
    rerender();

    await new Promise(r => setTimeout(r, 50));

    expect(mockSessionLoad).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSessionLoad.mockRejectedValue(new Error('disk error'));
    mockConversationList.mockResolvedValue([]);

    renderHook(() => useSessionRestore(dispatch));
    await new Promise(r => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to restore session:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
