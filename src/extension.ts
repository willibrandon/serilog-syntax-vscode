import * as vscode from 'vscode';
import { findSerilogRanges } from './utils/serilogDetector';
import { StringLiteralParser } from './utils/stringLiteralParser';
import { parseTemplate } from './parsers/templateParser';
import { ExpressionParser } from './parsers/expressionParser';
import { DecorationManager } from './decorations/decorationManager';
import { CacheManager } from './utils/cacheManager';
import { Debouncer } from './utils/debouncer';
import { ThemeManager } from './utils/themeManager';
import { SerilogNavigationProvider, registerNavigationCommand } from './providers/navigationProvider';
import { PropertyArgumentHighlighter } from './providers/propertyArgumentHighlighter';
import { SerilogBraceMatchProvider } from './providers/braceMatchProvider';

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Serilog Syntax');

    const themeManager = new ThemeManager();
    const currentTheme = themeManager.getCurrentTheme();

    // Get version from package.json
    const extension = vscode.extensions.getExtension('mtlog.serilog-syntax-vscode');
    const version = extension?.packageJSON?.version || 'unknown';

    // Log activation silently (users can view in Output panel if needed)
    outputChannel.appendLine(`Serilog Syntax Highlighting v${version} activated (${currentTheme === 'light' ? 'Light' : 'Dark'} mode)`);

    const decorationManager = new DecorationManager(themeManager, outputChannel);
    const stringParser = new StringLiteralParser();

    // Performance optimization: caching and debouncing
    const templateCache = new CacheManager<any[]>(100, 60000); // Max 100 entries, 1 minute expiry
    const expressionCache = new CacheManager<any[]>(100, 60000);
    const debouncer = new Debouncer(100); // 100ms delay

    // Initialize brace matching provider

    // Initialize navigation provider
    const navigationProvider = new SerilogNavigationProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            'csharp',
            navigationProvider,
            {
                providedCodeActionKinds: SerilogNavigationProvider.providedCodeActionKinds
            }
        )
    );

    // Register navigation command
    context.subscriptions.push(registerNavigationCommand());

    // Initialize property-argument highlighter
    const propertyArgumentHighlighter = new PropertyArgumentHighlighter();
    context.subscriptions.push(propertyArgumentHighlighter);

    // Initialize brace match provider
    const braceMatchProvider = new SerilogBraceMatchProvider();
    context.subscriptions.push(braceMatchProvider);

    function updateDecorations() {
        const config = vscode.workspace.getConfiguration('serilog');
        const enabled = config.get<boolean>('enabled', true);

        if (!enabled) {
            // Clear all decorations if disabled
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                for (const decorationType of ['property', 'destructure', 'stringify', 'brace', 'format',
                    'alignment', 'positional', 'expression.operator', 'expression.function',
                    'expression.builtin', 'expression.directive', 'expression.string',
                    'expression.number', 'expression.keyword', 'expression.identifier']) {
                    const decoration = decorationManager.getDecoration(decorationType);
                    if (decoration) {
                        editor.setDecorations(decoration, []);
                    }
                }
            }
            return;
        }
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
                    // Check cache first
                    const cacheKey = `expr:${templateContent}`;
                    let expressionElements = expressionCache.get(cacheKey);

                    if (!expressionElements) {
                        // Parse as expression ONLY - no template parsing for expressions
                        const expressionParser = new ExpressionParser(templateContent);
                        expressionElements = expressionParser.parse();
                        expressionCache.set(cacheKey, expressionElements);
                    }

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
                    // Check cache first
                    const cacheKey = `tmpl:${templateContent}`;
                    let properties = templateCache.get(cacheKey);

                    if (!properties) {
                        // Parse as regular template
                        properties = parseTemplate(templateContent);
                        templateCache.set(cacheKey, properties);
                    }

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
                        let nameEndOffset = absoluteStart + 1 + property.name.length;

                        // Add the positional number itself
                        const nameEnd = editor.document.positionAt(nameEndOffset);
                        positionalDecorations.push({ range: new vscode.Range(nameStart, nameEnd) });

                        // Check for alignment or format specifier (same as standard properties)
                        if (property.alignment || property.formatSpecifier) {
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
                        }
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

    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand('serilog.refresh', () => {
        updateDecorations();
    });
    context.subscriptions.push(refreshCommand);

    // Register ESC handler to clear highlights
    const clearHighlightsCommand = vscode.commands.registerCommand('serilog.clearHighlights', () => {
        // Clear brace matching highlights
        braceMatchProvider.clearHighlights();

        // Clear property-argument highlights
        propertyArgumentHighlighter.clearDecorations();
    });
    context.subscriptions.push(clearHighlightsCommand);

    // Initial update without debouncing
    updateDecorations();

    // Use immediate update for editor changes
    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);

    // Use debounced update for document changes (while typing)
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            debouncer.debounce(updateDecorations);
        }
    }, null, context.subscriptions);

    // Listen for cursor position changes to update brace matching
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor === vscode.window.activeTextEditor) {
            braceMatchProvider.updateBraceMatching(event.textEditor);
        }
    }, null, context.subscriptions);

    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations();
            braceMatchProvider.updateBraceMatching(editor);
        }
    }, null, context.subscriptions);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('serilog')) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    // Listen for theme changes and force refresh
    vscode.window.onDidChangeActiveColorTheme(() => {
        // Small delay to let the decorations reinitialize
        setTimeout(() => {
            outputChannel.appendLine('Refreshing decorations for new theme...');
            updateDecorations();
        }, 100);
    }, null, context.subscriptions);

    // Dispose resources when extension is deactivated
    context.subscriptions.push({
        dispose: () => {
            outputChannel.appendLine('Extension deactivating...');
            decorationManager.dispose();
            debouncer.dispose();
            templateCache.clear();
            expressionCache.clear();
            outputChannel.dispose();
        }
    });

    // Periodically prune expired cache entries (every 5 minutes)
    const pruneInterval = setInterval(() => {
        templateCache.pruneExpired();
        expressionCache.pruneExpired();
    }, 5 * 60 * 1000);

    context.subscriptions.push({
        dispose: () => clearInterval(pruneInterval)
    });
}

export function deactivate() {}