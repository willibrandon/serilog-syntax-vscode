import * as vscode from 'vscode';

export class DecorationManager {
    private decorations: Map<string, vscode.TextEditorDecorationType>;

    constructor() {
        // Using colors from the original serilog-syntax dark theme
        this.decorations = new Map([
            ['property', vscode.window.createTextEditorDecorationType({
                color: '#569CD6', // RGB(86, 156, 214) - PropertyName
                fontWeight: 'bold'
            })],
            ['destructure', vscode.window.createTextEditorDecorationType({
                color: '#FF8C64', // RGB(255, 140, 100) - DestructureOperator
                fontWeight: 'bold'
            })],
            ['stringify', vscode.window.createTextEditorDecorationType({
                color: '#FF6464', // RGB(255, 100, 100) - StringifyOperator
                fontWeight: 'bold'
            })],
            ['brace', vscode.window.createTextEditorDecorationType({
                color: '#98CFDF' // RGB(152, 207, 223) - PropertyBrace
            })],
            ['format', vscode.window.createTextEditorDecorationType({
                color: '#8CCB80' // RGB(140, 203, 128) - FormatSpecifier
            })],
            ['alignment', vscode.window.createTextEditorDecorationType({
                color: '#F87171' // RGB(248, 113, 113) - Alignment
            })],
            ['positional', vscode.window.createTextEditorDecorationType({
                color: '#AAE3FF' // RGB(170, 227, 255) - PositionalIndex
            })],
            // Expression-specific decorations (matching serilog-syntax dark theme)
            ['expression.operator', vscode.window.createTextEditorDecorationType({
                color: '#FF7B72' // RGB(255, 123, 114) - ExpressionOperator from reference
            })],
            ['expression.function', vscode.window.createTextEditorDecorationType({
                color: '#C896FF' // RGB(200, 150, 255) - ExpressionFunction from reference
            })],
            ['expression.builtin', vscode.window.createTextEditorDecorationType({
                color: '#DCB4FF', // RGB(220, 180, 255) - ExpressionBuiltin from reference
                fontWeight: 'bold'
            })],
            ['expression.directive', vscode.window.createTextEditorDecorationType({
                color: '#F078B4' // RGB(240, 120, 180) - ExpressionDirective from reference
            })],
            ['expression.string', vscode.window.createTextEditorDecorationType({
                color: '#64C8C8' // RGB(100, 200, 200) - ExpressionLiteral (strings) from reference
            })],
            ['expression.number', vscode.window.createTextEditorDecorationType({
                color: '#64C8C8' // RGB(100, 200, 200) - ExpressionLiteral (numbers) from reference
            })],
            ['expression.keyword', vscode.window.createTextEditorDecorationType({
                color: '#569CD6', // RGB(86, 156, 214) - ExpressionKeyword from reference
                fontWeight: 'bold'
            })],
            ['expression.identifier', vscode.window.createTextEditorDecorationType({
                color: '#569CD6' // RGB(86, 156, 214) - ExpressionProperty from reference
            })]
        ]);
    }

    getDecoration(type: string): vscode.TextEditorDecorationType | undefined {
        return this.decorations.get(type);
    }

    dispose() {
        this.decorations.forEach(d => d.dispose());
    }
}