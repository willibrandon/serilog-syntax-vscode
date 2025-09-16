import * as vscode from 'vscode';
import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

export class SerilogNavigationProvider implements vscode.CodeActionProvider {
    private stringParser = new StringLiteralParser();

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        if (document.languageId !== 'csharp') {
            return undefined;
        }

        const position = range.start;
        
        // Use existing utility to find Serilog ranges
        const serilogRanges = findSerilogRanges(document);
        
        // Check if position is within any Serilog range
        const containingRange = serilogRanges.find(r => r.contains(position));
        if (!containingRange) {
            return undefined;
        }

        // Get the text of the Serilog call
        const text = document.getText(containingRange);
        const rangeStart = document.offsetAt(containingRange.start);
        const cursorOffset = document.offsetAt(position);
        const relativePosition = cursorOffset - rangeStart;

        // Find string literals using existing parser
        const literals = this.stringParser.findAllStringLiterals(text);
        
        for (const literal of literals) {
            if (literal.type === 'interpolated') continue;
            
            // Check if cursor is in this literal
            if (relativePosition >= literal.contentStart && relativePosition <= literal.contentEnd) {
                // Parse template using existing parser
                const properties = parseTemplate(literal.content);
                
                // Find which property cursor is on
                const cursorInLiteral = relativePosition - literal.contentStart;
                for (const property of properties) {
                    if (cursorInLiteral >= property.startIndex && cursorInLiteral < property.endIndex) {
                        // Find the argument position
                        const argPosition = this.findArgument(document, containingRange, property, properties);
                        if (argPosition) {
                            const action = new vscode.CodeAction(
                                `Navigate to '${property.name}' argument`,
                                vscode.CodeActionKind.QuickFix
                            );
                            action.command = {
                                command: 'serilog.navigateToArgument',
                                title: 'Navigate',
                                arguments: [argPosition]
                            };
                            return [action];
                        }
                    }
                }
            }
        }

        return undefined;
    }

    private findArgument(document: vscode.TextDocument, range: vscode.Range, property: any, allProperties: any[]): vscode.Position | undefined {
        const text = document.getText(range);

        // Find the arguments after the string literal - need better regex
        const match = text.match(/\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\@\"[^\"]*\"\s*,(.*)\)/s) ||
                     text.match(/\"\"\".*?\"\"\"\s*,(.*)\)/s);

        if (!match) return undefined;

        const argsText = match[1];
        const argsStart = text.indexOf(match[1]);

        // For positional properties like {0}, {1}, use the number directly
        if (property.type === 'positional') {
            const targetIndex = parseInt(property.name);
            return this.findArgumentAtIndex(document, range.start, argsText, argsStart, targetIndex);
        }

        // For named properties, only count non-positional properties
        const namedProperties = allProperties.filter(p => p.type !== 'positional');
        const propertyIndex = namedProperties.indexOf(property);
        if (propertyIndex === -1) return undefined;

        // But we need to account for any positional args that come first
        const positionalCount = allProperties.filter(p => p.type === 'positional' &&
            allProperties.indexOf(p) < allProperties.indexOf(property)).length;
        const targetIndex = propertyIndex + positionalCount;

        return this.findArgumentAtIndex(document, range.start, argsText, argsStart, targetIndex);
    }

    private findArgumentAtIndex(document: vscode.TextDocument, rangeStart: vscode.Position, argsText: string, argsStart: number, targetIndex: number): vscode.Position | undefined {
        let currentIndex = 0;
        let inString = false;
        let parenDepth = 0;
        let lastArgStart = 0;

        for (let i = 0; i < argsText.length; i++) {
            const char = argsText[i];

            if (char === '"' && (i === 0 || argsText[i-1] !== '\\')) {
                inString = !inString;
            } else if (!inString) {
                if (char === '(') parenDepth++;
                else if (char === ')') {
                    parenDepth--;
                    if (parenDepth < 0) break; // End of arguments
                }
                else if (char === ',' && parenDepth === 0) {
                    if (currentIndex === targetIndex) {
                        // Found target - it's from lastArgStart to here
                        let start = lastArgStart;
                        while (start < argsText.length && /\s/.test(argsText[start])) start++;
                        const absoluteOffset = document.offsetAt(rangeStart) + argsStart + start;
                        return document.positionAt(absoluteOffset);
                    }
                    currentIndex++;
                    lastArgStart = i + 1;
                }
            }
        }

        // Check if we're looking for the last argument
        if (currentIndex === targetIndex) {
            let start = lastArgStart;
            while (start < argsText.length && /\s/.test(argsText[start])) start++;
            const absoluteOffset = document.offsetAt(rangeStart) + argsStart + start;
            return document.positionAt(absoluteOffset);
        }

        return undefined;
    }
}

export function registerNavigationCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('serilog.navigateToArgument', (position: vscode.Position) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
    });
}