import { ipcMain } from 'electron';
import { conversationService } from '../services/ConversationService';
import { ConversationData } from '../../shared/types';

export function setupConversationIPC(): void {
  ipcMain.handle('conversation:list', () => {
    return conversationService.list();
  });

  ipcMain.handle('conversation:load', (_event, id: string) => {
    return conversationService.load(id);
  });

  ipcMain.handle('conversation:save', (_event, data: ConversationData) => {
    return conversationService.save(data);
  });

  ipcMain.handle('conversation:delete', (_event, id: string) => {
    return conversationService.delete(id);
  });

  ipcMain.handle('conversation:rename', (_event, id: string, title: string) => {
    return conversationService.rename(id, title);
  });
}
