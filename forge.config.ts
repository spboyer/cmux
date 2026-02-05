import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import ForgeExternalsPlugin from '@timfish/forge-externals-plugin';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import { preloadConfig } from './webpack.preload.config';

const enableMacOSSigning = process.platform === 'darwin' && process.env.ENABLE_MACOS_SIGNING === 'true';
const enableMacOSNotarization =
  enableMacOSSigning &&
  Boolean(process.env.APPLE_ID) &&
  Boolean(process.env.APPLE_ID_PASSWORD) &&
  Boolean(process.env.APPLE_TEAM_ID);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'vibe-playground',
    extraResource: ['./app-update.yml'],
    ...(enableMacOSSigning
      ? {
          // Triggers @electron/osx-sign; identity auto-discovered from keychain.
          osxSign: {},
          ...(enableMacOSNotarization
            ? {
                osxNotarize: {
                  appleId: process.env.APPLE_ID!,
                  appleIdPassword: process.env.APPLE_ID_PASSWORD!,
                  teamId: process.env.APPLE_TEAM_ID!,
                },
              }
            : {}),
        }
      : {}),
  },
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'ipdelete',
          name: 'vibe-playground',
        },
        prerelease: false,
        draft: false,
      },
    },
  ],
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({}),
    // MakerRpm disabled - fails with prebuilt native modules containing ARM binaries
    // new MakerRpm({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devServer: {
        hot: false,
        liveReload: false,
        client: {
          overlay: {
            runtimeErrors: (error: Error) => {
              // Suppress benign ResizeObserver error from Monaco
              if (error.message?.includes('ResizeObserver loop')) {
                return false;
              }
              return true;
            },
          },
        },
      },
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
              config: preloadConfig,
            },
          },
        ],
      },
    }),
    // ForgeExternalsPlugin must come AFTER WebpackPlugin
    new ForgeExternalsPlugin({
      externals: ['@homebridge/node-pty-prebuilt-multiarch'],
      includeDeps: true,
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
