export interface Agent {
  id: string;
  label: string;
  cwd: string;
  openFiles: OpenFile[];
  isWorktree?: boolean;
}

export interface OpenFile {
  id: string;
  path: string;
  name: string;
  parentAgentId: string;
}

export interface FileWatchEvent {
  type: 'change' | 'rename';
  directory: string;
  filename: string | null;
}

export interface AppState {
  agents: Agent[];
  activeItemId: string | null;
  activeAgentId: string | null;
}

export interface SessionData {
  version: number;
  agents: Agent[];
  activeItemId: string | null;
  activeAgentId: string | null;
}

export type AppAction =
  | { type: 'ADD_AGENT'; payload: { id: string; label: string; cwd: string; isWorktree?: boolean } }
  | { type: 'REMOVE_AGENT'; payload: { id: string } }
  | { type: 'SET_ACTIVE_AGENT'; payload: { id: string } }
  | { type: 'SET_ACTIVE_ITEM'; payload: { id: string; agentId?: string } }
  | { type: 'ADD_FILE'; payload: { agentId: string; file: OpenFile } }
  | { type: 'REMOVE_FILE'; payload: { agentId: string; fileId: string } }
  | { type: 'RENAME_AGENT'; payload: { id: string; label: string } };

// Auto-update types
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error' | 'dev-mode';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string | null;
  releaseDate?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateState {
  status: UpdateStatus;
  info?: UpdateInfo;
  progress?: DownloadProgress;
  error?: string;
}
