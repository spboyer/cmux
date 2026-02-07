export interface Agent {
  id: string;
  label: string;
  cwd: string;
  openFiles: OpenFile[];
  isWorktree?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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

export type ViewMode = 'agents' | 'chat';

export interface AppState {
  agents: Agent[];
  activeItemId: string | null;
  activeAgentId: string | null;
  viewMode: ViewMode;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
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
  | { type: 'RENAME_AGENT'; payload: { id: string; label: string } }
  | { type: 'SET_VIEW_MODE'; payload: { mode: ViewMode } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: { message: ChatMessage } }
  | { type: 'APPEND_CHAT_CHUNK'; payload: { messageId: string; content: string } }
  | { type: 'SET_CHAT_LOADING'; payload: { loading: boolean } };

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

// Git status types
export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored' | 'staged' | 'renamed';
export type GitStatusMap = Record<string, GitFileStatus>;
