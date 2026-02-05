// AgentService using node-pty for proper PTY support
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import * as os from 'os';
import { execSync } from 'child_process';

interface AgentInstance {
  id: string;
  pty: pty.IPty;
  cwd: string;
}

class AgentService {
  private agents: Map<string, AgentInstance> = new Map();

  getDefaultShell(): string {
    if (os.platform() === 'win32') {
      return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * Detect if a directory is a git worktree.
   * Compares git-dir vs git-common-dir - if they differ, it's a worktree.
   */
  isGitWorktree(cwd: string): boolean {
    try {
      const gitDir = execSync('git rev-parse --git-dir', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      const gitCommonDir = execSync('git rev-parse --git-common-dir', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      // In a worktree, git-dir points to .git/worktrees/<name>, while git-common-dir points to the main .git
      return gitDir !== gitCommonDir;
    } catch {
      // Not a git repo or git not available
      return false;
    }
  }

  create(id: string, cwd: string): string {
    // Return existing agent if already created (prevents duplicate PTY on session restore)
    if (this.agents.has(id)) {
      return id;
    }

    const shell = this.getDefaultShell();
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as { [key: string]: string },
    });

    const instance: AgentInstance = {
      id,
      pty: ptyProcess,
      cwd,
    };

    this.agents.set(id, instance);
    return id;
  }

  write(id: string, data: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pty.write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pty.resize(cols, rows);
    }
  }

  kill(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pty.kill();
      this.agents.delete(id);
    }
  }

  onData(id: string, callback: (data: string) => void): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pty.onData(callback);
    }
  }

  onExit(id: string, callback: (exitCode: number) => void): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pty.onExit(({ exitCode }) => {
        callback(exitCode);
        this.agents.delete(id);
      });
    }
  }

  getAgent(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

export const agentService = new AgentService();
