const path = require('path');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {
    sample: './sample',
    worker: './worker'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].min.js'
  },
  stats: {
    reasons: true,
    warnings: false
  },
  performance: {
    hints: false
  },
  resolve: {
    extensions: ['.ts'],
    modules: ['node_modules', path.resolve(__dirname, 'src')]
  },
  module: {
    rules: [{
      test: /.ts?$/,
      exclude: /node_modules/,
      include: [path.resolve(__dirname, 'src')],
      exclude: [path.resolve(__dirname, 'node_modules')],
      use: [
        {loader: 'ts-loader', options: {transpileOnly: true, happyPackMode: true}}
      ]
    }]
  }
};
