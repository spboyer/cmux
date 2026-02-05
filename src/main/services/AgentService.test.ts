import * as os from 'os';
import * as child_process from 'child_process';

// Mock node-pty
const mockPtyProcess = {
  write: jest.fn(),
  resize: jest.fn(),
  kill: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
};

const mockSpawn = jest.fn(() => ({ ...mockPtyProcess }));

jest.mock('@homebridge/node-pty-prebuilt-multiarch', () => ({
  spawn: mockSpawn,
}));

// Mock child_process.execSync for worktree detection
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = child_process.execSync as jest.MockedFunction<typeof child_process.execSync>;

// Import after mocking
import { agentService } from './AgentService';

describe('AgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset agents map by killing all existing agents
    for (const id of agentService.getAllAgents()) {
      agentService.kill(id);
    }
  });

  describe('create', () => {
    it('should create a new agent and return the ID', () => {
      const id = agentService.create('test-1', '/home/user');

      expect(id).toBe('test-1');
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(agentService.getAgent('test-1')).toBeDefined();
    });

    it('should return existing agent ID when creating duplicate', () => {
      // Create first agent
      agentService.create('test-dup', '/home/user');
      expect(mockSpawn).toHaveBeenCalledTimes(1);

      // Try to create duplicate
      const id = agentService.create('test-dup', '/home/user');

      expect(id).toBe('test-dup');
      // Should NOT spawn a new PTY
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });

    it('should not spawn new PTY process for existing ID', () => {
      agentService.create('test-no-dup', '/home/user');
      const firstCallCount = mockSpawn.mock.calls.length;

      // Create with same ID multiple times
      agentService.create('test-no-dup', '/different/path');
      agentService.create('test-no-dup', '/another/path');

      // spawn should not have been called again
      expect(mockSpawn).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('write', () => {
    it('should write data to agent', () => {
      agentService.create('test-write', '/home/user');
      const agent = agentService.getAgent('test-write');

      agentService.write('test-write', 'ls -la');

      expect(agent?.pty.write).toHaveBeenCalledWith('ls -la');
    });

    it('should not throw for non-existent agent', () => {
      expect(() => agentService.write('non-existent', 'data')).not.toThrow();
    });
  });

  describe('resize', () => {
    it('should resize agent', () => {
      agentService.create('test-resize', '/home/user');
      const agent = agentService.getAgent('test-resize');

      agentService.resize('test-resize', 120, 40);

      expect(agent?.pty.resize).toHaveBeenCalledWith(120, 40);
    });
  });

  describe('kill', () => {
    it('should kill agent and remove from map', () => {
      agentService.create('test-kill', '/home/user');
      const agent = agentService.getAgent('test-kill');

      agentService.kill('test-kill');

      expect(agent?.pty.kill).toHaveBeenCalled();
      expect(agentService.getAgent('test-kill')).toBeUndefined();
    });
  });

  describe('getAllAgents', () => {
    it('should return all agent IDs', () => {
      agentService.create('agent-a', '/home/user');
      agentService.create('agent-b', '/home/user');

      const ids = agentService.getAllAgents();

      expect(ids).toContain('agent-a');
      expect(ids).toContain('agent-b');
    });
  });

  describe('isGitWorktree', () => {
    beforeEach(() => {
      mockExecSync.mockReset();
    });

    it('should return true when git-dir and git-common-dir differ (worktree)', () => {
      mockExecSync
        .mockReturnValueOnce('.git/worktrees/feature-branch\n')  // git-dir
        .mockReturnValueOnce('/repo/.git\n');                     // git-common-dir

      const result = agentService.isGitWorktree('/repo/worktrees/feature-branch');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it('should return false when git-dir and git-common-dir are the same (regular repo)', () => {
      mockExecSync
        .mockReturnValueOnce('.git\n')  // git-dir
        .mockReturnValueOnce('.git\n'); // git-common-dir

      const result = agentService.isGitWorktree('/repo');

      expect(result).toBe(false);
    });

    it('should return false for non-git directories', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const result = agentService.isGitWorktree('/not-a-repo');

      expect(result).toBe(false);
    });

    it('should return false when git is not available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git: command not found');
      });

      const result = agentService.isGitWorktree('/some/path');

      expect(result).toBe(false);
    });
  });
});
