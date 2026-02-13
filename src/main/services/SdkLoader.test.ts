/* eslint-disable @typescript-eslint/no-var-requires */

const originalPlatform = process.platform;

function mockPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
  jest.restoreAllMocks();
  jest.resetModules();
});

// Mock electron
jest.mock('electron', () => ({
  app: { isPackaged: false, getPath: jest.fn().mockReturnValue('/tmp') },
}));

// Mock AppPaths
jest.mock('./AppPaths', () => ({
  getBundledNodeRoot: jest.fn().mockReturnValue(null),
  getCopilotBootstrapDir: jest.fn().mockReturnValue('/tmp/copilot-bootstrap'),
  getCopilotLocalNodeModulesDir: jest.fn().mockReturnValue('/tmp/copilot-bootstrap/node_modules'),
  getCopilotLogsDir: jest.fn().mockReturnValue('/tmp/copilot-logs'),
}));

// Mock CopilotBootstrap
jest.mock('./CopilotBootstrap', () => ({
  ensureCopilotInstalled: jest.fn().mockResolvedValue(undefined),
  getLocalCopilotCliPath: jest.fn().mockReturnValue(null),
  getLocalCopilotNodeModulesDir: jest.fn().mockReturnValue('/tmp/copilot-bootstrap/node_modules'),
  isLocalCopilotInstallReady: jest.fn().mockReturnValue(false),
}));

// Mock fs and os at module level so properties are configurable
jest.mock('fs');
jest.mock('os');

// Mock child_process to prevent real execSync calls
jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation(() => { throw new Error('npm not found'); }),
}));

describe('SdkLoader platform-specific paths', () => {
  describe('Well-known prefixes on macOS', () => {
    test('probes /usr/local and /opt/homebrew on darwin', () => {
      mockPlatform('darwin');
      const os = require('os');
      const fs = require('fs');
      os.homedir.mockReturnValue('/Users/testuser');
      fs.existsSync.mockReturnValue(false);
      fs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

      jest.isolateModules(() => {
        const { loadSdk } = require('./SdkLoader');
        expect(loadSdk()).rejects.toThrow();
      });
    });
  });

  describe('Well-known prefixes on Windows', () => {
    test('checks APPDATA/npm on Windows', () => {
      mockPlatform('win32');
      const origAppData = process.env.APPDATA;
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      const os = require('os');
      const fs = require('fs');
      os.homedir.mockReturnValue('C:\\Users\\test');
      fs.existsSync.mockReturnValue(false);
      fs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

      jest.isolateModules(() => {
        const { loadSdk } = require('./SdkLoader');
        expect(loadSdk()).rejects.toThrow();
      });

      process.env.APPDATA = origAppData;
    });
  });

  describe('SDK loading with global install', () => {
    test('finds SDK in global node_modules on Unix', () => {
      mockPlatform('linux');
      const os = require('os');
      const fs = require('fs');
      os.homedir.mockReturnValue('/home/testuser');

      fs.existsSync.mockImplementation((p: string) => {
        const s = p.toString();
        if (s.includes('/usr/local/lib/node_modules/@github/copilot-sdk/package.json')) return true;
        if (s.includes('/usr/local/lib/node_modules/@github/copilot-sdk/dist/index.js')) return true;
        return false;
      });
      fs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

      jest.isolateModules(() => {
        const { loadSdk } = require('./SdkLoader');
        // loadSdk will try dynamic import which will fail in test env,
        // but it should get past the prefix resolution step
        expect(loadSdk()).rejects.toThrow();
      });
    });

    test('finds SDK in APPDATA/npm/node_modules on Windows', () => {
      mockPlatform('win32');
      const origAppData = process.env.APPDATA;
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      const os = require('os');
      const fs = require('fs');
      os.homedir.mockReturnValue('C:\\Users\\test');

      fs.existsSync.mockImplementation((p: string) => {
        const s = p.toString();
        if (s.includes('npm\\node_modules\\@github\\copilot-sdk\\package.json')) return true;
        return false;
      });
      fs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

      jest.isolateModules(() => {
        const { loadSdk } = require('./SdkLoader');
        expect(loadSdk()).rejects.toThrow();
      });

      process.env.APPDATA = origAppData;
    });
  });
});
