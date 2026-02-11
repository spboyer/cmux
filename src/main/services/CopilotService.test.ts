// Mock electron before any imports
jest.mock('electron', () => ({
  app: { getPath: jest.fn().mockReturnValue('/mock/userData') },
}));

// Mock fs.appendFile to suppress log writes
jest.mock('fs', () => ({
  appendFile: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
}));

// Mock SdkLoader
const mockSession = {
  on: jest.fn(),
  sendAndWait: jest.fn(),
  destroy: jest.fn().mockResolvedValue(undefined),
  abort: jest.fn().mockResolvedValue(undefined),
};

const mockClient = {
  createSession: jest.fn().mockResolvedValue(mockSession),
  listModels: jest.fn(),
};

jest.mock('./SdkLoader', () => ({
  getSharedClient: jest.fn().mockResolvedValue(mockClient),
}));

import { CopilotService } from './CopilotService';

describe('CopilotService', () => {
  let service: CopilotService;
  let onChunk: jest.Mock;
  let onDone: jest.Mock;
  let onError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CopilotService();
    onChunk = jest.fn();
    onDone = jest.fn();
    onError = jest.fn();

    // Default: session.on returns an unsubscribe function
    mockSession.on.mockReturnValue(jest.fn());
    // Default: sendAndWait resolves with a response
    mockSession.sendAndWait.mockResolvedValue({ data: { content: 'full response' } });
  });

  describe('listModels', () => {
    it('T009: returns mapped model list', async () => {
      mockClient.listModels.mockResolvedValue([
        { id: 'gpt-4', name: 'GPT-4', extra: 'ignored' },
        { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', extra: 'ignored' },
      ]);

      const models = await service.listModels();

      expect(models).toEqual([
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5', name: 'GPT-3.5 Turbo' },
      ]);
    });
  });

  describe('sendMessage', () => {
    it('T001: calls onChunk with streamed delta content', async () => {
      let deltaHandler: Function | null = null;
      mockSession.on.mockImplementation((eventOrHandler: string | Function, handler?: Function) => {
        if (eventOrHandler === 'assistant.message_delta' && handler) {
          deltaHandler = handler;
        }
        return jest.fn();
      });

      // sendAndWait fires deltas synchronously before resolving
      mockSession.sendAndWait.mockImplementation(() => {
        if (deltaHandler) {
          deltaHandler({ data: { deltaContent: 'Hello' } });
          deltaHandler({ data: { deltaContent: ' world' } });
        }
        return Promise.resolve({ data: { content: 'Hello world' } });
      });

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      expect(onChunk).toHaveBeenCalledWith('msg-1', 'Hello');
      expect(onChunk).toHaveBeenCalledWith('msg-1', ' world');
    });

    it('T002: calls onDone when complete', async () => {
      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      expect(onDone).toHaveBeenCalledWith('msg-1');
      expect(onError).not.toHaveBeenCalled();
    });

    it('T003: calls onError on session failure', async () => {
      mockSession.sendAndWait.mockRejectedValue(new Error('SDK timeout'));

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      expect(onError).toHaveBeenCalledWith('msg-1', 'SDK timeout');
      expect(onDone).not.toHaveBeenCalled();
    });

    it('T004: enriches prompt with agent context when provider is set', async () => {
      service.setAgentContextProvider(() => [
        { agentId: 'a1', label: 'My Agent', cwd: '/home/project' },
      ]);

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      const sentPrompt = mockSession.sendAndWait.mock.calls[0][0].prompt;
      expect(sentPrompt).toContain('<active_agents>');
      expect(sentPrompt).toContain('My Agent (ID: a1, path: /home/project)');
      expect(sentPrompt).toContain('Hi');
    });

    it('T005: does NOT enrich prompt when no agents exist', async () => {
      service.setAgentContextProvider(() => []);

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      const sentPrompt = mockSession.sendAndWait.mock.calls[0][0].prompt;
      expect(sentPrompt).toBe('Hi');
    });

    it('T006: falls back to full response when no chunks received', async () => {
      // session.on returns unsubscribe but never fires delta handler
      mockSession.sendAndWait.mockResolvedValue({ data: { content: 'full response' } });

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      expect(onChunk).toHaveBeenCalledWith('msg-1', 'full response');
      expect(onDone).toHaveBeenCalledWith('msg-1');
    });

    it('T008: ignores chunks after abort', async () => {
      // Capture the delta handler so we can fire it after abort
      let deltaHandler: Function | null = null;
      mockSession.on.mockImplementation((eventOrHandler: string | Function, handler?: Function) => {
        if (eventOrHandler === 'assistant.message_delta' && handler) {
          deltaHandler = handler;
        }
        return jest.fn();
      });

      // Make sendAndWait hang so we can abort during it
      mockSession.sendAndWait.mockImplementation(() => {
        // Simulate: abort happens, then delta arrives
        // First trigger cancelMessage from outside
        service.cancelMessage('conv-1', 'msg-1', jest.fn());
        // Now fire a delta after abort
        if (deltaHandler) {
          deltaHandler({ data: { deltaContent: 'late chunk' } });
        }
        return Promise.resolve({ data: { content: '' } });
      });

      await service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      // onChunk should NOT have been called with the late chunk
      expect(onChunk).not.toHaveBeenCalledWith('msg-1', 'late chunk');
      // onDone and onError should not be called since abort was triggered
      expect(onDone).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('cancelMessage', () => {
    it('T007: aborts and calls onDone', async () => {
      // First send a message so the session is created and abort controller registered
      await service.sendMessage('conv-1', 'setup', 'msg-0', jest.fn(), jest.fn(), jest.fn());

      // Start another sendMessage that hangs
      mockSession.sendAndWait.mockImplementation(() => new Promise(() => {}));
      const sendPromise = service.sendMessage('conv-1', 'Hi', 'msg-1', onChunk, onDone, onError);

      // Cancel it
      const cancelDone = jest.fn();
      await service.cancelMessage('conv-1', 'msg-1', cancelDone);

      expect(cancelDone).toHaveBeenCalledWith('msg-1');
      expect(mockSession.abort).toHaveBeenCalled();
    });
  });
});
