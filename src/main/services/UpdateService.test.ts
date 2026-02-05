import { EventEmitter } from 'events';

// Create mock autoUpdater
const mockAutoUpdater = new EventEmitter() as EventEmitter & {
  checkForUpdates: jest.Mock;
  downloadUpdate: jest.Mock;
  quitAndInstall: jest.Mock;
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
};
mockAutoUpdater.checkForUpdates = jest.fn();
mockAutoUpdater.downloadUpdate = jest.fn();
mockAutoUpdater.quitAndInstall = jest.fn();
mockAutoUpdater.autoDownload = false;
mockAutoUpdater.autoInstallOnAppQuit = true;

jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock electron app
const mockApp = {
  isPackaged: true,
};

jest.mock('electron', () => ({
  app: mockApp,
}));

// Import after mocking
import { UpdateService } from './UpdateService';

describe('UpdateService', () => {
  let updateService: UpdateService;
  let mockSendToRenderer: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAutoUpdater.removeAllListeners();
    mockApp.isPackaged = true;
    mockSendToRenderer = jest.fn();
    updateService = new UpdateService(mockSendToRenderer);
  });

  describe('initialization', () => {
    it('should initialize without error', () => {
      expect(updateService).toBeDefined();
    });

    it('should set autoDownload to false', () => {
      expect(mockAutoUpdater.autoDownload).toBe(false);
    });

    it('should set autoInstallOnAppQuit to true', () => {
      expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
    });
  });

  describe('checkForUpdates', () => {
    it('should skip update check when app is not packaged (dev mode)', async () => {
      mockApp.isPackaged = false;
      const devService = new UpdateService(mockSendToRenderer);

      await devService.checkForUpdates();

      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'dev-mode',
        message: 'Updates disabled in development mode',
      });
    });

    it('should call autoUpdater.checkForUpdates() when packaged', async () => {
      await updateService.checkForUpdates();

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('should send checking status to renderer', async () => {
      await updateService.checkForUpdates();

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'checking',
      });
    });
  });

  describe('downloadUpdate', () => {
    it('should call autoUpdater.downloadUpdate()', async () => {
      await updateService.downloadUpdate();

      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('quitAndInstall', () => {
    it('should call autoUpdater.quitAndInstall()', () => {
      updateService.quitAndInstall();

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('autoUpdater events', () => {
    it('should send update-available status with info', () => {
      const updateInfo = {
        version: '1.0.0',
        releaseNotes: 'New features',
        releaseDate: '2026-02-05',
      };

      mockAutoUpdater.emit('update-available', updateInfo);

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'available',
        info: updateInfo,
      });
    });

    it('should send update-not-available status', () => {
      mockAutoUpdater.emit('update-not-available');

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'not-available',
      });
    });

    it('should send download progress to renderer', () => {
      const progress = {
        percent: 50,
        bytesPerSecond: 1000000,
        transferred: 5000000,
        total: 10000000,
      };

      mockAutoUpdater.emit('download-progress', progress);

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:progress', progress);
    });

    it('should send ready status when update downloaded', () => {
      const updateInfo = {
        version: '1.0.0',
        releaseNotes: 'New features',
        releaseDate: '2026-02-05',
      };

      mockAutoUpdater.emit('update-downloaded', updateInfo);

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'ready',
        info: updateInfo,
      });
    });

    it('should send error status on error', () => {
      const error = new Error('Network error');

      mockAutoUpdater.emit('error', error);

      expect(mockSendToRenderer).toHaveBeenCalledWith('updates:status', {
        status: 'error',
        message: 'Network error',
      });
    });
  });
});
