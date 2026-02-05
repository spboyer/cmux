import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

// Import after mocking
import { fileService, FileEntry } from './FileService';

const mockReaddir = fs.promises.readdir as jest.MockedFunction<typeof fs.promises.readdir>;
const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
const mockAccess = fs.promises.access as jest.MockedFunction<typeof fs.promises.access>;

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readDirectory', () => {
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
  });

  describe('readFile', () => {
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

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await fileService.fileExists('/test/file.txt');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await fileService.fileExists('/test/missing.txt');

      expect(result).toBe(false);
    });
  });
});
