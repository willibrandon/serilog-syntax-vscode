import * as vscode from 'vscode';

export function isSerilogCall(line: string): boolean {
    const patterns = [
        // Match any variable ending with log, Log, Logger, logger, _logger, or standalone 'log'
        /\b(\w*[Ll]og(?:ger)?|\w*_logger|log)\b\.(Information|Debug|Warning|Error|Fatal|Verbose)/,
        /\b(\w*[Ll]og(?:ger)?|\w*_logger|log)\b\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)/,
        // Also match ForContext pattern which is common in Serilog
        /\b(\w*[Ll]og(?:ger)?|\w*_logger|log)\b\.ForContext/,
        // Match ANY variable calling Serilog logging methods (like program.Information)
        /\b\w+\.(Information|Debug|Warning|Error|Fatal|Verbose)\s*\(/,
        /\b\w+\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)\s*\(/,
        // Match continuation lines that start with .Information, .Debug, etc.
        /^\s*\.(Information|Debug|Warning|Error|Fatal|Verbose)\s*\(/,
        /^\s*\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)\s*\(/,
        /\.WriteTo\.\w+\([^)]*outputTemplate:/,
        /new\s+ExpressionTemplate\s*\(/,
        /\.Filter\.(ByExcluding|ByIncludingOnly)\s*\(/,
        /\.Enrich\.(When|WithComputed)\s*\(/,
        /\.WriteTo\.Conditional\s*\(/
    ];

    return patterns.some(pattern => pattern.test(line));
}

/**
 * Finds ranges in the document that contain Serilog calls.
 * Now handles multi-line strings properly.
 */
export function findSerilogRanges(document: vscode.TextDocument): vscode.Range[] {
    const ranges: vscode.Range[] = [];
    const processedLines = new Set<number>();

    for (let i = 0; i < document.lineCount; i++) {
        // Skip if we've already processed this line as part of a multi-line range
        if (processedLines.has(i)) continue;

        const line = document.lineAt(i);

        if (isSerilogCall(line.text)) {
            // Found a Serilog call, now determine its full range
            const range = findFullCallRange(document, i);
            ranges.push(range);

            // Mark all lines in this range as processed
            for (let j = range.start.line; j <= range.end.line; j++) {
                processedLines.add(j);
            }
        }
    }

    return ranges;
}

/**
 * Finds the complete range of a Serilog method call, including multi-line strings.
 * Handles parentheses, string literals, and method chaining.
 */
function findFullCallRange(document: vscode.TextDocument, startLine: number): vscode.Range {
    let currentLine = startLine;
    let openParens = 0;
    let closeParens = 0;
    let inString = false;
    let stringType: 'regular' | 'verbatim' | 'raw' | null = null;
    let rawQuoteCount = 0;

    // First, find where the call actually starts (might be before the detected line)
    let callStartLine = startLine;
    let callStartChar = 0;

    // Look backwards to find the actual start if we're in the middle of a call
    for (let i = startLine; i >= 0; i--) {
        const lineText = document.lineAt(i).text;

        // Check if this line has the actual method call start
        if (isSerilogCall(lineText)) {
            callStartLine = i;
            // Find the position of the method name
            const methodMatch = lineText.match(/\b(Log|logger|_logger|new\s+ExpressionTemplate)\b/);
            if (methodMatch && methodMatch.index !== undefined) {
                callStartChar = methodMatch.index;
            }
            break;
        }

        // If we see a semicolon or closing brace, we've gone too far back
        if (lineText.includes(';') || lineText.includes('}')) {
            break;
        }
    }

    // Now find the end of the call
    let callEndLine = callStartLine;
    let callEndChar = 0;

    for (let lineNum = callStartLine; lineNum < document.lineCount; lineNum++) {
        const lineText = document.lineAt(lineNum).text;
        let i = (lineNum === callStartLine) ? callStartChar : 0;

        while (i < lineText.length) {
            const char = lineText[i];
            const nextChar = i + 1 < lineText.length ? lineText[i + 1] : '';
            const nextNextChar = i + 2 < lineText.length ? lineText[i + 2] : '';

            // Handle string detection
            if (!inString) {
                // Check for raw string start
                if (char === '"' && nextChar === '"' && nextNextChar === '"') {
                    inString = true;
                    stringType = 'raw';
                    // Count the quotes
                    rawQuoteCount = 3;
                    let j = i + 3;
                    while (j < lineText.length && lineText[j] === '"') {
                        rawQuoteCount++;
                        j++;
                    }
                    i = j - 1;
                }
                // Check for verbatim string
                else if (char === '@' && nextChar === '"') {
                    inString = true;
                    stringType = 'verbatim';
                    i++;
                }
                // Check for regular string
                else if (char === '"') {
                    inString = true;
                    stringType = 'regular';
                }
                // Track parentheses when not in string
                else if (char === '(') {
                    openParens++;
                }
                else if (char === ')') {
                    closeParens++;

                    // Check if we've closed all parentheses
                    if (closeParens > 0 && openParens > 0 && closeParens === openParens) {
                        // Found the end of the call
                        callEndLine = lineNum;
                        callEndChar = i + 1;

                        // Check if there's a semicolon on this line
                        const remainingLine = lineText.substring(i + 1);
                        const semiIndex = remainingLine.indexOf(';');
                        if (semiIndex !== -1) {
                            callEndChar = i + 1 + semiIndex + 1;
                        }

                        return new vscode.Range(
                            new vscode.Position(callStartLine, callStartChar),
                            new vscode.Position(callEndLine, callEndChar)
                        );
                    }
                }
            } else {
                // We're in a string, look for the end
                if (stringType === 'raw') {
                    // Look for closing quotes (same count as opening)
                    if (char === '"') {
                        let quoteCount = 1;
                        let j = i + 1;
                        while (j < lineText.length && lineText[j] === '"') {
                            quoteCount++;
                            j++;
                        }
                        if (quoteCount >= rawQuoteCount) {
                            inString = false;
                            stringType = null;
                            i = j - 1;
                        }
                    }
                } else if (stringType === 'verbatim') {
                    // Look for closing quote, handling "" as escaped quote
                    if (char === '"') {
                        if (nextChar === '"') {
                            // Escaped quote, skip it
                            i++;
                        } else {
                            // End of string
                            inString = false;
                            stringType = null;
                        }
                    }
                } else if (stringType === 'regular') {
                    // Handle escape sequences
                    if (char === '\\') {
                        i++; // Skip next character
                    } else if (char === '"') {
                        // End of string
                        inString = false;
                        stringType = null;
                    }
                }
            }

            i++;
        }
    }

    // If we didn't find a proper end, return up to the last line we processed
    return new vscode.Range(
        new vscode.Position(callStartLine, callStartChar),
        new vscode.Position(callEndLine, document.lineAt(callEndLine).text.length)
    );
}