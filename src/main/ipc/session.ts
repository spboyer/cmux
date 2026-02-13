import { ipcMain } from 'electron';
import { sessionService, SessionData } from '../services/SessionService';

export function setupSessionIPC(): void {
  ipcMain.handle('session:save', (_event, data: Omit<SessionData, 'version'>) => {
    sessionService.save(data);
  });

  ipcMain.handle('session:load', (): SessionData | null => {
    return sessionService.load();
  });
}
