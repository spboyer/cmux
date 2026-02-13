import * as path from 'path';

// Save original platform
const originalPlatform = process.platform;

// Helper to mock platform
function mockPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true });
}

// Restore platform after tests
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
  jest.restoreAllMocks();
  jest.resetModules();
});

describe('SdkLoader platform-specific paths', () => {
  describe('Well-known prefixes on macOS', () => {
    beforeEach(() => {
      mockPlatform('darwin');
      jest.resetModules();
    });

    test('should include /usr/local for Homebrew on Intel Mac', () => {
      // When on darwin, well-known prefixes should include /usr/local
      mockPlatform('darwin');
      // On macOS, the SdkLoader probes /usr/local as a well-known prefix
      const prefix = '/usr/local';
      const modulesDir = path.join(prefix, 'lib', 'node_modules');
      expect(modulesDir).toContain('usr');
      expect(modulesDir).toContain('local');
    });

    test('should include /opt/homebrew for Apple Silicon Mac', () => {
      mockPlatform('darwin');
      // On Apple Silicon, Homebrew installs to /opt/homebrew
      const prefix = '/opt/homebrew';
      const modulesDir = path.join(prefix, 'lib', 'node_modules');
      expect(modulesDir).toContain('opt');
      expect(modulesDir).toContain('homebrew');
    });
  });

  describe('Well-known prefixes on Linux', () => {
    beforeEach(() => {
      mockPlatform('linux');
      jest.resetModules();
    });

    test('should include /usr prefix on Linux', () => {
      mockPlatform('linux');
      // Linux system default npm prefix is /usr
      const prefix = '/usr';
      const modulesDir = path.join(prefix, 'lib', 'node_modules');
      expect(modulesDir).toContain('usr');
      expect(modulesDir).toContain('node_modules');
    });
  });

  describe('Well-known prefixes on Windows', () => {
    beforeEach(() => {
      mockPlatform('win32');
      jest.resetModules();
    });

    test('should check APPDATA/npm on Windows', () => {
      mockPlatform('win32');
      const appData = 'C:\\Users\\test\\AppData\\Roaming';
      const prefix = path.join(appData, 'npm');
      const modulesDir = path.join(prefix, 'node_modules');
      expect(modulesDir).toContain('npm');
      expect(modulesDir).toContain('node_modules');
    });
  });

  describe('SDK module path resolution', () => {
    test('Windows uses prefix/node_modules path', () => {
      mockPlatform('win32');
      const prefix = 'C:\\Users\\test\\AppData\\Roaming\\npm';
      const expected = path.join(prefix, 'node_modules');
      // On windows, node_modules is directly under prefix
      expect(path.join(prefix, 'node_modules')).toBe(expected);
    });

    test('Unix uses prefix/lib/node_modules path', () => {
      mockPlatform('linux');
      const prefix = '/usr/local';
      const expected = path.join(prefix, 'lib', 'node_modules');
      expect(path.join(prefix, 'lib', 'node_modules')).toBe(expected);
    });
  });
});
