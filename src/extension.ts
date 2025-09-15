import * as vscode from 'vscode';
import { findSerilogRanges } from './utils/serilogDetector';
import { StringLiteralParser } from './utils/stringLiteralParser';
import { parseTemplate } from './parsers/templateParser';
import { ExpressionParser } from './parsers/expressionParser';
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

        // Expression decorations
        const expressionOperatorDecorations: vscode.DecorationOptions[] = [];
        const expressionFunctionDecorations: vscode.DecorationOptions[] = [];
        const expressionBuiltinDecorations: vscode.DecorationOptions[] = [];
        const expressionDirectiveDecorations: vscode.DecorationOptions[] = [];
        const expressionStringDecorations: vscode.DecorationOptions[] = [];
        const expressionNumberDecorations: vscode.DecorationOptions[] = [];
        const expressionKeywordDecorations: vscode.DecorationOptions[] = [];
        const expressionIdentifierDecorations: vscode.DecorationOptions[] = [];

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

                // For WithComputed, only the second string is an expression
                let isWithComputedSecondString = false;
                if (lineText.includes('Enrich.WithComputed')) {
                    // Check if this is the second string (after the first comma)
                    const beforeLiteral = lineText.substring(0, literal.contentStart);
                    const commaCount = (beforeLiteral.match(/,/g) || []).length;
                    isWithComputedSecondString = commaCount >= 1;
                }

                // Check if this is an expression context by looking at the API call
                const isExpressionAPI = lineText.includes('new ExpressionTemplate(') ||
                                      lineText.includes('Filter.ByExcluding') ||
                                      lineText.includes('Filter.ByIncluding') ||
                                      lineText.includes('Enrich.When') ||
                                      isWithComputedSecondString ||
                                      lineText.includes('.Conditional(');

                // Even if in expression API context, check if the content is actually an expression
                const isExpressionTemplate = templateContent.includes('{#if') ||
                                           templateContent.includes('{#each') ||
                                           templateContent.includes('{#else') ||
                                           templateContent.includes('{#end') ||
                                           templateContent.includes('..@') ||
                                           templateContent.includes('@p[') ||
                                           templateContent.includes('@i') ||
                                           templateContent.includes('@r');

                const isFilterExpression = templateContent.includes(' like ') ||
                                         templateContent.includes(' not like ') ||
                                         templateContent.includes(' in ') ||
                                         templateContent.includes(' not in ') ||
                                         templateContent.includes(' is null') ||
                                         templateContent.includes(' is not null') ||
                                         templateContent.includes(' and ') ||
                                         templateContent.includes(' or ') ||
                                         templateContent.includes(' ci') ||
                                         templateContent.includes('if ') ||
                                         templateContent.includes(' then ') ||
                                         templateContent.includes(' else ') ||
                                         /\b(StartsWith|EndsWith|Contains|TypeOf|IsDefined|Length|Has|Substring|LastIndexOf|Round|Coalesce)\s*\(/.test(templateContent);

                // Parse as expression if it's in an expression API context
                // Even simple templates like [{@t:HH:mm:ss}] should be parsed as expressions in ExpressionTemplate
                if (isExpressionAPI) {
                    // Parse as expression ONLY - no template parsing for expressions
                    const expressionParser = new ExpressionParser(templateContent);
                    const expressionElements = expressionParser.parse();

                    for (let i = 0; i < expressionElements.length; i++) {
                        const element = expressionElements[i];
                        const absoluteStart = templateStartOffset + element.startIndex;
                        const absoluteEnd = templateStartOffset + element.endIndex;
                        const startPos = editor.document.positionAt(absoluteStart);
                        const endPos = editor.document.positionAt(absoluteEnd);
                        const range = new vscode.Range(startPos, endPos);

                        switch (element.classificationType) {
                            case 'operator':
                                expressionOperatorDecorations.push({ range });
                                break;
                            case 'function':
                                expressionFunctionDecorations.push({ range });
                                break;
                            case 'builtin':
                                expressionBuiltinDecorations.push({ range });
                                break;
                            case 'directive':
                                expressionDirectiveDecorations.push({ range });
                                break;
                            case 'string':
                                expressionStringDecorations.push({ range });
                                break;
                            case 'number':
                                expressionNumberDecorations.push({ range });
                                break;
                            case 'identifier':
                                expressionIdentifierDecorations.push({ range });
                                break;
                            case 'format':
                                // Use the regular format decoration for consistency
                                formatDecorations.push({ range });
                                break;
                            case 'punctuation':
                                // Punctuation inherits string color
                                break;
                            case 'brace':
                                braceDecorations.push({ range });
                                break;
                        }
                    }
                } else {
                    // Parse as regular template
                    const properties = parseTemplate(templateContent);
                    for (const property of properties) {
                        processTemplateProperty(property, templateStartOffset);
                    }
                }

                // Helper function to process template properties
                function processTemplateProperty(property: any, templateStartOffset: number) {
                    if (!editor) return;

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

        // Apply expression decorations
        editor.setDecorations(decorationManager.getDecoration('expression.operator')!, expressionOperatorDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.function')!, expressionFunctionDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.builtin')!, expressionBuiltinDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.directive')!, expressionDirectiveDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.string')!, expressionStringDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.number')!, expressionNumberDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.keyword')!, expressionKeywordDecorations);
        editor.setDecorations(decorationManager.getDecoration('expression.identifier')!, expressionIdentifierDecorations);
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