import config from "./rspack.config.mjs";

config.mode = "production";
config.watch = false;
config.devtool = false;

export default config;

// npx rspack build --config rspack.config.prod.mjs
