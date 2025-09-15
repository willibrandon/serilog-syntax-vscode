import * as vscode from 'vscode';

export function isSerilogCall(line: string): boolean {
    const patterns = [
        /\b(Log|logger|_logger)\.(Information|Debug|Warning|Error|Fatal|Verbose)/,
        /\b(Log|logger|_logger)\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)/,
        /\.WriteTo\.\w+\([^)]*outputTemplate:/,
        /new\s+ExpressionTemplate\s*\(/
    ];

    return patterns.some(pattern => pattern.test(line));
}

export function findSerilogRanges(document: vscode.TextDocument): vscode.Range[] {
    const ranges: vscode.Range[] = [];

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (isSerilogCall(line.text)) {
            ranges.push(line.range);
        }
    }

    return ranges;
}