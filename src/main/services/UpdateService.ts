import { app } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

export type UpdateStatusType = 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error' | 'dev-mode';

export interface UpdateStatusPayload {
  status: UpdateStatusType;
  info?: UpdateInfo;
  message?: string;
}

export type SendToRendererFn = (channel: string, data: UpdateStatusPayload | ProgressInfo) => void;

export class UpdateService {
  private sendToRenderer: SendToRendererFn;

  constructor(sendToRenderer: SendToRendererFn) {
    this.sendToRenderer = sendToRenderer;
    
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.sendToRenderer('updates:status', {
        status: 'available',
        info,
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.sendToRenderer('updates:status', {
        status: 'not-available',
      });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.sendToRenderer('updates:progress', progress);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.sendToRenderer('updates:status', {
        status: 'ready',
        info,
      });
    });

    autoUpdater.on('error', (error: Error) => {
      this.sendToRenderer('updates:status', {
        status: 'error',
        message: error.message,
      });
    });
  }

  async checkForUpdates(): Promise<void> {
    // Skip update check in development mode
    if (!app.isPackaged) {
      this.sendToRenderer('updates:status', {
        status: 'dev-mode',
        message: 'Updates disabled in development mode',
      });
      return;
    }

    this.sendToRenderer('updates:status', {
      status: 'checking',
    });

    await autoUpdater.checkForUpdates();
  }

  async downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}
