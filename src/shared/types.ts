export interface Terminal {
  id: string;
  label: string;
  cwd: string;
  openFiles: OpenFile[];
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

export type AppAction =
  | { type: 'ADD_TERMINAL'; payload: { id: string; label: string; cwd: string } }
  | { type: 'REMOVE_TERMINAL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TERMINAL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_ITEM'; payload: { id: string; terminalId?: string } }
  | { type: 'ADD_FILE'; payload: { terminalId: string; file: OpenFile } }
  | { type: 'REMOVE_FILE'; payload: { terminalId: string; fileId: string } }
  | { type: 'RENAME_TERMINAL'; payload: { id: string; label: string } };
