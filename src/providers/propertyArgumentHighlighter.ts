import * as vscode from 'vscode';
import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

export class PropertyArgumentHighlighter implements vscode.Disposable {
    private decorationType: vscode.TextEditorDecorationType;
    private currentDecorations: vscode.TextEditorDecorationType | undefined;
    private stringParser = new StringLiteralParser();
    private disposables: vscode.Disposable[] = [];

    constructor() {
        // Create decoration type for highlighting property-argument pairs
        // Uses background fill to distinguish from brace matching (which is outline only)
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
            borderRadius: '3px'
        });

        // Listen for cursor position changes
        this.disposables.push(
            vscode.window.onDidChangeTextEditorSelection(this.onSelectionChange, this)
        );

        // Clear decorations when editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(() => this.clearDecorations())
        );
    }

    private onSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        const editor = event.textEditor;

        // Check if feature is enabled
        const config = vscode.workspace.getConfiguration('serilog');
        if (!config.get<boolean>('propertyArgumentHighlighting', true)) {
            this.clearDecorations();
            return;
        }

        // Only process C# files
        if (editor.document.languageId !== 'csharp') {
            this.clearDecorations();
            return;
        }

        // Only handle single cursor positions (not selections)
        if (event.selections.length !== 1 || !event.selections[0].isEmpty) {
            this.clearDecorations();
            return;
        }

        const position = event.selections[0].active;
        this.highlightPropertyArgumentPair(editor, position);
    }

    private highlightPropertyArgumentPair(editor: vscode.TextEditor, position: vscode.Position): void {
        const document = editor.document;

        // Find Serilog ranges
        const serilogRanges = findSerilogRanges(document);
        if (serilogRanges.length === 0) {
            this.clearDecorations();
            return;
        }

        // Find the Serilog call containing the cursor
        const containingRange = serilogRanges.find(range => range.contains(position));
        if (!containingRange) {
            this.clearDecorations();
            return;
        }

        const text = document.getText(containingRange);
        const rangeStart = document.offsetAt(containingRange.start);
        const cursorOffset = document.offsetAt(position);
        const relativePosition = cursorOffset - rangeStart;

        // Find string literals
        const literals = this.stringParser.findAllStringLiterals(text);
        if (literals.length === 0) {
            this.clearDecorations();
            return;
        }

        // Check if cursor is in a template string
        const literal = literals[0];
        if (!literal) {
            this.clearDecorations();
            return;
        }

        // Parse the template
        const template = parseTemplate(literal.content);
        if (!template || template.length === 0) {
            this.clearDecorations();
            return;
        }

        // Check if cursor is on a property in the template
        const propertyAtCursor = this.findPropertyAtPosition(template, literal, relativePosition);
        if (propertyAtCursor) {
            // Highlight the property and its argument
            this.highlightProperty(editor, document, containingRange, propertyAtCursor, template, literal, text);
            return;
        }

        // Check if cursor is on an argument
        const argumentIndex = this.findArgumentAtPosition(text, relativePosition);
        if (argumentIndex !== -1 && argumentIndex < template.length) {
            // Highlight the argument and its property
            this.highlightArgument(editor, document, containingRange, argumentIndex, template, literal, text);
            return;
        }

        this.clearDecorations();
    }

    private findPropertyAtPosition(template: any[], literal: any, position: number): any {
        // Check if position is within the string literal
        if (position < literal.contentStart || position > literal.contentEnd) {
            return null;
        }

        // Adjust position relative to template content
        const templatePosition = position - literal.contentStart;

        // Find property at this position
        return template.find(prop =>
            templatePosition >= prop.startIndex && templatePosition <= prop.endIndex
        );
    }

    private findArgumentAtPosition(text: string, position: number): number {
        // Find the arguments section after the template string
        const match = text.match(/\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\@\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\"\"\".*?\"\"\"\s*,(.*)\)/s);

        if (!match || !match[1]) return -1;

        // Find where the arguments actually start (after the comma following the template string)
        const templateEndMatch = text.match(/\"[^\"]*\"\s*,/s) ||
                                text.match(/\@\"[^\"]*\"\s*,/s) ||
                                text.match(/\"\"\".*?\"\"\"\s*,/s);

        if (!templateEndMatch) return -1;

        const argsStart = text.indexOf(templateEndMatch[0]) + templateEndMatch[0].length;
        if (position < argsStart) return -1;

        const argsText = match[1];
        const relativePos = position - argsStart;

        // Parse arguments to find which one the cursor is on
        let currentIndex = 0;
        let currentPos = 0;
        let inString = false;
        let parenDepth = 0;
        let bracketDepth = 0;

        for (let i = 0; i < argsText.length; i++) {
            const char = argsText[i];

            // Track if we're at the cursor position
            if (i === relativePos) {
                return currentIndex;
            }

            if (char === '"' && (i === 0 || argsText[i - 1] !== '\\')) {
                inString = !inString;
            } else if (!inString) {
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
                else if (char === '{') bracketDepth++;
                else if (char === '}') bracketDepth--;
                else if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
                    currentIndex++;
                }
            }
        }

        // If cursor is at or after the last position
        if (relativePos >= 0 && relativePos <= argsText.length) {
            return currentIndex;
        }

        return -1;
    }

    private highlightProperty(
        editor: vscode.TextEditor,
        document: vscode.TextDocument,
        range: vscode.Range,
        property: any,
        template: any[],
        literal: any,
        text: string
    ): void {
        const decorations: vscode.DecorationOptions[] = [];
        const rangeStart = document.offsetAt(range.start);

        // Highlight the property in the template INCLUDING braces
        const propStart = rangeStart + literal.contentStart + property.startIndex;
        const propEnd = rangeStart + literal.contentStart + property.endIndex;
        decorations.push({
            range: new vscode.Range(
                document.positionAt(propStart),
                document.positionAt(propEnd)
            )
        });

        // Find and highlight the corresponding argument
        const propertyIndex = template.indexOf(property);
        const argPosition = this.findArgumentPosition(text, propertyIndex);
        if (argPosition) {
            // Expand range to include quotes if it's a string
            let argStart = rangeStart + argPosition.start;
            let argEnd = rangeStart + argPosition.end;

            // Check if the argument is a string and include quotes
            const argText = text.substring(argPosition.start, argPosition.end);
            const beforeArg = text.substring(Math.max(0, argPosition.start - 1), argPosition.start);
            const afterArg = text.substring(argPosition.end, Math.min(text.length, argPosition.end + 1));

            if (beforeArg === '"' || beforeArg === '@') {
                argStart--; // Include opening quote
            }
            if (afterArg === '"') {
                argEnd++; // Include closing quote
            }

            decorations.push({
                range: new vscode.Range(
                    document.positionAt(argStart),
                    document.positionAt(argEnd)
                )
            });
        }

        this.applyDecorations(editor, decorations);
    }

    private highlightArgument(
        editor: vscode.TextEditor,
        document: vscode.TextDocument,
        range: vscode.Range,
        argumentIndex: number,
        template: any[],
        literal: any,
        text: string
    ): void {
        const decorations: vscode.DecorationOptions[] = [];
        const rangeStart = document.offsetAt(range.start);

        // Highlight the argument
        const argPosition = this.findArgumentPosition(text, argumentIndex);
        if (argPosition) {
            // Expand range to include quotes if it's a string
            let argStart = rangeStart + argPosition.start;
            let argEnd = rangeStart + argPosition.end;

            // Check if the argument is a string and include quotes
            const beforeArg = text.substring(Math.max(0, argPosition.start - 1), argPosition.start);
            const afterArg = text.substring(argPosition.end, Math.min(text.length, argPosition.end + 1));

            if (beforeArg === '"' || beforeArg === '@') {
                argStart--; // Include opening quote
            }
            if (afterArg === '"') {
                argEnd++; // Include closing quote
            }

            decorations.push({
                range: new vscode.Range(
                    document.positionAt(argStart),
                    document.positionAt(argEnd)
                )
            });
        }

        // Highlight the corresponding property in the template INCLUDING braces
        if (argumentIndex < template.length) {
            const property = template[argumentIndex];
            const propStart = rangeStart + literal.contentStart + property.startIndex;
            const propEnd = rangeStart + literal.contentStart + property.endIndex;
            decorations.push({
                range: new vscode.Range(
                    document.positionAt(propStart),
                    document.positionAt(propEnd)
                )
            });
        }

        this.applyDecorations(editor, decorations);
    }

    private findArgumentPosition(text: string, index: number): { start: number; end: number } | null {
        // Find the arguments section
        const match = text.match(/\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\@\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\"\"\".*?\"\"\"\s*,(.*)\)/s);

        if (!match || !match[1]) return null;

        const argsText = match[1];
        // Find where the arguments actually start (after the comma following the template string)
        const templateEndMatch = text.match(/\"[^\"]*\"\s*,/s) ||
                                text.match(/\@\"[^\"]*\"\s*,/s) ||
                                text.match(/\"\"\".*?\"\"\"\s*,/s);

        if (!templateEndMatch) return null;

        const argsStart = text.indexOf(templateEndMatch[0]) + templateEndMatch[0].length;

        let currentIndex = 0;
        let argStart = 0;
        let i = 0;
        let inString = false;
        let parenDepth = 0;
        let bracketDepth = 0;

        // Skip whitespace at start
        while (i < argsText.length && /\s/.test(argsText[i])) i++;
        argStart = i;

        for (; i < argsText.length; i++) {
            const char = argsText[i];

            if (char === '"' && (i === 0 || argsText[i - 1] !== '\\')) {
                inString = !inString;
            } else if (!inString) {
                if (char === '(') parenDepth++;
                else if (char === ')') {
                    parenDepth--;
                    if (parenDepth < 0) break; // End of arguments
                }
                else if (char === '{') bracketDepth++;
                else if (char === '}') bracketDepth--;
                else if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
                    if (currentIndex === index) {
                        // Found the target argument
                        return {
                            start: argsStart + argStart,
                            end: argsStart + i
                        };
                    }
                    currentIndex++;
                    // Skip whitespace after comma
                    i++;
                    while (i < argsText.length && /\s/.test(argsText[i])) i++;
                    argStart = i;
                    i--; // Adjust for loop increment
                }
            }
        }

        // Check if we're looking for the last argument
        if (currentIndex === index && i > argStart) {
            return {
                start: argsStart + argStart,
                end: argsStart + i
            };
        }

        return null;
    }

    private applyDecorations(editor: vscode.TextEditor, decorations: vscode.DecorationOptions[]): void {
        this.clearDecorations();
        editor.setDecorations(this.decorationType, decorations);
    }

    private clearDecorations(): void {
        if (vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.setDecorations(this.decorationType, []);
        }
    }

    public dispose(): void {
        this.clearDecorations();
        this.decorationType.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}