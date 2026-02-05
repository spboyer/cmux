export interface Terminal {
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
  parentTerminalId: string;
}

export interface FileWatchEvent {
  type: 'change' | 'rename';
  directory: string;
  filename: string | null;
}

export interface AppState {
  terminals: Terminal[];
  activeItemId: string | null;
  activeTerminalId: string | null;
}

export interface SessionData {
  version: number;
  terminals: Terminal[];
  activeItemId: string | null;
  activeTerminalId: string | null;
}

export type AppAction =
  | { type: 'ADD_TERMINAL'; payload: { id: string; label: string; cwd: string; isWorktree?: boolean } }
  | { type: 'REMOVE_TERMINAL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TERMINAL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_ITEM'; payload: { id: string; terminalId?: string } }
  | { type: 'ADD_FILE'; payload: { terminalId: string; file: OpenFile } }
  | { type: 'REMOVE_FILE'; payload: { terminalId: string; fileId: string } }
  | { type: 'RENAME_TERMINAL'; payload: { id: string; label: string } };

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
