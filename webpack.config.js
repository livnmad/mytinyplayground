const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    // Preserve server build output from tsc
    clean: false,
  },
  stats: {
    children: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin(
      (() => {
        const templatePath = path.resolve(__dirname, 'public/index.html');
        if (fs.existsSync(templatePath)) {
          return { template: templatePath };
        }
        return {
          templateContent: ({ htmlWebpackPlugin }) => `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>My Tiny Playground</title>
              ${htmlWebpackPlugin.tags.headTags}
            </head>
            <body>
              <div id="root"></div>
              ${htmlWebpackPlugin.tags.bodyTags}
            </body>
          </html>`,
        };
      })()
    ),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    // Run client dev server separately from API server
    port: 3001,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
      },
    ],
  },
};
