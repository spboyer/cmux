/* eslint-disable @typescript-eslint/no-var-requires */

afterEach(() => {
  jest.restoreAllMocks();
  jest.resetModules();
});

// Mock electron
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn().mockReturnValue('/tmp/test'),
  },
}));

// Mock AppPaths
jest.mock('./AppPaths', () => ({
  getBundledNodeRoot: jest.fn().mockReturnValue('/app/resources/node'),
  getCopilotBootstrapDir: jest.fn().mockReturnValue('/tmp/copilot-bootstrap'),
  getCopilotLocalNodeModulesDir: jest.fn().mockReturnValue('/tmp/copilot-bootstrap/node_modules'),
  getCopilotLogsDir: jest.fn().mockReturnValue('/tmp/copilot-logs'),
}));

// Mock fs at module level so properties are configurable
jest.mock('fs');

describe('CopilotBootstrap platform-specific behavior', () => {
  describe('getLocalCopilotCliPath', () => {
    test('returns nested CLI path when it exists', () => {
      const fs = require('fs');
      fs.existsSync.mockImplementation((p: string) => {
        return p.toString().includes('copilot-sdk') && p.toString().includes('npm-loader.js');
      });

      jest.isolateModules(() => {
        const { getLocalCopilotCliPath } = require('./CopilotBootstrap');
        const result = getLocalCopilotCliPath();
        expect(result).not.toBeNull();
        expect(result).toContain('copilot-sdk');
        expect(result).toContain('npm-loader.js');
      });
    });

    test('falls back to flat CLI path when nested does not exist', () => {
      const fs = require('fs');
      fs.existsSync.mockImplementation((p: string) => {
        const s = p.toString();
        // Nested path doesn't exist, flat path does
        if (s.includes('copilot-sdk') && s.includes('npm-loader.js')) return false;
        if (s.includes('@github') && s.includes('copilot') && s.includes('npm-loader.js')) return true;
        return false;
      });

      jest.isolateModules(() => {
        const { getLocalCopilotCliPath } = require('./CopilotBootstrap');
        const result = getLocalCopilotCliPath();
        expect(result).not.toBeNull();
        expect(result).toContain('npm-loader.js');
      });
    });

    test('returns null when no CLI path exists', () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      jest.isolateModules(() => {
        const { getLocalCopilotCliPath } = require('./CopilotBootstrap');
        expect(getLocalCopilotCliPath()).toBeNull();
      });
    });
  });

  describe('isLocalCopilotInstallReady', () => {
    test('returns false when SDK package.json does not exist', () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      jest.isolateModules(() => {
        const { isLocalCopilotInstallReady } = require('./CopilotBootstrap');
        expect(isLocalCopilotInstallReady()).toBe(false);
      });
    });

    test('returns true when SDK and CLI are both present', () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);

      jest.isolateModules(() => {
        const { isLocalCopilotInstallReady } = require('./CopilotBootstrap');
        expect(isLocalCopilotInstallReady()).toBe(true);
      });
    });
  });

  describe('ensureCopilotInstalled', () => {
    test('skips install in development mode (app.isPackaged = false)', async () => {
      jest.isolateModules(async () => {
        const { ensureCopilotInstalled } = require('./CopilotBootstrap');
        await expect(ensureCopilotInstalled()).resolves.toBeUndefined();
      });
    });
  });

  describe('getLocalCopilotNodeModulesDir', () => {
    test('returns the configured local node_modules directory', () => {
      jest.isolateModules(() => {
        const { getLocalCopilotNodeModulesDir } = require('./CopilotBootstrap');
        const result = getLocalCopilotNodeModulesDir();
        expect(result).toContain('node_modules');
      });
    });
  });
});
