// Shared SDK loader — singleton CopilotClient for use by CopilotService and AgentSessionService.
// Loads @github/copilot-sdk from the global npm install rather than bundling it,
// since the SDK is ESM-only and spawns @github/copilot as a child process —
// both need to live on the real filesystem, not inside asar.

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { getCopilotLogsDir } from './AppPaths';

type CopilotClientType = import('@github/copilot-sdk').CopilotClient;

const isWindows = process.platform === 'win32';

let sdkModule: typeof import('@github/copilot-sdk') | null = null;
let clientInstance: CopilotClientType | null = null;
let startPromise: Promise<CopilotClientType> | null = null;

let cachedPrefix: string | null = null;

/** Parse a `prefix=` value from an .npmrc file, returning null if not found. */
function parseNpmrcPrefix(rcPath: string): string | null {
  try {
    const content = fs.readFileSync(rcPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*prefix\s*=\s*(.+)/);
      if (match) return match[1].trim();
    }
  } catch { /* file not found or unreadable */ }
  return null;
}

/**
 * Resolve the user's real shell PATH.
 * GUI-launched Electron apps (especially on macOS) inherit a minimal system
 * PATH that typically excludes /usr/local/bin, nvm, volta, fnm, etc.
 * We ask the user's login shell to echo $PATH so we can find npm.
 */
