const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devtool: "cheap-module-source-map", // Or 'source-map' for production
  entry: {
    background: path.resolve(__dirname, "src/background/index.ts"),
    content: path.resolve(__dirname, "src/content/index.ts"),
    injector: path.resolve(__dirname, "src/content/injector.ts"),
    popup: path.resolve(__dirname, "src/popup/index.ts"),
    options: path.resolve(__dirname, "src/options/index.ts"),
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].bundle.js",
    clean: true, // Clean the build directory before each build
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@utils": path.resolve(__dirname, "src/utils"),
      "@background": path.resolve(__dirname, "src/background"),
      "@content": path.resolve(__dirname, "src/content"),
      "@popup": path.resolve(__dirname, "src/popup"),
      "@options": path.resolve(__dirname, "src/options"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },
  plugins: [
    // Copy static assets
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "src/assets", to: "assets" },
      ],
    }),
    // Generate HTML files
    new HtmlWebpackPlugin({
      template: "src/popup/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
    new HtmlWebpackPlugin({
      template: "src/options/options.html",
      filename: "options.html",
      chunks: ["options"],
    }),
  ],
};
