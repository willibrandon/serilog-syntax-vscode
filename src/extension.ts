import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Serilog extension activated!');

    // Create decoration type - using dark theme colors from original serilog-syntax
    const propertyDecoration = vscode.window.createTextEditorDecorationType({
        color: '#569CD6', // PropertyName color from dark theme - RGB(86, 156, 214)
        fontWeight: 'bold'
    });

    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }

        const text = editor.document.getText();
        const decorations: vscode.DecorationOptions[] = [];

        // Find all {Property} patterns
        const regex = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startPos = editor.document.positionAt(match.index + 1); // Skip {
            const endPos = editor.document.positionAt(match.index + match[0].length - 1); // Skip }
            decorations.push({ range: new vscode.Range(startPos, endPos) });
        }

        editor.setDecorations(propertyDecoration, decorations);
    }

    // Initial update
    updateDecorations();

    // Register listeners
    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);
}

export function deactivate() {}