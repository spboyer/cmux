import { ipcMain, BrowserWindow } from 'electron';
import { UpdateService } from '../services/UpdateService';

let updateService: UpdateService | null = null;

export function setupUpdatesIPC(mainWindow: BrowserWindow): void {
  // Create the update service with a function to send messages to renderer
  const sendToRenderer = (channel: string, data: unknown) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  };

  updateService = new UpdateService(sendToRenderer);

  // Check for updates (called automatically on app start, can also be triggered manually)
  ipcMain.handle('updates:check', async () => {
    await updateService?.checkForUpdates();
  });

  // Download the available update
  ipcMain.handle('updates:download', async () => {
    await updateService?.downloadUpdate();
  });

  // Quit and install the downloaded update
  ipcMain.handle('updates:install', () => {
    updateService?.quitAndInstall();
  });
}

export function getUpdateService(): UpdateService | null {
  return updateService;
}
