import * as vscode from 'vscode';
import { findSerilogRanges } from './utils/serilogDetector';
import { StringLiteralParser } from './utils/stringLiteralParser';
import { parseTemplate } from './parsers/templateParser';
import { DecorationManager } from './decorations/decorationManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Serilog extension activated!');

    const decorationManager = new DecorationManager();
    const stringParser = new StringLiteralParser();

    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }

        // Clear all decorations first
        const propertyDecorations: vscode.DecorationOptions[] = [];
        const destructureDecorations: vscode.DecorationOptions[] = [];
        const stringifyDecorations: vscode.DecorationOptions[] = [];
        const braceDecorations: vscode.DecorationOptions[] = [];
        const formatDecorations: vscode.DecorationOptions[] = [];
        const alignmentDecorations: vscode.DecorationOptions[] = [];
        const positionalDecorations: vscode.DecorationOptions[] = [];

        const serilogRanges = findSerilogRanges(editor.document);

        // Process each Serilog call line
        for (const range of serilogRanges) {
            const lineText = editor.document.getText(range);
            const lineStartOffset = editor.document.offsetAt(range.start);

            // Find string literals in the line using proper parser
            const stringLiterals = stringParser.findAllStringLiterals(lineText);

            for (const literal of stringLiterals) {
                // Skip interpolated strings - Serilog doesn't use them
                if (literal.type === 'interpolated') {
                    continue;
                }

                const templateContent = literal.content;
                const templateStartOffset = lineStartOffset + literal.contentStart;

                // Parse the template
                const properties = parseTemplate(templateContent);

                for (const property of properties) {
                    const absoluteStart = templateStartOffset + property.startIndex;
                    const absoluteEnd = templateStartOffset + property.endIndex;

                    // Add braces
                    const braceStartPos = editor.document.positionAt(absoluteStart);
                    const braceEndPos = editor.document.positionAt(absoluteStart + 1);
                    braceDecorations.push({ range: new vscode.Range(braceStartPos, braceEndPos) });

                    const closeBracePos = editor.document.positionAt(absoluteEnd - 1);
                    const closeBraceEndPos = editor.document.positionAt(absoluteEnd);
                    braceDecorations.push({ range: new vscode.Range(closeBracePos, closeBraceEndPos) });

                    // Add operator decoration if destructured or stringified
                    if (property.type === 'destructured' || property.type === 'stringified') {
                        const operatorStart = editor.document.positionAt(absoluteStart + 1);
                        const operatorEnd = editor.document.positionAt(absoluteStart + 2);

                        if (property.type === 'destructured') {
                            destructureDecorations.push({ range: new vscode.Range(operatorStart, operatorEnd) });
                        } else {
                            stringifyDecorations.push({ range: new vscode.Range(operatorStart, operatorEnd) });
                        }

                        // Property name starts after operator
                        const nameStart = editor.document.positionAt(absoluteStart + 2);
                        const nameEnd = editor.document.positionAt(absoluteStart + 2 + property.name.length);

                        if (property.type === 'destructured' || property.type === 'stringified') {
                            propertyDecorations.push({ range: new vscode.Range(nameStart, nameEnd) });
                        }
                    } else if (property.type === 'positional') {
                        // Positional parameter
                        const nameStart = editor.document.positionAt(absoluteStart + 1);
                        const nameEnd = editor.document.positionAt(absoluteStart + 1 + property.name.length);
                        positionalDecorations.push({ range: new vscode.Range(nameStart, nameEnd) });
                    } else {
                        // Standard property
                        const nameStart = editor.document.positionAt(absoluteStart + 1);
                        let nameEndOffset = absoluteStart + 1 + property.name.length;

                        // Check for alignment or format specifier
                        if (property.alignment || property.formatSpecifier) {
                            // Property name ends where alignment or format starts
                            const propEnd = editor.document.positionAt(nameEndOffset);
                            propertyDecorations.push({ range: new vscode.Range(nameStart, propEnd) });

                            // Add alignment decoration
                            if (property.alignment) {
                                const alignStart = nameEndOffset; // Starts at comma
                                const alignEnd = alignStart + 1 + property.alignment.length; // comma + alignment
                                const alignStartPos = editor.document.positionAt(alignStart);
                                const alignEndPos = editor.document.positionAt(alignEnd);
                                alignmentDecorations.push({ range: new vscode.Range(alignStartPos, alignEndPos) });
                                nameEndOffset = alignEnd;
                            }

                            // Add format specifier decoration
                            if (property.formatSpecifier) {
                                const formatStart = nameEndOffset; // Starts at colon
                                const formatEnd = formatStart + 1 + property.formatSpecifier.length; // colon + format
                                const formatStartPos = editor.document.positionAt(formatStart);
                                const formatEndPos = editor.document.positionAt(formatEnd);
                                formatDecorations.push({ range: new vscode.Range(formatStartPos, formatEndPos) });
                            }
                        } else {
                            const nameEnd = editor.document.positionAt(nameEndOffset);
                            propertyDecorations.push({ range: new vscode.Range(nameStart, nameEnd) });
                        }
                    }
                }
            }
        }

        // Apply all decorations
        editor.setDecorations(decorationManager.getDecoration('property')!, propertyDecorations);
        editor.setDecorations(decorationManager.getDecoration('destructure')!, destructureDecorations);
        editor.setDecorations(decorationManager.getDecoration('stringify')!, stringifyDecorations);
        editor.setDecorations(decorationManager.getDecoration('brace')!, braceDecorations);
        editor.setDecorations(decorationManager.getDecoration('format')!, formatDecorations);
        editor.setDecorations(decorationManager.getDecoration('alignment')!, alignmentDecorations);
        editor.setDecorations(decorationManager.getDecoration('positional')!, positionalDecorations);
    }

    updateDecorations();
    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    // Dispose decorations when extension is deactivated
    context.subscriptions.push({
        dispose: () => decorationManager.dispose()
    });
}

export function deactivate() {}