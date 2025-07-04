import path from "path";

export default {
    mode: "development",
    entry: "./main.ts",
    output: {
        path: path.resolve(import.meta.dirname, "docs"),
        filename: "site.js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                loader: "builtin:swc-loader",
                options: {
                    jsc: {
                        parser: {
                            syntax: "typescript"
                        }
                    }
                },
                type: "javascript/auto"
            },
            {
                test: /\.wgsl$/,
                type: "asset/source"
            }
        ]
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
    watch: true
};

// npx rspack build
