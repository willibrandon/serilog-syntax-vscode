const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // VS Code extensions run in Node.js context

    mode: 'none', // This will be set by the scripts

    entry: './src/extension.ts', // Entry point of the extension

    output: {
        // Bundle output path
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },

    externals: {
        vscode: 'commonjs vscode' // VS Code API is provided by the runtime
    },

    resolve: {
        // Support TypeScript and JavaScript files
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },

    devtool: 'nosources-source-map', // Create source maps without embedding source code

    infrastructureLogging: {
        level: "log", // Logging level for webpack
    },
};

module.exports = config;