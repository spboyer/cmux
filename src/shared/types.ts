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

export interface ModelInfo {
  id: string;
  name: string;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationData {
  id: string;
  title: string;
  model?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
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
  conversations: Conversation[];
  activeConversationId: string | null;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  availableModels: ModelInfo[];
  selectedModel: string | null;
}

export interface SessionData {
  version: number;
  agents: Agent[];
  activeItemId: string | null;
  activeAgentId: string | null;
  activeConversationId: string | null;
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
  | { type: 'SET_CHAT_LOADING'; payload: { loading: boolean } }
  | { type: 'SET_CONVERSATIONS'; payload: { conversations: Conversation[] } }
  | { type: 'ADD_CONVERSATION'; payload: { conversation: Conversation } }
  | { type: 'REMOVE_CONVERSATION'; payload: { id: string } }
  | { type: 'RENAME_CONVERSATION'; payload: { id: string; title: string } }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: { id: string | null } }
  | { type: 'SET_CHAT_MESSAGES'; payload: { messages: ChatMessage[] } }
  | { type: 'SET_AVAILABLE_MODELS'; payload: { models: ModelInfo[] } }
  | { type: 'SET_SELECTED_MODEL'; payload: { model: string | null } };

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
