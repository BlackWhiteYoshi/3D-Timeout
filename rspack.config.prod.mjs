import path from "path";
import config from "./rspack.config.mjs";

config.mode = "production";
config.output = {
    path: path.resolve(import.meta.dirname, "wwwroot"),
    filename: "site.js"
};
config.watch = false;
config.devtool = false;

export default config;

// npx rspack build --config rspack.config.prod.mjs
