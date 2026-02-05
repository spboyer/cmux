import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { setupAgentIPC } from './main/ipc/agent';
import { setupFileIPC } from './main/ipc/files';
import { setupSessionIPC } from './main/ipc/session';
import { setupUpdatesIPC, getUpdateService } from './main/ipc/updates';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161b22',
      symbolColor: '#8b949e',
      height: 32,
    },
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // DevTools can be opened manually with Ctrl+Shift+I

  // Set up agent IPC handlers
  setupAgentIPC(mainWindow);
  
  // Set up file system IPC handlers
  setupFileIPC();

  // Set up session IPC handlers
  setupSessionIPC();

  // Set up auto-update IPC handlers
  setupUpdatesIPC(mainWindow);

  // Check for updates after window is ready (give it a moment to load)
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      getUpdateService()?.checkForUpdates();
    }, 3000);
  });
};

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
