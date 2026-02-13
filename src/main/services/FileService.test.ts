import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Import after mocking
import { fileService } from './FileService';

const mockReaddir = fs.promises.readdir as jest.MockedFunction<typeof fs.promises.readdir>;
const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset allowed roots between tests by re-importing singleton
    (fileService as any).allowedRoots = new Set();
  });

  describe('path validation', () => {
    it('should allow reading files within allowed roots', async () => {
      fileService.addAllowedRoot('/home/user/project');
      mockReadFile.mockResolvedValue('file content');

      const result = await fileService.readFile('/home/user/project/src/index.ts');

      expect(result).toBe('file content');
      expect(mockReadFile).toHaveBeenCalled();
    });

    it('should reject reading files outside allowed roots', async () => {
      fileService.addAllowedRoot('/home/user/project');

      await expect(fileService.readFile('/etc/passwd')).rejects.toThrow('Access denied');
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should reject path traversal attempts', async () => {
      fileService.addAllowedRoot('/home/user/project');

      await expect(fileService.readFile('/home/user/project/../../../etc/passwd')).rejects.toThrow('Access denied');
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should reject directory reads outside allowed roots', async () => {
      fileService.addAllowedRoot('/home/user/project');

      const result = await fileService.readDirectory('/etc');

      expect(result).toEqual([]);
      expect(mockReaddir).not.toHaveBeenCalled();
    });

    it('should allow reading directories within allowed roots', async () => {
      fileService.addAllowedRoot('/home/user/project');
      mockReaddir.mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false },
      ] as any);

      const result = await fileService.readDirectory('/home/user/project/src');

      expect(result).toHaveLength(1);
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should handle multiple allowed roots', async () => {
      fileService.addAllowedRoot('/home/user/project1');
      fileService.addAllowedRoot('/home/user/project2');
      mockReadFile.mockResolvedValue('content');

      await fileService.readFile('/home/user/project1/file.ts');
      await fileService.readFile('/home/user/project2/file.ts');

      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

  });

  describe('readDirectory', () => {
    beforeEach(() => {
      // Allow test paths
      fileService.addAllowedRoot('/test');
    });

    it('should return sorted file entries with directories first', async () => {
      const mockEntries = [
        { name: 'zebra.txt', isDirectory: () => false },
        { name: 'alpha', isDirectory: () => true },
        { name: 'beta.js', isDirectory: () => false },
        { name: 'gamma', isDirectory: () => true },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir');

      expect(result).toHaveLength(4);
      // Directories first, alphabetically
      expect(result[0].name).toBe('alpha');
      expect(result[0].isDirectory).toBe(true);
      expect(result[1].name).toBe('gamma');
      expect(result[1].isDirectory).toBe(true);
      // Files next, alphabetically
      expect(result[2].name).toBe('beta.js');
      expect(result[2].isDirectory).toBe(false);
      expect(result[3].name).toBe('zebra.txt');
      expect(result[3].isDirectory).toBe(false);
    });

    it('should filter out hidden files (starting with .)', async () => {
      const mockEntries = [
        { name: '.hidden', isDirectory: () => false },
        { name: '.git', isDirectory: () => true },
        { name: 'visible.txt', isDirectory: () => false },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible.txt');
    });

    it('should construct correct paths for entries', async () => {
      const mockEntries = [
        { name: 'file.txt', isDirectory: () => false },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir');

      expect(result[0].path).toBe(path.join('/test/dir', 'file.txt'));
    });

    it('should return empty array on error', async () => {
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await fileService.readDirectory('/test/dir');

      expect(result).toEqual([]);
    });

    it('should call readdir with withFileTypes option', async () => {
      mockReaddir.mockResolvedValue([]);

      await fileService.readDirectory('/test/dir');

      expect(mockReaddir).toHaveBeenCalledWith('/test/dir', { withFileTypes: true });
    });

    it('should filter dotfiles when showHidden is false', async () => {
      const mockEntries = [
        { name: '.hidden', isDirectory: () => false },
        { name: '.git', isDirectory: () => true },
        { name: 'visible.txt', isDirectory: () => false },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir', { showHidden: false });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible.txt');
    });

    it('should return dotfiles when showHidden is true', async () => {
      const mockEntries = [
        { name: '.hidden', isDirectory: () => false },
        { name: '.git', isDirectory: () => true },
        { name: 'visible.txt', isDirectory: () => false },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir', { showHidden: true });

      expect(result).toHaveLength(3);
      expect(result.map(e => e.name)).toContain('.hidden');
      expect(result.map(e => e.name)).toContain('.git');
      expect(result.map(e => e.name)).toContain('visible.txt');
    });

    it('should filter dotfiles by default (no options)', async () => {
      const mockEntries = [
        { name: '.env', isDirectory: () => false },
        { name: 'index.ts', isDirectory: () => false },
      ];
      mockReaddir.mockResolvedValue(mockEntries as any);

      const result = await fileService.readDirectory('/test/dir');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('index.ts');
    });
  });

  describe('readFile', () => {
    beforeEach(() => {
      fileService.addAllowedRoot('/test');
    });

    it('should return file content as string', async () => {
      mockReadFile.mockResolvedValue('file content here');

      const result = await fileService.readFile('/test/file.txt');

      expect(result).toBe('file content here');
      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
    });

    it('should throw error when file cannot be read', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(fileService.readFile('/test/missing.txt')).rejects.toThrow('ENOENT');
    });
  });
});
