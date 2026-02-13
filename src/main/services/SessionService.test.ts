import * as fs from 'fs';
import * as path from 'path';
// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
}));

// Mock fs module
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
  copyFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

// Import after mocking
import { sessionService, SessionData, SessionFile } from './SessionService';

const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;
const mockRenameSync = fs.renameSync as jest.MockedFunction<typeof fs.renameSync>;
const mockCopyFileSync = fs.copyFileSync as jest.MockedFunction<typeof fs.copyFileSync>;

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdirSync.mockReturnValue(undefined);
    mockRenameSync.mockReturnValue(undefined);
    mockCopyFileSync.mockReturnValue(undefined);
  });

  describe('save', () => {
    it('should write session data with correct version', () => {
      const data = {
        agents: [
          { id: 'agent-1', label: 'Test', cwd: '/home', openFiles: [] as SessionFile[] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        activeConversationId: null as string | null,
      };

      sessionService.save(data);

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockWriteFileSync.mock.calls[0];
      expect(filePath).toBe(path.join('/mock/userData', 'state', 'session.json'));
      
      const parsed = JSON.parse(content as string);
      expect(parsed.version).toBe(5);
      expect(parsed.agents).toEqual(data.agents);
      expect(parsed.activeItemId).toBe('agent-1');
    });

    it('should not throw on write error', () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        sessionService.save({
          agents: [],
          activeItemId: null,
          activeAgentId: null,
          activeConversationId: null,
        });
      }).not.toThrow();
    });
  });

  describe('load', () => {
    it('should return null when session file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should return null on version mismatch', () => {
      mockExistsSync.mockImplementation((p) => {
        // Session file exists, directories exist
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 999,
        agents: [],
        activeItemId: null,
        activeAgentId: null,
      }));

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should return null when agents is not an array', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        agents: 'not an array',
        activeItemId: null,
        activeAgentId: null,
      }));

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should filter out agents with non-existent directories', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'state', 'session.json')) return true;
        if (p === '/existing/dir') return true;
        if (p === '/missing/dir') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        agents: [
          { id: 'agent-1', label: 'Exists', cwd: '/existing/dir', openFiles: [] },
          { id: 'agent-2', label: 'Missing', cwd: '/missing/dir', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      }));

      const result = sessionService.load();

      expect(result?.agents).toHaveLength(1);
      expect(result?.agents[0].id).toBe('agent-1');
    });

    it('should filter out non-existent files from agents', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'state', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/home/exists.txt') return true;
        if (p === '/home/missing.txt') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        agents: [
          {
            id: 'agent-1',
            label: 'Test',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', path: '/home/exists.txt', name: 'exists.txt', parentAgentId: 'agent-1' },
              { id: 'file-2', path: '/home/missing.txt', name: 'missing.txt', parentAgentId: 'agent-1' },
            ],
          },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
      }));

      const result = sessionService.load();

      expect(result?.agents[0].openFiles).toHaveLength(1);
      expect(result?.agents[0].openFiles[0].id).toBe('file-1');
    });

    it('should fix activeAgentId when pointing to removed agent', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'state', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/removed') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        agents: [
          { id: 'agent-1', label: 'Exists', cwd: '/home', openFiles: [] },
          { id: 'agent-2', label: 'Removed', cwd: '/removed', openFiles: [] },
        ],
        activeItemId: 'agent-2',
        activeAgentId: 'agent-2',
      }));

      const result = sessionService.load();

      expect(result?.activeAgentId).toBe('agent-1');
    });

    it('should fix activeItemId when pointing to removed item', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'state', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/home/missing.txt') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        agents: [
          {
            id: 'agent-1',
            label: 'Test',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', path: '/home/missing.txt', name: 'missing.txt', parentAgentId: 'agent-1' },
            ],
          },
        ],
        activeItemId: 'file-1',
        activeAgentId: 'agent-1',
      }));

      const result = sessionService.load();

      expect(result?.activeItemId).toBe('agent-1');
    });

    it('should return null on JSON parse error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json {{{');

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should return valid session data', () => {
      mockExistsSync.mockImplementation((p) => true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 5,
        agents: [
          { id: 'agent-1', label: 'Test', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        activeConversationId: null,
        agentNotes: {},
        showHiddenFiles: false,
      }));

      const result = sessionService.load();

      expect(result).not.toBeNull();
      expect(result?.agents).toHaveLength(1);
      expect(result?.activeAgentId).toBe('agent-1');
    });

    it('should migrate v1 session data to v2', () => {
      mockExistsSync.mockImplementation((p) => true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: [
          { 
            id: 'term-1', 
            label: 'Test', 
            cwd: '/home', 
            openFiles: [
              { id: 'file-1', path: '/home/test.txt', name: 'test.txt', parentTerminalId: 'term-1' }
            ] 
          },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      }));

      const result = sessionService.load();

      expect(result).not.toBeNull();
      expect(result?.version).toBe(5);
      expect(result?.agents).toHaveLength(1);
      expect(result?.agents[0].id).toBe('term-1');
      expect(result?.agents[0].openFiles[0].parentAgentId).toBe('term-1');
      expect(result?.activeAgentId).toBe('term-1');
      expect(result?.activeConversationId).toBeNull();
    });

    it('should migrate v4 session data to v5 with showHiddenFiles', () => {
      mockExistsSync.mockImplementation(() => true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 4,
        agents: [
          { id: 'agent-1', label: 'Test', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        activeConversationId: null,
        agentNotes: {},
      }));

      const result = sessionService.load();

      expect(result).not.toBeNull();
      expect(result?.version).toBe(5);
      expect(result?.showHiddenFiles).toBe(false);
    });

    it('should preserve showHiddenFiles value in v5 session data', () => {
      mockExistsSync.mockImplementation(() => true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 5,
        agents: [
          { id: 'agent-1', label: 'Test', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'agent-1',
        activeAgentId: 'agent-1',
        activeConversationId: null,
        agentNotes: {},
        showHiddenFiles: true,
      }));

      const result = sessionService.load();

      expect(result).not.toBeNull();
      expect(result?.showHiddenFiles).toBe(true);
    });
  });
});
