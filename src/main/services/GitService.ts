import { spawn } from 'child_process';
import * as path from 'path';
import type { GitFileStatus, GitStatusMap } from '../../shared/types';

export type { GitFileStatus, GitStatusMap };

class GitService {
  /**
   * Execute a git command and return stdout
   */
  private async execGit(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, {
        cwd,
        shell: true,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `git exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Check if a directory is inside a git repository
   */
  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--git-dir'], dirPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the root directory of the git repository
   */
  async getGitRoot(dirPath: string): Promise<string | null> {
    try {
      const result = await this.execGit(['rev-parse', '--show-toplevel'], dirPath);
      return result.trim();
    } catch {
      return null;
    }
  }

  /**
   * Parse git status porcelain output into a status map
   * Format: XY PATH or XY ORIG -> PATH (for renames)
   * X = index status, Y = worktree status
   */
  private parseStatusOutput(output: string, repoRoot: string): GitStatusMap {
    const statusMap: GitStatusMap = {};
    const lines = output.split('\n').filter(line => line.length > 0);

    for (const line of lines) {
      const indexStatus = line[0];
      const worktreeStatus = line[1];
      let filePath = line.substring(3);

      // Handle renames: "R  old -> new"
      if (filePath.includes(' -> ')) {
        filePath = filePath.split(' -> ')[1];
      }

      // Convert to absolute path
      const absolutePath = path.join(repoRoot, filePath);

      // Determine the status (worktree status takes precedence for display)
      const status = this.determineStatus(indexStatus, worktreeStatus);
      if (status) {
        statusMap[absolutePath] = status;
      }
    }

    return statusMap;
  }

  /**
   * Determine the display status from index and worktree status codes
   */
  private determineStatus(indexStatus: string, worktreeStatus: string): GitFileStatus | null {
    // Untracked files
    if (indexStatus === '?' && worktreeStatus === '?') {
      return 'untracked';
    }

    // Ignored files
    if (indexStatus === '!' && worktreeStatus === '!') {
      return 'ignored';
    }

    // Worktree modifications take visual precedence (unstaged changes)
    if (worktreeStatus === 'M') {
      return 'modified';
    }
    if (worktreeStatus === 'D') {
      return 'deleted';
    }

    // Index (staged) changes
    if (indexStatus === 'M') {
      return 'staged';
    }
    if (indexStatus === 'A') {
      return 'added';
    }
    if (indexStatus === 'D') {
      return 'deleted';
    }
    if (indexStatus === 'R') {
      return 'renamed';
    }

    return null;
  }

  /**
   * Get git status for all files in a repository
   * Returns a map of absolute file paths to their git status
   */
  async getGitStatus(dirPath: string): Promise<GitStatusMap> {
    try {
      const repoRoot = await this.getGitRoot(dirPath);
      if (!repoRoot) {
        return {};
      }

      // Get status including untracked files, but not ignored
      const output = await this.execGit(
        ['status', '--porcelain', '-uall'],
        repoRoot
      );

      return this.parseStatusOutput(output, repoRoot);
    } catch (error) {
      console.error('Error getting git status:', error);
      return {};
    }
  }

  /**
   * Get git status including ignored files
   */
  async getGitStatusWithIgnored(dirPath: string): Promise<GitStatusMap> {
    try {
      const repoRoot = await this.getGitRoot(dirPath);
      if (!repoRoot) {
        return {};
      }

      // Get status including untracked and ignored files
      const output = await this.execGit(
        ['status', '--porcelain', '-uall', '--ignored'],
        repoRoot
      );

      return this.parseStatusOutput(output, repoRoot);
    } catch (error) {
      console.error('Error getting git status with ignored:', error);
      return {};
    }
  }
}

export const gitService = new GitService();
