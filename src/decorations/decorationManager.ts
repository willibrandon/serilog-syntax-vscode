import * as vscode from 'vscode';
import { ThemeManager, ThemeColors } from '../utils/themeManager';

export class DecorationManager {
    private decorations: Map<string, vscode.TextEditorDecorationType>;
    private configurationChangeListener: vscode.Disposable | undefined;
    private themeChangeListener: vscode.Disposable | undefined;
    private themeManager: ThemeManager;
    private outputChannel: vscode.OutputChannel | undefined;

    constructor(themeManager: ThemeManager, outputChannel?: vscode.OutputChannel) {
        this.decorations = new Map();
        this.themeManager = themeManager;
        this.outputChannel = outputChannel;
        this.initializeDecorations();

        // Listen for configuration changes
        this.configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('serilog')) {
                this.outputChannel?.appendLine('Configuration changed, updating decorations...');
                this.reinitializeDecorations();
            }
        });

        // Listen for theme changes
        this.themeChangeListener = vscode.window.onDidChangeActiveColorTheme(() => {
            if (this.themeManager.updateTheme()) {
                const newTheme = this.themeManager.getCurrentTheme();
                this.outputChannel?.appendLine(`Theme changed to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
                this.reinitializeDecorations();
            }
        });
    }

    private initializeDecorations() {
        const colors = this.themeManager.getColors();

        // Log the colors being used
        const theme = this.themeManager.getCurrentTheme();
        this.outputChannel?.appendLine(`Initializing decorations for ${theme} theme`);
        this.outputChannel?.appendLine(`Sample colors: property=${colors.property}, brace=${colors.brace}`);

        // Create decoration types with theme-appropriate colors
        const decorationTypes: [string, vscode.TextEditorDecorationType][] = [
            // Template properties
            ['property', vscode.window.createTextEditorDecorationType({
                color: colors.property,
                fontWeight: 'bold'
            })],
            ['destructure', vscode.window.createTextEditorDecorationType({
                color: colors.destructure,
                fontWeight: 'bold'
            })],
            ['stringify', vscode.window.createTextEditorDecorationType({
                color: colors.stringify,
                fontWeight: 'bold'
            })],
            ['brace', vscode.window.createTextEditorDecorationType({
                color: colors.brace
            })],
            ['format', vscode.window.createTextEditorDecorationType({
                color: colors.format
            })],
            ['alignment', vscode.window.createTextEditorDecorationType({
                color: colors.alignment
            })],
            ['positional', vscode.window.createTextEditorDecorationType({
                color: colors.positional
            })],

            // Expression elements
            ['expression.operator', vscode.window.createTextEditorDecorationType({
                color: colors.expressionOperator
            })],
            ['expression.function', vscode.window.createTextEditorDecorationType({
                color: colors.expressionFunction
            })],
            ['expression.builtin', vscode.window.createTextEditorDecorationType({
                color: colors.expressionBuiltin,
                fontWeight: 'bold'
            })],
            ['expression.directive', vscode.window.createTextEditorDecorationType({
                color: colors.expressionDirective
            })],
            ['expression.string', vscode.window.createTextEditorDecorationType({
                color: colors.expressionString
            })],
            ['expression.number', vscode.window.createTextEditorDecorationType({
                color: colors.expressionNumber
            })],
            ['expression.keyword', vscode.window.createTextEditorDecorationType({
                color: colors.expressionKeyword,
                fontWeight: 'bold'
            })],
            ['expression.identifier', vscode.window.createTextEditorDecorationType({
                color: colors.expressionIdentifier
            })]
        ];

        for (const [key, decoration] of decorationTypes) {
            this.decorations.set(key, decoration);
        }
    }

    reinitializeDecorations() {
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

        if (this.themeChangeListener) {
            this.themeChangeListener.dispose();
            this.themeChangeListener = undefined;
        }
    }
}