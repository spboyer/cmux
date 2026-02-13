import { spawn } from 'child_process';
import * as path from 'path';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { gitService } from './GitService';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Helper to create platform-appropriate paths for test assertions
const testPath = (...parts: string[]) => path.join(...parts);

// Helper to create mock process
function createMockProcess(stdout: string, stderr: string = '', exitCode: number = 0) {
  const stdoutCallbacks: ((data: Buffer) => void)[] = [];
  const stderrCallbacks: ((data: Buffer) => void)[] = [];
  const closeCallbacks: ((code: number) => void)[] = [];
  const errorCallbacks: ((err: Error) => void)[] = [];

  const mockProc = {
    stdout: {
      on: jest.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') stdoutCallbacks.push(cb);
      }),
    },
    stderr: {
      on: jest.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') stderrCallbacks.push(cb);
      }),
    },
    on: jest.fn((event: string, cb: any) => {
      if (event === 'close') closeCallbacks.push(cb);
      if (event === 'error') errorCallbacks.push(cb);
    }),
  };

  // Trigger callbacks after creation
  setTimeout(() => {
    if (stdout) {
      stdoutCallbacks.forEach(cb => cb(Buffer.from(stdout)));
    }
    if (stderr) {
      stderrCallbacks.forEach(cb => cb(Buffer.from(stderr)));
    }
    closeCallbacks.forEach(cb => cb(exitCode));
  }, 0);

  return mockProc;
}

describe('GitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true for a git repository', async () => {
      mockSpawn.mockReturnValue(createMockProcess('.git') as any);

      const result = await gitService.isGitRepository('/test/repo');

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--git-dir'],
        expect.objectContaining({ cwd: '/test/repo' })
      );
    });

    it('should return false for a non-git directory', async () => {
      mockSpawn.mockReturnValue(createMockProcess('', 'fatal: not a git repository', 128) as any);

      const result = await gitService.isGitRepository('/test/not-a-repo');

      expect(result).toBe(false);
    });
  });

  describe('getGitRoot', () => {
    it('should return the repository root path', async () => {
      const repoRoot = testPath('/home/user/repo');
      mockSpawn.mockReturnValue(createMockProcess(repoRoot + '\n') as any);

      const result = await gitService.getGitRoot(testPath('/home/user/repo/src'));

      expect(result).toBe(repoRoot);
    });

    it('should return null for non-git directory', async () => {
      mockSpawn.mockReturnValue(createMockProcess('', 'fatal: not a git repository', 128) as any);

      const result = await gitService.getGitRoot('/tmp/random');

      expect(result).toBeNull();
    });
  });

  describe('getGitStatus', () => {
    const repoRoot = testPath('/repo');

    it('should parse modified files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess(' M src/file.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/file.ts')]).toBe('modified');
    });

    it('should parse staged files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('M  src/staged.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/staged.ts')]).toBe('staged');
    });

    it('should parse added files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('A  src/new.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/new.ts')]).toBe('added');
    });

    it('should parse untracked files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('?? src/untracked.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/untracked.ts')]).toBe('untracked');
    });

    it('should parse deleted files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess(' D src/deleted.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/deleted.ts')]).toBe('deleted');
    });

    it('should parse renamed files correctly', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('R  old.ts -> new.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'new.ts')]).toBe('renamed');
    });

    it('should handle multiple files with different statuses', async () => {
      const statusOutput = [
        ' M src/modified.ts',
        'M  src/staged.ts',
        'A  src/added.ts',
        '?? src/untracked.ts',
        ' D src/deleted.ts',
      ].join('\n') + '\n';

      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess(statusOutput) as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/modified.ts')]).toBe('modified');
      expect(result[testPath(repoRoot, 'src/staged.ts')]).toBe('staged');
      expect(result[testPath(repoRoot, 'src/added.ts')]).toBe('added');
      expect(result[testPath(repoRoot, 'src/untracked.ts')]).toBe('untracked');
      expect(result[testPath(repoRoot, 'src/deleted.ts')]).toBe('deleted');
    });

    it('should return empty object for non-git directory', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess('', 'fatal: not a git repository', 128) as any);

      const result = await gitService.getGitStatus('/not-a-repo');

      expect(result).toEqual({});
    });

    it('should return empty object when git command fails', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('', 'error', 1) as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result).toEqual({});
    });

    it('should prioritize worktree modifications over staged changes', async () => {
      mockSpawn
        .mockReturnValueOnce(createMockProcess(repoRoot + '\n') as any)
        .mockReturnValueOnce(createMockProcess('MM src/both.ts\n') as any);

      const result = await gitService.getGitStatus(repoRoot);

      expect(result[testPath(repoRoot, 'src/both.ts')]).toBe('modified');
    });
  });

});
