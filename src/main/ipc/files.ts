import { ipcMain, BrowserWindow } from 'electron';
import { fileService, FileEntry } from '../services/FileService';
import { fileWatcherService, FileWatchEvent } from '../services/FileWatcherService';

export function setupFileIPC(): void {
  ipcMain.handle('fs:readDirectory', async (_event, dirPath: string, showHidden?: boolean): Promise<FileEntry[]> => {
    return fileService.readDirectory(dirPath, { showHidden });
  });

  ipcMain.handle('fs:readFile', async (_event, filePath: string): Promise<string> => {
    return fileService.readFile(filePath);
  });

  ipcMain.handle('fs:addAllowedRoot', async (_event, rootPath: string): Promise<void> => {
    fileService.addAllowedRoot(rootPath);
  });

  ipcMain.handle('fs:watchDirectory', async (_event, dirPath: string): Promise<boolean> => {
    return fileWatcherService.watchDirectory(dirPath);
  });

  ipcMain.handle('fs:unwatchDirectory', async (_event, dirPath: string): Promise<void> => {
    fileWatcherService.unwatchDirectory(dirPath);
  });

  ipcMain.handle('fs:unwatchAll', async (): Promise<void> => {
    fileWatcherService.unwatchAll();
  });

  // Set up event forwarding to renderer
  fileWatcherService.onDirectoryChanged((event: FileWatchEvent) => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      fileWatcherService.sendToWindow(window, event);
    }
  });
}
