import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  // Don't bundle node-pty or copilot-sdk - they have native/ESM modules that need to be loaded at runtime
  externals: {
    '@homebridge/node-pty-prebuilt-multiarch': 'commonjs @homebridge/node-pty-prebuilt-multiarch',
    '@github/copilot-sdk': 'commonjs @github/copilot-sdk',
  },
};
