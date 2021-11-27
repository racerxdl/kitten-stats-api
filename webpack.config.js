const path = require('path')
const webpack = require('webpack')
const StaticSiteGeneratorPlugin = require('static-site-generator-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = {
  target: 'webworker',
  entry: './src/index.ts',
  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist'),
    globalObject: 'this',
  },
  devtool: 'cheap-module-source-map',
  mode: 'development',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      url: false,
      os: false,
      https: false,
      http: false,
      crypto: false,
      assert: false,
      stream: false,
    },
  },
  plugins: [
    // new webpack.IgnorePlugin({ resourceRegExp: /^/u, contextRegExp: /swarm-js/u }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    // new NodePolyfillPlugin(),
    // new StaticSiteGeneratorPlugin({
    //   globals: {
    //     window: {},
    //   },
    // }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          // transpileOnly is useful to skip typescript checks occasionally:
          // transpileOnly: true,
        },
      },
    ],
  },
}
