module.exports = {
  presets: [
    "@babel/typescript",
    "@babel/env"
  ],
  plugins: [
    // class { handleThing = () => { } }
    "@babel/proposal-class-properties",
    // { ...spread }
    "@babel/proposal-object-rest-spread",
    // runtime transformations
    "@babel/plugin-transform-runtime",
  ],
};
