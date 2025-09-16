import * as vscode from 'vscode';
import { isSerilogCall } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';

export class SerilogBraceMatchProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private stringParser = new StringLiteralParser();
    private currentMatchRanges: vscode.Range[] = [];

    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editor.wordHighlightBorder')
        });
    }

    public updateBraceMatching(editor: vscode.TextEditor) {
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }

        const position = editor.selection.active;
        const matchRanges = this.findBraceMatch(editor.document, position);

        // Clear previous decorations
        editor.setDecorations(this.decorationType, []);
        this.currentMatchRanges = [];

        if (matchRanges.length > 0) {
            this.currentMatchRanges = matchRanges;
            editor.setDecorations(this.decorationType, matchRanges);
        }
    }

    private findBraceMatch(document: vscode.TextDocument, position: vscode.Position): vscode.Range[] {
        const line = document.lineAt(position.line);
        const lineText = line.text;

        // Check if we're in a Serilog call or multi-line Serilog context
        if (!isSerilogCall(lineText) && !this.isInMultiLineSerilogCall(document, position)) {
            return [];
        }

        const char = position.character < lineText.length ? lineText[position.character] : '';
        const prevChar = position.character > 0 ? lineText[position.character - 1] : '';

        let bracePos: vscode.Position | undefined;
        let isOpenBrace = false;

        // Check if cursor is on a brace
        if (char === '{') {
            bracePos = position;
            isOpenBrace = true;
        } else if (char === '}') {
            bracePos = position;
            isOpenBrace = false;
        } else if (prevChar === '}') {
            // VS Code standard: highlight when cursor is just after closing brace
            bracePos = new vscode.Position(position.line, position.character - 1);
            isOpenBrace = false;
        }

        if (!bracePos) {
            return [];
        }

        // Check if we're inside a string literal
        if (!this.isInSerilogStringLiteral(document, bracePos)) {
            return [];
        }

        const matchPos = isOpenBrace
            ? this.findClosingBrace(document, bracePos)
            : this.findOpeningBrace(document, bracePos);

        if (matchPos) {
            return [
                new vscode.Range(bracePos, bracePos.translate(0, 1)),
                new vscode.Range(matchPos, matchPos.translate(0, 1))
            ];
        }

        return [];
    }

    private isInMultiLineSerilogCall(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Look backwards up to 20 lines for Serilog call
        const maxLookback = 20;
        const startLine = Math.max(0, position.line - maxLookback);

        for (let i = position.line; i >= startLine; i--) {
            const line = document.lineAt(i);
            if (isSerilogCall(line.text)) {
                return this.isInSerilogStringLiteral(document, position);
            }
        }

        return false;
    }

    private isInSerilogStringLiteral(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line);
        const lineText = line.text;

        // Find string literals on this line
        const literals = this.stringParser.findAllStringLiterals(lineText);

        for (const literal of literals) {
            if (position.character >= literal.contentStart && position.character <= literal.contentEnd) {
                return true;
            }
        }

        // Check for multi-line string literals
        return this.isInMultiLineString(document, position);
    }

    private isInMultiLineString(document: vscode.TextDocument, position: vscode.Position): boolean {
        const maxLookback = 20;
        const startLine = Math.max(0, position.line - maxLookback);

        for (let i = position.line; i >= startLine; i--) {
            const line = document.lineAt(i);
            const lineText = line.text;

            // Check for verbatim string (@") or raw string (""")
            if (lineText.includes('@"') || lineText.includes('"""')) {
                // Simple check - if we find a string opener and we're past it, assume we're inside
                return true;
            }
        }

        return false;
    }

    private findClosingBrace(document: vscode.TextDocument, openPos: vscode.Position): vscode.Position | undefined {
        let braceCount = 1;
        let currentPos = openPos.translate(0, 1);
        const maxDistance = 200;
        let distance = 0;

        while (braceCount > 0 && currentPos.line < document.lineCount && distance < maxDistance) {
            const line = document.lineAt(currentPos.line);
            const lineText = line.text;

            for (let char = currentPos.character; char < lineText.length; char++) {
                const currentChar = lineText[char];

                // Skip escaped braces
                if (this.isEscapedBrace(lineText, char, currentChar)) {
                    char++; // Skip the next character
                    continue;
                }

                if (currentChar === '{') {
                    braceCount++;
                } else if (currentChar === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return new vscode.Position(currentPos.line, char);
                    }
                }

                distance++;
                if (distance >= maxDistance) {
                    return undefined;
                }
            }

            // Move to next line
            currentPos = new vscode.Position(currentPos.line + 1, 0);
        }

        return undefined;
    }

    private findOpeningBrace(document: vscode.TextDocument, closePos: vscode.Position): vscode.Position | undefined {
        let braceCount = 1;
        let currentPos = closePos.translate(0, -1);
        const maxDistance = 200;
        let distance = 0;

        while (braceCount > 0 && currentPos.line >= 0 && distance < maxDistance) {
            const line = document.lineAt(currentPos.line);
            const lineText = line.text;

            for (let char = currentPos.character; char >= 0; char--) {
                const currentChar = lineText[char];

                // Skip escaped braces
                if (char > 0 && this.isEscapedBrace(lineText, char - 1, lineText[char - 1])) {
                    char--; // Skip the previous character
                    continue;
                }

                if (currentChar === '}') {
                    braceCount++;
                } else if (currentChar === '{') {
                    braceCount--;
                    if (braceCount === 0) {
                        return new vscode.Position(currentPos.line, char);
                    }
                }

                distance++;
                if (distance >= maxDistance) {
                    return undefined;
                }
            }

            // Move to previous line
            if (currentPos.line > 0) {
                const prevLine = document.lineAt(currentPos.line - 1);
                currentPos = new vscode.Position(currentPos.line - 1, prevLine.text.length - 1);
            } else {
                break;
            }
        }

        return undefined;
    }

    private isEscapedBrace(lineText: string, pos: number, char: string): boolean {
        if (char !== '{' && char !== '}') {
            return false;
        }

        // Check if next character is the same (escaped brace pattern: {{ or }})
        return pos + 1 < lineText.length && lineText[pos + 1] === char;
    }

    public dispose() {
        this.decorationType.dispose();
    }
}