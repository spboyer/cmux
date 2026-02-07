import { contextBridge, ipcRenderer } from 'electron';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface FileWatchEvent {
  type: 'change' | 'rename';
  directory: string;
  filename: string | null;
}

// Git status types
export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored' | 'staged' | 'renamed';
export type GitStatusMap = Record<string, GitFileStatus>;

export interface SessionData {
  version: number;
  agents: Array<{
    id: string;
    label: string;
    cwd: string;
    openFiles: Array<{
      id: string;
      path: string;
      name: string;
      parentAgentId: string;
    }>;
  }>;
  activeItemId: string | null;
  activeAgentId: string | null;
  activeConversationId: string | null;
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  agent: {
    create: (id: string, cwd: string) => Promise<{ id: string; isWorktree: boolean }>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    kill: (id: string) => Promise<void>;
    onData: (callback: (id: string, data: string) => void) => () => void;
    onExit: (callback: (id: string, exitCode: number) => void) => () => void;
  };
  fs: {
    readDirectory: (dirPath: string) => Promise<FileEntry[]>;
    readFile: (filePath: string) => Promise<string>;
    addAllowedRoot: (rootPath: string) => Promise<void>;
    watchDirectory: (dirPath: string) => Promise<boolean>;
    unwatchDirectory: (dirPath: string) => Promise<void>;
    unwatchAll: () => Promise<void>;
    onDirectoryChanged: (callback: (event: FileWatchEvent) => void) => () => void;
  };
  git: {
    isRepo: (dirPath: string) => Promise<boolean>;
    getStatus: (dirPath: string) => Promise<GitStatusMap>;
    getRoot: (dirPath: string) => Promise<string | null>;
    watchRepo: (repoRoot: string) => Promise<boolean>;
    unwatchRepo: (repoRoot: string) => Promise<void>;
    onStatusChanged: (callback: (event: { repoRoot: string }) => void) => () => void;
  };
  session: {
    save: (data: Omit<SessionData, 'version'>) => Promise<void>;
    load: () => Promise<SessionData | null>;
  };
  conversation: {
    list: () => Promise<Array<{ id: string; title: string; createdAt: number; updatedAt: number }>>;
    load: (id: string) => Promise<{ id: string; title: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>; createdAt: number; updatedAt: number } | null>;
    save: (data: { id: string; title: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>; createdAt: number; updatedAt: number }) => Promise<void>;
    delete: (id: string) => Promise<void>;
    rename: (id: string, title: string) => Promise<void>;
  };
  updates: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => void;
    onStatus: (callback: (data: { status: string; info?: unknown; message?: string }) => void) => () => void;
    onProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
  };
  copilot: {
    send: (conversationId: string, message: string, messageId: string) => Promise<void>;
    onChunk: (callback: (messageId: string, content: string) => void) => () => void;
    onDone: (callback: (messageId: string) => void) => () => void;
    onError: (callback: (messageId: string, error: string) => void) => () => void;
  };
}

const electronAPI: ElectronAPI = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  agent: {
    create: (id, cwd) => ipcRenderer.invoke('agent:create', id, cwd),
    write: (id, data) => ipcRenderer.invoke('agent:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('agent:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('agent:kill', id),
    onData: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) => {
        callback(id, data);
      };
      ipcRenderer.on('agent:data', handler);
      return () => {
        ipcRenderer.removeListener('agent:data', handler);
      };
    },
    onExit: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) => {
        callback(id, exitCode);
      };
      ipcRenderer.on('agent:exit', handler);
      return () => {
        ipcRenderer.removeListener('agent:exit', handler);
      };
    },
  },
  fs: {
    readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    addAllowedRoot: (rootPath) => ipcRenderer.invoke('fs:addAllowedRoot', rootPath),
    watchDirectory: (dirPath) => ipcRenderer.invoke('fs:watchDirectory', dirPath),
    unwatchDirectory: (dirPath) => ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
    unwatchAll: () => ipcRenderer.invoke('fs:unwatchAll'),
    onDirectoryChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, watchEvent: FileWatchEvent) => {
        callback(watchEvent);
      };
      ipcRenderer.on('fs:directoryChanged', handler);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('fs:directoryChanged', handler);
      };
    },
  },
  git: {
    isRepo: (dirPath) => ipcRenderer.invoke('git:isRepo', dirPath),
    getStatus: (dirPath) => ipcRenderer.invoke('git:getStatus', dirPath),
    getRoot: (dirPath) => ipcRenderer.invoke('git:getRoot', dirPath),
    watchRepo: (repoRoot) => ipcRenderer.invoke('git:watchRepo', repoRoot),
    unwatchRepo: (repoRoot) => ipcRenderer.invoke('git:unwatchRepo', repoRoot),
    onStatusChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, event: { repoRoot: string }) => {
        callback(event);
      };
      ipcRenderer.on('git:statusChanged', handler);
      return () => {
        ipcRenderer.removeListener('git:statusChanged', handler);
      };
    },
  },
  session: {
    save: (data) => ipcRenderer.invoke('session:save', data),
    load: () => ipcRenderer.invoke('session:load'),
  },
  conversation: {
    list: () => ipcRenderer.invoke('conversation:list'),
    load: (id) => ipcRenderer.invoke('conversation:load', id),
    save: (data) => ipcRenderer.invoke('conversation:save', data),
    delete: (id) => ipcRenderer.invoke('conversation:delete', id),
    rename: (id, title) => ipcRenderer.invoke('conversation:rename', id, title),
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatus: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { status: string; info?: unknown; message?: string }) => {
        callback(data);
      };
      ipcRenderer.on('updates:status', handler);
      return () => {
        ipcRenderer.removeListener('updates:status', handler);
      };
    },
    onProgress: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => {
        callback(progress);
      };
      ipcRenderer.on('updates:progress', handler);
      return () => {
        ipcRenderer.removeListener('updates:progress', handler);
      };
    },
  },
  copilot: {
    send: (conversationId, message, messageId) => ipcRenderer.invoke('copilot:send', conversationId, message, messageId),
    onChunk: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, messageId: string, content: string) => {
        callback(messageId, content);
      };
      ipcRenderer.on('copilot:chunk', handler);
      return () => {
        ipcRenderer.removeListener('copilot:chunk', handler);
      };
    },
    onDone: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, messageId: string) => {
        callback(messageId);
      };
      ipcRenderer.on('copilot:done', handler);
      return () => {
        ipcRenderer.removeListener('copilot:done', handler);
      };
    },
    onError: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, messageId: string, error: string) => {
        callback(messageId, error);
      };
      ipcRenderer.on('copilot:error', handler);
      return () => {
        ipcRenderer.removeListener('copilot:error', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
