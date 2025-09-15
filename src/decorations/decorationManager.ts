import * as vscode from 'vscode';

export class DecorationManager {
    private decorations: Map<string, vscode.TextEditorDecorationType>;
    private configurationChangeListener: vscode.Disposable | undefined;

    constructor() {
        this.decorations = new Map();
        this.initializeDecorations();

        // Listen for configuration changes
        this.configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('serilog')) {
                this.reinitializeDecorations();
            }
        });
    }

    private initializeDecorations() {
        const config = vscode.workspace.getConfiguration('serilog');

        // Get colors from configuration or use defaults
        const decorationTypes: [string, vscode.TextEditorDecorationType][] = [
            // Template properties
            ['property', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.property', '#569CD6'),
                fontWeight: 'bold'
            })],
            ['destructure', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.destructure', '#FF8C64'),
                fontWeight: 'bold'
            })],
            ['stringify', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.stringify', '#FF6464'),
                fontWeight: 'bold'
            })],
            ['brace', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.brace', '#98CFDF')
            })],
            ['format', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.format', '#8CCB80')
            })],
            ['alignment', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.alignment', '#F87171')
            })],
            ['positional', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.positional', '#AAE3FF')
            })],

            // Expression elements
            ['expression.operator', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.operator', '#FF7B72')
            })],
            ['expression.function', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.function', '#C896FF')
            })],
            ['expression.builtin', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.builtin', '#DCB4FF'),
                fontWeight: 'bold'
            })],
            ['expression.directive', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.directive', '#F078B4')
            })],
            ['expression.string', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.string', '#64C8C8')
            })],
            ['expression.number', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.number', '#B5CEA8')
            })],
            ['expression.keyword', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.keyword', '#569CD6'),
                fontWeight: 'bold'
            })],
            ['expression.identifier', vscode.window.createTextEditorDecorationType({
                color: config.get<string>('colors.expression.identifier', '#9CDCFE')
            })]
        ];

        for (const [key, decoration] of decorationTypes) {
            this.decorations.set(key, decoration);
        }
    }

    private reinitializeDecorations() {
        // Dispose old decorations
        for (const decoration of this.decorations.values()) {
            decoration.dispose();
        }
        this.decorations.clear();

        // Recreate decorations with new configuration
        this.initializeDecorations();

        // Trigger update in active editor by firing a fake document change event
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'csharp') {
            // Fire a custom event that the extension will handle
            vscode.commands.executeCommand('serilog.refresh');
        }
    }

    getDecoration(type: string): vscode.TextEditorDecorationType | undefined {
        return this.decorations.get(type);
    }

    dispose() {
        for (const decoration of this.decorations.values()) {
            decoration.dispose();
        }
        this.decorations.clear();

        if (this.configurationChangeListener) {
            this.configurationChangeListener.dispose();
            this.configurationChangeListener = undefined;
        }
    }
}