module.exports = {
  entry: "./es5/index.js",
  output: {
    path: __dirname + "/web",
    filename: "oc-multisig.js",
    library: "multisig",
    libraryTarget: "umd"
  },
  devtool: "source-map"
}
