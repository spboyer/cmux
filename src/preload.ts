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

export interface SessionData {
  version: number;
  terminals: Array<{
    id: string;
    label: string;
    cwd: string;
    openFiles: Array<{
      id: string;
      path: string;
      name: string;
      parentTerminalId: string;
    }>;
  }>;
  activeItemId: string | null;
  activeTerminalId: string | null;
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  terminal: {
    create: (id: string, cwd: string) => Promise<string>;
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
  session: {
    save: (data: Omit<SessionData, 'version'>) => Promise<void>;
    load: () => Promise<SessionData | null>;
  };
  updates: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => void;
    onStatus: (callback: (data: { status: string; info?: unknown; message?: string }) => void) => () => void;
    onProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
  };
}

const electronAPI: ElectronAPI = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  terminal: {
    create: (id, cwd) => ipcRenderer.invoke('terminal:create', id, cwd),
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    onData: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) => {
        callback(id, data);
      };
      ipcRenderer.on('terminal:data', handler);
      return () => {
        ipcRenderer.removeListener('terminal:data', handler);
      };
    },
    onExit: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) => {
        callback(id, exitCode);
      };
      ipcRenderer.on('terminal:exit', handler);
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler);
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
  session: {
    save: (data) => ipcRenderer.invoke('session:save', data),
    load: () => ipcRenderer.invoke('session:load'),
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
