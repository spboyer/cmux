import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import type { FileWatchEvent, GitStatusChangeEvent } from '../../shared/types';

export type { FileWatchEvent };
export type { GitStatusChangeEvent };

type WatcherCallback = (event: FileWatchEvent) => void;
type GitStatusCallback = (event: GitStatusChangeEvent) => void;

class FileWatcherService {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private gitWatchers: Map<string, fs.FSWatcher> = new Map();
  private callbacks: Set<WatcherCallback> = new Set();
  private gitCallbacks: Set<GitStatusCallback> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private gitDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 100;
  private readonly GIT_DEBOUNCE_MS = 200;

  /**
   * Start watching a directory for changes
   */
  watchDirectory(dirPath: string): boolean {
    if (this.watchers.has(dirPath)) {
      return true; // Already watching
    }

    try {
      const normalizedPath = path.normalize(dirPath);
      const watcher = fs.watch(normalizedPath, { persistent: false }, (eventType, filename) => {
        this.handleFileChange(normalizedPath, eventType, filename);
      });

      watcher.on('error', (err) => {
        console.error(`Watcher error for ${normalizedPath}:`, err);
        this.unwatchDirectory(normalizedPath);
      });

      this.watchers.set(normalizedPath, watcher);
      return true;
    } catch (err) {
      console.error(`Failed to watch directory ${dirPath}:`, err);
      return false;
    }
  }

  /**
   * Stop watching a directory
   */
  unwatchDirectory(dirPath: string): void {
    const normalizedPath = path.normalize(dirPath);
    const watcher = this.watchers.get(normalizedPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(normalizedPath);
    }
    
    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(normalizedPath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(normalizedPath);
    }
  }

  /**
   * Stop watching all directories
   */
  unwatchAll(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    
    for (const watcher of this.gitWatchers.values()) {
      watcher.close();
    }
    this.gitWatchers.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    for (const timer of this.gitDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.gitDebounceTimers.clear();
  }

  /**
   * Register a callback for file change events
   */
  onDirectoryChanged(callback: WatcherCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Send change events to a specific browser window
   */
  sendToWindow(window: BrowserWindow, event: FileWatchEvent): void {
    if (!window.isDestroyed()) {
      window.webContents.send('fs:directoryChanged', event);
    }
  }

  /**
   * Start watching a git repository's index for status changes
   */
  watchGitRepo(repoRoot: string): boolean {
    if (this.gitWatchers.has(repoRoot)) {
      return true; // Already watching
    }

    try {
      const gitDir = path.join(repoRoot, '.git');
      
      // Check if .git directory exists
      if (!fs.existsSync(gitDir)) {
        return false;
      }

      // Watch the .git directory for changes to index, HEAD, etc.
      const watcher = fs.watch(gitDir, { persistent: false }, (eventType, filename) => {
        // Only trigger on relevant git files
        if (filename === 'index' || filename === 'HEAD' || filename?.startsWith('refs')) {
          this.handleGitChange(repoRoot);
        }
      });

      watcher.on('error', (err) => {
        console.error(`Git watcher error for ${repoRoot}:`, err);
        this.unwatchGitRepo(repoRoot);
      });

      this.gitWatchers.set(repoRoot, watcher);
      return true;
    } catch (err) {
      console.error(`Failed to watch git repo ${repoRoot}:`, err);
      return false;
    }
  }

  /**
   * Stop watching a git repository
   */
  unwatchGitRepo(repoRoot: string): void {
    const watcher = this.gitWatchers.get(repoRoot);
    if (watcher) {
      watcher.close();
      this.gitWatchers.delete(repoRoot);
    }
    
    const timer = this.gitDebounceTimers.get(repoRoot);
    if (timer) {
      clearTimeout(timer);
      this.gitDebounceTimers.delete(repoRoot);
    }
  }

  /**
   * Register a callback for git status change events
   */
  onGitStatusChanged(callback: GitStatusCallback): () => void {
    this.gitCallbacks.add(callback);
    return () => this.gitCallbacks.delete(callback);
  }

  /**
   * Send git status change events to a specific browser window
   */
  sendGitStatusToWindow(window: BrowserWindow, event: GitStatusChangeEvent): void {
    if (!window.isDestroyed()) {
      window.webContents.send('git:statusChanged', event);
    }
  }

  private handleGitChange(repoRoot: string): void {
    // Debounce rapid git changes
    const existingTimer = this.gitDebounceTimers.get(repoRoot);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.gitDebounceTimers.delete(repoRoot);
      
      const event: GitStatusChangeEvent = {
        type: 'git-status-changed',
        repoRoot,
      };

      // Notify all registered callbacks
      for (const callback of this.gitCallbacks) {
        try {
          callback(event);
        } catch (err) {
          console.error('Error in git status callback:', err);
        }
      }
    }, this.GIT_DEBOUNCE_MS);

    this.gitDebounceTimers.set(repoRoot, timer);
  }

  private handleFileChange(directory: string, eventType: string, filename: string | null): void {
    // Debounce rapid changes to the same directory
    const key = `${directory}:${filename || ''}`;
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      
      const event: FileWatchEvent = {
        type: eventType === 'rename' ? 'rename' : 'change',
        directory,
        filename,
      };

      // Notify all registered callbacks
      for (const callback of this.callbacks) {
        try {
          callback(event);
        } catch (err) {
          console.error('Error in file watcher callback:', err);
        }
      }
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }
}

export const fileWatcherService = new FileWatcherService();
