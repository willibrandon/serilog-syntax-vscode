import * as vscode from 'vscode';
import { isSerilogCall } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';

export class SerilogBraceMatchProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private stringParser = new StringLiteralParser();
    private currentMatchRanges: vscode.Range[] = [];

    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            // Use more visible styling for debugging
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editorBracketMatch.border')
        });
    }

    public updateBraceMatching(editor: vscode.TextEditor) {
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }

        const position = editor.selection.active;
        const matchRanges = this.findBraceMatch(editor.document, position);

        // Always clear and re-apply decorations to ensure they're visible
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

        // Find the string literal we're in
        const stringInfo = this.getStringAtPosition(document, position);
        if (!stringInfo) {
            return [];
        }

        const { content, startOffset } = stringInfo;
        const positionInString = document.offsetAt(position) - startOffset;

        // Check if cursor is on or adjacent to a brace
        if (positionInString < 0 || positionInString >= content.length) {
            return [];
        }

        const char = content[positionInString];
        const prevChar = positionInString > 0 ? content[positionInString - 1] : '';

        // Determine if we're on or near a brace
        let bracePos = -1;

        if (char === '{' || char === '}') {
            bracePos = positionInString;
        } else if (prevChar === '{' || prevChar === '}') {
            bracePos = positionInString - 1;
        }

        if (bracePos === -1) {
            return [];
        }

        // Find the matching brace for this specific property/directive
        const matchPos = this.findMatchingBraceForUnit(content, bracePos);
        if (matchPos === -1) {
            return [];
        }

        // Convert positions back to document ranges
        const braceStart = document.positionAt(startOffset + bracePos);
        const braceEnd = document.positionAt(startOffset + bracePos + 1);
        const matchStart = document.positionAt(startOffset + matchPos);
        const matchEnd = document.positionAt(startOffset + matchPos + 1);

        return [
            new vscode.Range(braceStart, braceEnd),
            new vscode.Range(matchStart, matchEnd)
        ];
    }

    private findMatchingBraceForUnit(content: string, pos: number): number {
        const char = content[pos];

        if (char === '{') {
            // We're on an opening brace, find its matching closing brace
            // This should be the closing brace of this specific unit (property/directive)

            // Check what comes after the opening brace
            if (pos + 1 < content.length) {
                const nextChar = content[pos + 1];

                // For directives like {#if}, {@m}, {$x}, etc.
                if (nextChar === '#' || nextChar === '@' || nextChar === '$') {
                    // Find the next } that closes this directive
                    for (let i = pos + 2; i < content.length; i++) {
                        if (content[i] === '}') {
                            return i;
                        }
                        // If we hit another { before finding }, this is malformed
                        if (content[i] === '{') {
                            return -1;
                        }
                    }
                } else {
                    // Regular property like {UserId} or {Price:C}
                    // Find the next } that closes this property
                    let inFormat = false;
                    for (let i = pos + 1; i < content.length; i++) {
                        if (content[i] === ':') {
                            inFormat = true;
                        }
                        if (content[i] === '}') {
                            return i;
                        }
                        // If we hit another { before finding }, this is malformed
                        if (content[i] === '{') {
                            return -1;
                        }
                    }
                }
            }
        } else if (char === '}') {
            // We're on a closing brace, find its matching opening brace
            // Look backwards for the { that opens this unit

            for (let i = pos - 1; i >= 0; i--) {
                if (content[i] === '{') {
                    // Verify this is the matching opening brace
                    // by checking if there are any other braces between
                    for (let j = i + 1; j < pos; j++) {
                        if (content[j] === '{' || content[j] === '}') {
                            // There's another brace between, not a match
                            break;
                        }
                    }
                    return i;
                }
                // If we hit another } before finding {, this is malformed
                if (content[i] === '}') {
                    return -1;
                }
            }
        }

        return -1;
    }

    private getStringAtPosition(document: vscode.TextDocument, position: vscode.Position): { content: string; startOffset: number } | null {
        const MAX_LINES = 50;
        const startLine = Math.max(0, position.line - MAX_LINES);
        const endLine = Math.min(document.lineCount - 1, position.line + MAX_LINES);

        let fullText = '';
        let lineOffsets: number[] = [0];

        // Build the text with line tracking
        for (let i = startLine; i <= endLine; i++) {
            const lineText = document.lineAt(i).text;
            fullText += lineText;
            if (i < endLine) {
                fullText += '\n';
                lineOffsets.push(fullText.length);
            }
        }

        // Find all string literals
        const literals = this.stringParser.findAllStringLiterals(fullText);
        const targetOffset = this.positionToOffset(position, startLine, lineOffsets);

        for (const literal of literals) {
            if (targetOffset >= literal.contentStart && targetOffset <= literal.contentEnd) {
                // Calculate the absolute start offset in the document
                const absoluteStart = document.offsetAt(new vscode.Position(startLine, 0)) + literal.contentStart;
                return {
                    content: literal.content,
                    startOffset: absoluteStart
                };
            }
        }

        return null;
    }

    private positionToOffset(position: vscode.Position, startLine: number, lineOffsets: number[]): number {
        const relativeLineNumber = position.line - startLine;
        if (relativeLineNumber < 0 || relativeLineNumber >= lineOffsets.length) {
            return -1;
        }
        return lineOffsets[relativeLineNumber] + position.character;
    }

    private isInMultiLineSerilogCall(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Look backwards for a Serilog call within a reasonable range
        const MAX_LINES_BACK = 20;
        const startLine = Math.max(0, position.line - MAX_LINES_BACK);

        for (let i = position.line; i >= startLine; i--) {
            const line = document.lineAt(i).text;
            if (isSerilogCall(line)) {

                // Build the full text from the Serilog call line to current position
                let fullText = '';
                for (let j = i; j <= position.line; j++) {
                    fullText += document.lineAt(j).text;
                    if (j < position.line) fullText += '\n';
                }

                // Find and remove string literals before counting parentheses
                const literals = this.stringParser.findAllStringLiterals(fullText);
                let cleanText = fullText;

                // Replace string content with spaces to preserve positions
                for (const lit of literals) {
                    const before = cleanText.substring(0, lit.contentStart);
                    const spaces = ' '.repeat(lit.contentEnd - lit.contentStart);
                    const after = cleanText.substring(lit.contentEnd);
                    cleanText = before + spaces + after;
                }

                // Now count parentheses in the cleaned text (without string contents)
                let openParens = 0;
                for (const char of cleanText) {
                    if (char === '(') openParens++;
                    if (char === ')') openParens--;
                }

                // Even if parentheses are balanced, if we found a Serilog call on a previous line
                // and we haven't hit a semicolon yet, we're still in the Serilog context
                // Check if there's a semicolon between the Serilog line and current position
                let foundSemicolon = false;
                for (let j = i; j <= position.line; j++) {
                    const checkLine = document.lineAt(j).text;
                    if (checkLine.includes(';')) {
                        foundSemicolon = true;
                        break;
                    }
                }

                if (openParens > 0 || !foundSemicolon) {
                    return true; // We're inside a Serilog call
                }
            }
        }

        return false;
    }

    public clearHighlights(): void {
        if (vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.setDecorations(this.decorationType, []);
        }
        this.currentMatchRanges = [];
    }

    public dispose(): void {
        this.clearHighlights();
        this.decorationType.dispose();
    }
}