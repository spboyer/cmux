import * as fs from 'fs';
import * as path from 'path';
import { SessionFile } from './SessionService';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
}));

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

// Import after mocking
import { sessionService, SessionData } from './SessionService';

const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should write session data with correct version', () => {
      const data = {
        terminals: [
          { id: 'term-1', label: 'Test', cwd: '/home', openFiles: [] as SessionFile[] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      };

      sessionService.save(data);

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockWriteFileSync.mock.calls[0];
      expect(filePath).toBe(path.join('/mock/userData', 'session.json'));
      
      const parsed = JSON.parse(content as string);
      expect(parsed.version).toBe(1);
      expect(parsed.terminals).toEqual(data.terminals);
      expect(parsed.activeItemId).toBe('term-1');
    });

    it('should not throw on write error', () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        sessionService.save({
          terminals: [],
          activeItemId: null,
          activeTerminalId: null,
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
        terminals: [],
        activeItemId: null,
        activeTerminalId: null,
      }));

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should return null when terminals is not an array', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: 'not an array',
        activeItemId: null,
        activeTerminalId: null,
      }));

      const result = sessionService.load();

      expect(result).toBeNull();
    });

    it('should filter out terminals with non-existent directories', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'session.json')) return true;
        if (p === '/existing/dir') return true;
        if (p === '/missing/dir') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: [
          { id: 'term-1', label: 'Exists', cwd: '/existing/dir', openFiles: [] },
          { id: 'term-2', label: 'Missing', cwd: '/missing/dir', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      }));

      const result = sessionService.load();

      expect(result?.terminals).toHaveLength(1);
      expect(result?.terminals[0].id).toBe('term-1');
    });

    it('should filter out non-existent files from terminals', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/home/exists.txt') return true;
        if (p === '/home/missing.txt') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: [
          {
            id: 'term-1',
            label: 'Test',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', path: '/home/exists.txt', name: 'exists.txt', parentTerminalId: 'term-1' },
              { id: 'file-2', path: '/home/missing.txt', name: 'missing.txt', parentTerminalId: 'term-1' },
            ],
          },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      }));

      const result = sessionService.load();

      expect(result?.terminals[0].openFiles).toHaveLength(1);
      expect(result?.terminals[0].openFiles[0].id).toBe('file-1');
    });

    it('should fix activeTerminalId when pointing to removed terminal', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/removed') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: [
          { id: 'term-1', label: 'Exists', cwd: '/home', openFiles: [] },
          { id: 'term-2', label: 'Removed', cwd: '/removed', openFiles: [] },
        ],
        activeItemId: 'term-2',
        activeTerminalId: 'term-2',
      }));

      const result = sessionService.load();

      expect(result?.activeTerminalId).toBe('term-1');
    });

    it('should fix activeItemId when pointing to removed item', () => {
      mockExistsSync.mockImplementation((p) => {
        if (p === path.join('/mock/userData', 'session.json')) return true;
        if (p === '/home') return true;
        if (p === '/home/missing.txt') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 1,
        terminals: [
          {
            id: 'term-1',
            label: 'Test',
            cwd: '/home',
            openFiles: [
              { id: 'file-1', path: '/home/missing.txt', name: 'missing.txt', parentTerminalId: 'term-1' },
            ],
          },
        ],
        activeItemId: 'file-1',
        activeTerminalId: 'term-1',
      }));

      const result = sessionService.load();

      expect(result?.activeItemId).toBe('term-1');
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
        version: 1,
        terminals: [
          { id: 'term-1', label: 'Test', cwd: '/home', openFiles: [] },
        ],
        activeItemId: 'term-1',
        activeTerminalId: 'term-1',
      }));

      const result = sessionService.load();

      expect(result).not.toBeNull();
      expect(result?.terminals).toHaveLength(1);
      expect(result?.activeTerminalId).toBe('term-1');
    });
  });
});
