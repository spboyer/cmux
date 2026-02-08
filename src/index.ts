import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { setupAgentIPC } from './main/ipc/agent';
import { setupFileIPC } from './main/ipc/files';
import { setupGitIPC } from './main/ipc/git';
import { setupSessionIPC } from './main/ipc/session';
import { setupUpdatesIPC, getUpdateService } from './main/ipc/updates';
import { setupCopilotIPC, getCopilotService } from './main/ipc/copilot';
import { setupConversationIPC } from './main/ipc/conversation';
import { setupAgentSessionIPC } from './main/ipc/agent-session';
import { stopSharedClient } from './main/services/SdkLoader';
import { agentSessionService } from './main/services/AgentSessionService';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
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

  // Set up git IPC handlers
  setupGitIPC();

  // Set up session IPC handlers
  setupSessionIPC();

  // Set up auto-update IPC handlers
  setupUpdatesIPC(mainWindow);

  // Set up Copilot chat IPC handlers
  setupCopilotIPC(mainWindow);

  // Set up conversation persistence IPC handlers
  setupConversationIPC();

  // Set up agent session (SDK-driven) IPC handlers
  setupAgentSessionIPC(mainWindow);

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

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  getCopilotService().stop().catch(() => {});
  agentSessionService.destroyAll().catch(() => {});
  stopSharedClient().catch(() => {});
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
