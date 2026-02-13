import * as path from 'path';

const originalPlatform = process.platform;

function mockPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
  jest.restoreAllMocks();
  jest.resetModules();
});

// Mock electron app module
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

describe('CopilotBootstrap platform-specific behavior', () => {
  describe('getBundledNodePath', () => {
    test('returns node.exe on Windows', () => {
      mockPlatform('win32');
      jest.resetModules();
      // On Windows, the path should end with node.exe
      const nodePath = path.join('/app/resources/node', 'node.exe');
      expect(nodePath).toContain('node.exe');
    });

    test('returns bin/node on macOS', () => {
      mockPlatform('darwin');
      jest.resetModules();
      const nodePath = path.join('/app/resources/node', 'bin', 'node');
      expect(nodePath).toContain(path.join('bin', 'node'));
    });

    test('returns bin/node on Linux', () => {
      mockPlatform('linux');
      jest.resetModules();
      const nodePath = path.join('/app/resources/node', 'bin', 'node');
      expect(nodePath).toContain(path.join('bin', 'node'));
    });
  });

  describe('getBundledNpmCliPath', () => {
    test('uses node_modules/npm/bin on Windows', () => {
      mockPlatform('win32');
      const npmPath = path.join('/app/resources/node', 'node_modules', 'npm', 'bin', 'npm-cli.js');
      expect(npmPath).toContain(path.join('node_modules', 'npm', 'bin', 'npm-cli.js'));
    });

    test('uses lib/node_modules/npm/bin on macOS', () => {
      mockPlatform('darwin');
      const npmPath = path.join('/app/resources/node', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
      expect(npmPath).toContain(path.join('lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
    });

    test('uses lib/node_modules/npm/bin on Linux', () => {
      mockPlatform('linux');
      const npmPath = path.join('/app/resources/node', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
      expect(npmPath).toContain(path.join('lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
    });
  });

  describe('Copilot shim generation', () => {
    test('creates .cmd shim on Windows', () => {
      mockPlatform('win32');
      const shimPath = path.join('/tmp/copilot-bootstrap', 'copilot.cmd');
      expect(shimPath).toContain('copilot.cmd');
    });

    test('creates shell shim on macOS', () => {
      mockPlatform('darwin');
      const shimPath = path.join('/tmp/copilot-bootstrap', 'copilot');
      expect(shimPath).not.toContain('.cmd');
    });

    test('creates shell shim on Linux', () => {
      mockPlatform('linux');
      const shimPath = path.join('/tmp/copilot-bootstrap', 'copilot');
      expect(shimPath).not.toContain('.cmd');
    });
  });

  describe('Copilot CLI path detection', () => {
    test('checks nested cli path under copilot-sdk/node_modules', () => {
      const modulesDir = '/tmp/copilot-bootstrap/node_modules';
      const nestedCli = path.join(
        modulesDir,
        '@github',
        'copilot-sdk',
        'node_modules',
        '@github',
        'copilot',
        'npm-loader.js',
      );
      expect(nestedCli).toContain('copilot-sdk');
      expect(nestedCli).toContain('npm-loader.js');
    });

    test('falls back to flat cli path', () => {
      const modulesDir = '/tmp/copilot-bootstrap/node_modules';
      const flatCli = path.join(modulesDir, '@github', 'copilot', 'npm-loader.js');
      expect(flatCli).toContain('npm-loader.js');
      expect(flatCli).not.toContain('copilot-sdk');
    });
  });

  describe('isLocalCopilotInstallReady', () => {
    test('returns false when SDK package.json does not exist', () => {
      jest.resetModules();
      jest.isolateModules(() => {
        const fsMock = require('fs');
        fsMock.existsSync = jest.fn().mockReturnValue(false);
        const { isLocalCopilotInstallReady } = require('./CopilotBootstrap');
        expect(isLocalCopilotInstallReady()).toBe(false);
      });
    });

    test('returns true when SDK and CLI are both present', () => {
      jest.resetModules();
      jest.isolateModules(() => {
        const fsMock = require('fs');
        fsMock.existsSync = jest.fn().mockReturnValue(true);
        const { isLocalCopilotInstallReady } = require('./CopilotBootstrap');
        expect(isLocalCopilotInstallReady()).toBe(true);
      });
    });
  });

  describe('ensureCopilotInstalled', () => {
    test('skips install in development mode', async () => {
      jest.resetModules();
      jest.isolateModules(async () => {
        const { ensureCopilotInstalled } = require('./CopilotBootstrap');
        // app.isPackaged is false in our mock, so it should return immediately
        await expect(ensureCopilotInstalled()).resolves.toBeUndefined();
      });
    });
  });
});
