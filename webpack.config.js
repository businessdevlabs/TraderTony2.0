const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', // or 'production'
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
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
    },
    compress: true,
    port: 8080, // Port for the dev server (frontend)
    historyApiFallback: true, // Important for single-page applications
    proxy: {
        '/api': { // Proxy API requests from frontend dev server to backend
            target: 'http://localhost:3000', // Backend API server
            secure: false,
            changeOrigin: true,
            pathRewrite: {'^/api' : ''} // if your backend doesn't have /api prefix
        }
    }
  },
  devtool: 'inline-source-map', // For better debugging
};
