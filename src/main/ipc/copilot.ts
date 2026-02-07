import { ipcMain, BrowserWindow } from 'electron';
import { CopilotService } from '../services/CopilotService';

const copilotService = new CopilotService();

export function setupCopilotIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle('copilot:listModels', async () => {
    return copilotService.listModels();
  });

  ipcMain.handle('copilot:send', async (_event, conversationId: string, message: string, messageId: string, model?: string) => {
    await copilotService.sendMessage(
      conversationId,
      message,
      messageId,
      (msgId, content) => {
        mainWindow.webContents.send('copilot:chunk', msgId, content);
      },
      (msgId) => {
        mainWindow.webContents.send('copilot:done', msgId);
      },
      (msgId, error) => {
        mainWindow.webContents.send('copilot:error', msgId, error);
      },
      model,
    );
  });

  ipcMain.handle('copilot:stop', async (_event, conversationId: string, messageId: string) => {
    await copilotService.cancelMessage(
      conversationId,
      messageId,
      (msgId) => {
        mainWindow.webContents.send('copilot:done', msgId);
      },
    );
  });
}

export function getCopilotService(): CopilotService {
  return copilotService;
}
