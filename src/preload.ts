import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
}

const electronAPI: ElectronAPI = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
