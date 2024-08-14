const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  module: {
    rules: [
      {
        test: /.s?css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.json$/i,
        type: "asset/resource",
      },
      {
        test: /\.html$/i,
        type: "asset/resource",
      },
    ],
  },
  optimization: {
    splitChunks: { chunks: "all", minChunks: 2 },
    minimizer: [
      // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
      `...`,
      new JsonMinimizerPlugin(),
      new HtmlMinimizerPlugin(),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CopyPlugin({
      patterns: [
        {
          to: path.resolve(__dirname, "dist"),
          context: "./src",
          from: "*.css",
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./src",
          from: "*.html",
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./src/mapping-data",
          from: "*.json",
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./src/population-data",
          from: "*.json",
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./node_modules/leaflet/dist",
          from: "leaflet.css"
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./node_modules/leaflet/dist",
          from: "images/layers*.png"
        },
        {
          to: path.resolve(__dirname, "dist"),
          context: "./public",
          from: "*"
        }
      ],
    }),
  ],
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
} /* as import("webpack").Configuration */;
