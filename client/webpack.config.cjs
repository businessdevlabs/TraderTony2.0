const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', // or 'production'
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/dist/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your source index.html
      filename: 'index.html' // Output filename in dist/
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/',    // ← match the publicPath
    },
    compress: true,
    port: 3000, // Port for the dev server (frontend)
    historyApiFallback: true, // Important for single-page applications
    proxy: [
      {
        context: ['/key-levels'],
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true,
        pathRewrite: { '^/key-levels': '/key-levels' }
      },
      {
        context: ['/ohlc'],
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true,
        pathRewrite: { '^/ohlc': '/ohlc' }
      }
    ]
  },
  devtool: 'inline-source-map', // For better debugging
};
