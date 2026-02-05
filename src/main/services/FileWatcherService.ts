import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';

export interface FileWatchEvent {
  type: 'change' | 'rename';
  directory: string;
  filename: string | null;
}

type WatcherCallback = (event: FileWatchEvent) => void;

class FileWatcherService {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private callbacks: Set<WatcherCallback> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 100;

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
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
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
   * Get list of currently watched directories
   */
  getWatchedDirectories(): string[] {
    return Array.from(this.watchers.keys());
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
