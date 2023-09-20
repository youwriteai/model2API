/**
 * Base webpack config used across other specific configs
 */

import webpack from 'webpack';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';
import webpackPaths from './webpack.paths';
import { dependencies as externals } from '../../release/app/package.json';

const configuration: webpack.Configuration = {
  externals:
    process.env.NODE_ENV === 'production'
      ? [...Object.keys(externals || {})]
      : [],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
    // https://github.com/webpack/webpack/issues/1114
    library: {
      type: 'commonjs2',
    },
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    // modules: [webpackPaths.srcPath, 'node_modules'],
    modules: [
      webpackPaths.srcNodeModulesPath,
      webpackPaths.srcPath,
      'node_modules',
    ],
    // There is no need to add aliases here, the paths in tsconfig get mirrored
    plugins: [new TsconfigPathsPlugins()],
    fallback: {
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify'),
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.FLUENTFFMPEG_COV': false,
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],
};

export default configuration;