function getUserShellPath(): string {
  if (isWindows) return process.env.PATH || '';

  try {
    const shell = process.env.SHELL || '/bin/zsh';
    // -ilc: interactive login shell sources .zshrc/.bashrc/.profile
    return execSync(`${shell} -ilc "echo \\$PATH"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return process.env.PATH || '';
  }
}

/**
 * Check whether a candidate npm global prefix actually contains the SDK.
 * Returns the node_modules dir if found, null otherwise.
 */
function hasGlobalSdk(prefix: string): string | null {
  const modulesDir = isWindows
    ? path.join(prefix, 'node_modules')
    : path.join(prefix, 'lib', 'node_modules');
  if (fs.existsSync(path.join(modulesDir, '@github', 'copilot-sdk', 'package.json'))) {
    return modulesDir;
  }
  return null;
}

/**
 * Well-known npm global prefix locations to probe when `npm prefix -g` is
 * unavailable (packaged Electron with no npm on PATH).
 */
function getWellKnownPrefixes(): string[] {
  const home = os.homedir();
  const prefixes: string[] = [];

  if (isWindows) {
    // Custom prefix from user ~/.npmrc (e.g. prefix=C:\ProgramData\global-npm)
    const userPrefix = parseNpmrcPrefix(path.join(home, '.npmrc'));
    if (userPrefix) prefixes.push(userPrefix);

    // Custom prefix from builtin npmrc shipped with Node.js
    for (const envKey of ['ProgramFiles', 'ProgramFiles(x86)'] as const) {
      const pf = process.env[envKey];
      if (pf) {
        const builtinRc = path.join(pf, 'nodejs', 'node_modules', 'npm', 'npmrc');
        const p = parseNpmrcPrefix(builtinRc);
        if (p) prefixes.push(p);
      }
    }

    // npm default on Windows
    if (process.env.APPDATA) {
      prefixes.push(path.join(process.env.APPDATA, 'npm'));
    }
  } else {
    // Homebrew / default system npm on macOS
    prefixes.push('/usr/local');
    // Apple Silicon Homebrew
    prefixes.push('/opt/homebrew');
    // Linux system default
    prefixes.push('/usr');

    // nvm — scan version dirs (most recent first)
    const nvmDir = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
      try {
        const versions = fs.readdirSync(nvmDir).sort().reverse();
        for (const v of versions) {
          prefixes.push(path.join(nvmDir, v));
        }
      } catch { /* ignore */ }
    }

    // volta
    const voltaNodeDir = path.join(home, '.volta', 'tools', 'image', 'node');
    if (fs.existsSync(voltaNodeDir)) {
      try {
        const versions = fs.readdirSync(voltaNodeDir).sort().reverse();
        for (const v of versions) {
          prefixes.push(path.join(voltaNodeDir, v));
        }
      } catch { /* ignore */ }
    }

    // fnm
    const fnmDir = path.join(home, '.local', 'share', 'fnm', 'node-versions');
    if (fs.existsSync(fnmDir)) {
      try {
        const versions = fs.readdirSync(fnmDir).sort().reverse();
        for (const v of versions) {
          prefixes.push(path.join(fnmDir, v, 'installation'));
        }
      } catch { /* ignore */ }
    }
  }

  return prefixes;
}

function getNpmGlobalPrefix(): string {
  if (cachedPrefix) return cachedPrefix;

  // 1. Fast path: check env var (set when running under npm)
  if (process.env.npm_config_prefix) {
    const envPrefix = process.env.npm_config_prefix;
    if (fs.existsSync(envPrefix)) {
      cachedPrefix = envPrefix;
      return cachedPrefix;
    }
  }

  // 2. Try `npm prefix -g` with the current PATH
  try {
    cachedPrefix = execSync('npm prefix -g', { encoding: 'utf-8' }).trim();
    return cachedPrefix;
  } catch {
    // npm not found on current PATH — expected in packaged Electron
  }

  // 3. Resolve the user's real shell PATH and retry
  //    (GUI-launched Electron apps get a minimal PATH that misses npm)
  try {
    const shellPath = getUserShellPath();
    if (shellPath && shellPath !== process.env.PATH) {
      cachedPrefix = execSync('npm prefix -g', {
        encoding: 'utf-8',
        env: { ...process.env, PATH: shellPath },
      }).trim();
      return cachedPrefix;
    }
  } catch {
    // Still can't find npm — fall through to well-known locations
  }

  // 4. Probe well-known prefix locations for the SDK directly
  for (const prefix of getWellKnownPrefixes()) {
    if (hasGlobalSdk(prefix)) {
      cachedPrefix = prefix;
      return cachedPrefix;
    }
  }

  throw new Error(
    'Could not determine npm global prefix. Is npm installed and is @github/copilot-sdk installed globally?'
  );
}

function getGlobalNodeModules(): string {
  const prefix = getNpmGlobalPrefix();
  // Windows: {prefix}/node_modules — Unix: {prefix}/lib/node_modules
  const modulesDir = isWindows
    ? path.join(prefix, 'node_modules')
    : path.join(prefix, 'lib', 'node_modules');

  if (!fs.existsSync(path.join(modulesDir, '@github', 'copilot-sdk', 'package.json'))) {
    throw new Error(
      '@github/copilot-sdk is not installed globally. Run: npm install -g @github/copilot-sdk'
    );
  }
  return modulesDir;
}

function getCopilotCliPath(): string {
  // The SDK spawns the CLI via child_process.spawn(). When cliPath ends with .js,
  // the SDK spawns `node <path>`. On Windows, .cmd files can't be spawned directly
  // without shell:true, so we return the .js entry point instead.
  const globalModules = getGlobalNodeModules();

  // Path to the CLI's JS entry point (works cross-platform via SDK's node detection)
  const jsEntry = path.join(globalModules, '@github', 'copilot-sdk', 'node_modules', '@github', 'copilot', 'npm-loader.js');
  if (fs.existsSync(jsEntry)) {
    return jsEntry;
  }

  // Fallback: check if CLI is hoisted to global bin (older npm behavior)
  const prefix = getNpmGlobalPrefix();
  const hoistedJs = isWindows
    ? null  // Windows global doesn't use symlinks to .js
    : path.join(prefix, 'lib', 'node_modules', '@github', 'copilot', 'npm-loader.js');

  if (hoistedJs && fs.existsSync(hoistedJs)) {
    return hoistedJs;
  }

  throw new Error(
    '@github/copilot CLI not found. Run: npm install -g @github/copilot-sdk'
  );
}

export async function loadSdk(): Promise<typeof import('@github/copilot-sdk')> {
  if (!sdkModule) {
    const globalModules = getGlobalNodeModules();
    const sdkEntry = path.join(globalModules, '@github', 'copilot-sdk', 'dist', 'index.js');
    // Use new Function to hide import() from webpack's static analysis,
    // but point it at the real filesystem path via pathToFileURL
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    sdkModule = await (new Function('url', 'return import(url)')(pathToFileURL(sdkEntry).href) as Promise<typeof import('@github/copilot-sdk')>);
  }
  return sdkModule;
}

export async function getSharedClient(): Promise<CopilotClientType> {
  if (clientInstance) return clientInstance;

  // Prevent concurrent start() calls
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const { CopilotClient } = await loadSdk();
    const cliPath = getCopilotCliPath();
    const logDir = getCopilotLogsDir();
    fs.mkdirSync(logDir, { recursive: true });
    clientInstance = new CopilotClient({
      cliPath,
      logLevel: 'all',
      cliArgs: ['--log-dir', logDir],
    });
    await clientInstance.start();
    return clientInstance;
  })();

  try {
    const client = await startPromise;
    return client;
  } catch (err) {
    // Reset state so next call retries instead of returning broken client
    clientInstance = null;
    throw err;
  } finally {
    startPromise = null;
  }
}

export async function stopSharedClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.stop().catch(() => {});
    clientInstance = null;
  }
}
