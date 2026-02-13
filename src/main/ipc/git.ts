import { ipcMain, BrowserWindow } from 'electron';
import { gitService, GitStatusMap } from '../services/GitService';
import { fileWatcherService, GitStatusChangeEvent } from '../services/FileWatcherService';

export function setupGitIPC(): void {
  ipcMain.handle('git:isRepo', async (_event, dirPath: string): Promise<boolean> => {
    return gitService.isGitRepository(dirPath);
  });

  ipcMain.handle('git:getStatus', async (_event, dirPath: string): Promise<GitStatusMap> => {
    return gitService.getGitStatus(dirPath);
  });

  ipcMain.handle('git:getRoot', async (_event, dirPath: string): Promise<string | null> => {
    return gitService.getGitRoot(dirPath);
  });

  ipcMain.handle('git:watchRepo', async (_event, repoRoot: string): Promise<boolean> => {
    return fileWatcherService.watchGitRepo(repoRoot);
  });

  ipcMain.handle('git:unwatchRepo', async (_event, repoRoot: string): Promise<void> => {
    fileWatcherService.unwatchGitRepo(repoRoot);
  });

  // Set up event forwarding to renderer for git status changes
  fileWatcherService.onGitStatusChanged((event: GitStatusChangeEvent) => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      fileWatcherService.sendGitStatusToWindow(window, event);
    }
  });
}
