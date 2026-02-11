import { contextBridge, ipcRenderer } from 'electron';
import { createIpcListener } from './createIpcListener';
import type { FileEntry, FileWatchEvent, GitFileStatus, GitStatusMap, SessionData } from './shared/types';

export type { FileEntry, FileWatchEvent, GitFileStatus, GitStatusMap, SessionData };

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  agent: {
    create: (id: string, cwd: string, initialCommand?: string) => Promise<{ id: string; isWorktree: boolean }>;
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
    list: () => Promise<Array<{ id: string; title: string; model?: string; createdAt: number; updatedAt: number }>>;
    load: (id: string) => Promise<{ id: string; title: string; model?: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>; createdAt: number; updatedAt: number } | null>;
    save: (data: { id: string; title: string; model?: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>; createdAt: number; updatedAt: number }) => Promise<void>;
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
    listModels: () => Promise<Array<{ id: string; name: string }>>;
    send: (conversationId: string, message: string, messageId: string, model?: string) => Promise<void>;
    stop: (conversationId: string, messageId: string) => Promise<void>;
    onChunk: (callback: (messageId: string, content: string) => void) => () => void;
    onDone: (callback: (messageId: string) => void) => () => void;
    onError: (callback: (messageId: string, error: string) => void) => () => void;
  };
  config: {
    autoCopilot: boolean;
  };
  agentSession: {
    create: (agentId: string, cwd: string, model?: string) => Promise<void>;
    send: (agentId: string, prompt: string) => Promise<void>;
    stop: (agentId: string) => Promise<void>;
    destroy: (agentId: string) => Promise<void>;
    registerAgent: (agentId: string, label: string, cwd: string) => Promise<void>;
    onEvent: (callback: (agentId: string, event: unknown) => void) => () => void;
    onPermissionRequest: (callback: (agentId: string, request: { toolCallId?: string; kind: string }) => void) => () => void;
    respondPermission: (agentId: string, toolCallId: string, decision: string) => Promise<void>;
    onAgentCreated: (callback: (info: { agentId: string; label: string; cwd: string }) => void) => () => void;
  };
}

const electronAPI: ElectronAPI = {
  config: {
    autoCopilot: !!process.env.VP_AUTO_COPILOT,
  },
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  agent: {
    create: (id, cwd, initialCommand) => ipcRenderer.invoke('agent:create', id, cwd, initialCommand),
    write: (id, data) => ipcRenderer.invoke('agent:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('agent:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('agent:kill', id),
    onData: (callback) => createIpcListener(ipcRenderer, 'agent:data', callback),
    onExit: (callback) => createIpcListener(ipcRenderer, 'agent:exit', callback),
  },
  fs: {
    readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    addAllowedRoot: (rootPath) => ipcRenderer.invoke('fs:addAllowedRoot', rootPath),
    watchDirectory: (dirPath) => ipcRenderer.invoke('fs:watchDirectory', dirPath),
    unwatchDirectory: (dirPath) => ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
    unwatchAll: () => ipcRenderer.invoke('fs:unwatchAll'),
    onDirectoryChanged: (callback) => createIpcListener(ipcRenderer, 'fs:directoryChanged', callback),
  },
  git: {
    isRepo: (dirPath) => ipcRenderer.invoke('git:isRepo', dirPath),
    getStatus: (dirPath) => ipcRenderer.invoke('git:getStatus', dirPath),
    getRoot: (dirPath) => ipcRenderer.invoke('git:getRoot', dirPath),
    watchRepo: (repoRoot) => ipcRenderer.invoke('git:watchRepo', repoRoot),
    unwatchRepo: (repoRoot) => ipcRenderer.invoke('git:unwatchRepo', repoRoot),
    onStatusChanged: (callback) => createIpcListener(ipcRenderer, 'git:statusChanged', callback),
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
    onStatus: (callback) => createIpcListener(ipcRenderer, 'updates:status', callback),
    onProgress: (callback) => createIpcListener(ipcRenderer, 'updates:progress', callback),
  },
  copilot: {
    listModels: () => ipcRenderer.invoke('copilot:listModels'),
    send: (conversationId, message, messageId, model) => ipcRenderer.invoke('copilot:send', conversationId, message, messageId, model),
    stop: (conversationId, messageId) => ipcRenderer.invoke('copilot:stop', conversationId, messageId),
    onChunk: (callback) => createIpcListener(ipcRenderer, 'copilot:chunk', callback),
    onDone: (callback) => createIpcListener(ipcRenderer, 'copilot:done', callback),
    onError: (callback) => createIpcListener(ipcRenderer, 'copilot:error', callback),
  },
  agentSession: {
    create: (agentId, cwd, model) => ipcRenderer.invoke('agent-session:create', agentId, cwd, model),
    send: (agentId, prompt) => ipcRenderer.invoke('agent-session:send', agentId, prompt),
    stop: (agentId) => ipcRenderer.invoke('agent-session:stop', agentId),
    destroy: (agentId) => ipcRenderer.invoke('agent-session:destroy', agentId),
    registerAgent: (agentId, label, cwd) => ipcRenderer.invoke('orchestrator:register-agent', agentId, label, cwd),
    onEvent: (callback) => createIpcListener(ipcRenderer, 'agent-session:event', callback),
    onPermissionRequest: (callback) => createIpcListener(ipcRenderer, 'agent-session:permission-request', callback),
    respondPermission: (agentId, toolCallId, decision) =>
      ipcRenderer.invoke('agent-session:permission-respond', agentId, toolCallId, decision),
    onAgentCreated: (callback) => createIpcListener(ipcRenderer, 'orchestrator:agent-created', callback),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
