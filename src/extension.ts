import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for debugging
    const outputChannel = vscode.window.createOutputChannel('Serilog Syntax');
    outputChannel.appendLine('Serilog Syntax Extension is activating...');
    outputChannel.show();

    console.log('Serilog extension activated!');

    // Show activation message
    vscode.window.showInformationMessage('Serilog Syntax Extension Activated!');

    // Simple test command to verify extension loads
    const disposable = vscode.commands.registerCommand('serilog.test', () => {
        vscode.window.showInformationMessage('Serilog Extension is Working!');
        outputChannel.appendLine('Test command executed');
    });

    context.subscriptions.push(disposable);

    // Log that activation is complete
    outputChannel.appendLine('Serilog Syntax Extension activation complete!');
    outputChannel.appendLine('Waiting for C# files to be opened...');
}

export function deactivate() {
    console.log('Serilog extension deactivated');
}