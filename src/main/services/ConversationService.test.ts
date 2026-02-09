import * as path from 'path';

// Mock electron
jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/mock/userData') },
}));

// Mock fs — provide both sync (used by current impl) and promises (target API)
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  renameSync: jest.fn(),
  unlinkSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
  },
}));

import * as fs from 'fs';
import { conversationService } from './ConversationService';
import { ConversationData } from '../../shared/types';

const mockMkdir = fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>;
const mockReaddir = fs.promises.readdir as jest.MockedFunction<typeof fs.promises.readdir>;
const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
const mockWriteFile = fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>;
const mockRename = fs.promises.rename as jest.MockedFunction<typeof fs.promises.rename>;
const mockUnlink = fs.promises.unlink as jest.MockedFunction<typeof fs.promises.unlink>;

const CONV_DIR = path.join('/mock/userData', 'conversations');

const makeConvData = (overrides: Partial<ConversationData> = {}): ConversationData => ({
  id: 'conv-1',
  title: 'Test Conversation',
  createdAt: 1000,
  updatedAt: 2000,
  messages: [],
  ...overrides,
});

describe('ConversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
  });

  describe('list()', () => {
    it('should return conversations sorted by updatedAt descending', async () => {
      mockReaddir.mockResolvedValue(['a.json', 'b.json'] as any);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(makeConvData({ id: 'a', updatedAt: 100 })))
        .mockResolvedValueOnce(JSON.stringify(makeConvData({ id: 'b', updatedAt: 200 })));

      const result = await conversationService.list();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('a');
    });

    it('should only read .json files', async () => {
      mockReaddir.mockResolvedValue(['conv.json', 'notes.txt', '.DS_Store'] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(makeConvData()));

      await conversationService.list();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should skip corrupt files and return valid ones', async () => {
      mockReaddir.mockResolvedValue(['good.json', 'bad.json'] as any);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(makeConvData({ id: 'good' })))
        .mockResolvedValueOnce('not valid json{{{');

      const result = await conversationService.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('good');
    });

    it('should return empty array when readdir fails', async () => {
      mockReaddir.mockRejectedValue(new Error('EACCES'));

      const result = await conversationService.list();

      expect(result).toEqual([]);
    });

    it('should call mkdir to ensure directory exists', async () => {
      mockReaddir.mockResolvedValue([]);

      await conversationService.list();

      expect(mockMkdir).toHaveBeenCalledWith(CONV_DIR, { recursive: true });
    });
  });

  describe('load()', () => {
    it('should return parsed conversation data', async () => {
      const data = makeConvData({ id: 'conv-1' });
      mockReadFile.mockResolvedValue(JSON.stringify(data));

      const result = await conversationService.load('conv-1');

      expect(result).toEqual(data);
      expect(mockReadFile).toHaveBeenCalledWith(
        path.join(CONV_DIR, 'conv-1.json'),
        'utf-8'
      );
    });

    it('should return null when file does not exist', async () => {
      const err: NodeJS.ErrnoException = new Error('ENOENT');
      err.code = 'ENOENT';
      mockReadFile.mockRejectedValue(err);

      const result = await conversationService.load('missing');

      expect(result).toBeNull();
    });

    it('should return null on read error', async () => {
      mockReadFile.mockRejectedValue(new Error('EACCES'));

      const result = await conversationService.load('broken');

      expect(result).toBeNull();
    });
  });

  describe('save()', () => {
    it('should write to tmp file then rename', async () => {
      const data = makeConvData({ id: 'conv-1' });
      mockWriteFile.mockResolvedValue();
      mockRename.mockResolvedValue();

      await conversationService.save(data);

      const filePath = path.join(CONV_DIR, 'conv-1.json');
      expect(mockWriteFile).toHaveBeenCalledWith(
        filePath + '.tmp',
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      expect(mockRename).toHaveBeenCalledWith(filePath + '.tmp', filePath);
    });

    it('should clean up tmp file when rename fails', async () => {
      const data = makeConvData({ id: 'conv-1' });
      mockWriteFile.mockResolvedValue();
      mockRename.mockRejectedValue(new Error('rename failed'));
      mockUnlink.mockResolvedValue();

      await conversationService.save(data);

      const tmpPath = path.join(CONV_DIR, 'conv-1.json') + '.tmp';
      expect(mockUnlink).toHaveBeenCalledWith(tmpPath);
    });
  });

  describe('delete()', () => {
    it('should unlink the conversation file', async () => {
      mockUnlink.mockResolvedValue();

      await conversationService.delete('conv-1');

      expect(mockUnlink).toHaveBeenCalledWith(path.join(CONV_DIR, 'conv-1.json'));
    });

    it('should not throw when file does not exist', async () => {
      const err: NodeJS.ErrnoException = new Error('ENOENT');
      err.code = 'ENOENT';
      mockUnlink.mockRejectedValue(err);

      await expect(conversationService.delete('missing')).resolves.toBeUndefined();
    });

    it('should not throw on other errors', async () => {
      mockUnlink.mockRejectedValue(new Error('EACCES'));

      await expect(conversationService.delete('broken')).resolves.toBeUndefined();
    });
  });

  describe('rename()', () => {
    it('should load, update title and updatedAt, then save', async () => {
      const data = makeConvData({ id: 'conv-1', title: 'Old', updatedAt: 1000 });
      mockReadFile.mockResolvedValue(JSON.stringify(data));
      mockWriteFile.mockResolvedValue();
      mockRename.mockResolvedValue();

      const before = Date.now();
      await conversationService.rename('conv-1', 'New Title');
      const after = Date.now();

      // Verify save was called with updated title
      const savedJson = (mockWriteFile.mock.calls[0][1] as string);
      const saved = JSON.parse(savedJson) as ConversationData;
      expect(saved.title).toBe('New Title');
      expect(saved.updatedAt).toBeGreaterThanOrEqual(before);
      expect(saved.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should do nothing when conversation does not exist', async () => {
      const err: NodeJS.ErrnoException = new Error('ENOENT');
      err.code = 'ENOENT';
      mockReadFile.mockRejectedValue(err);

      await conversationService.rename('missing', 'Title');

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
