/**
 * Test for the multi-line Serilog detector
 */

// Standalone types that mimic VS Code types for testing
interface Position {
    line: number;
    character: number;
}

interface Range {
    start: Position;
    end: Position;
}

interface TextLine {
    text: string;
    range: Range;
}

interface TextDocument {
    lineCount: number;
    lineAt(line: number): TextLine;
}

// Copy of the detector code without VS Code dependency
function isSerilogCall(line: string): boolean {
    const patterns = [
        /\b(Log|logger|_logger)\.(Information|Debug|Warning|Error|Fatal|Verbose)/,
        /\b(Log|logger|_logger)\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)/,
        /\.WriteTo\.\w+\([^)]*outputTemplate:/,
        /new\s+ExpressionTemplate\s*\(/
    ];

    return patterns.some(pattern => pattern.test(line));
}

function findSerilogRanges(document: TextDocument): Range[] {
    const ranges: Range[] = [];
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

function findFullCallRange(document: TextDocument, startLine: number): Range {
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

                        return {
                            start: { line: callStartLine, character: callStartChar },
                            end: { line: callEndLine, character: callEndChar }
                        };
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
    return {
        start: { line: callStartLine, character: callStartChar },
        end: { line: callEndLine, character: document.lineAt(callEndLine).text.length }
    };
}

// Mock document for testing
class MockDocument implements TextDocument {
    private lines: string[];
    public lineCount: number;

    constructor(text: string) {
        this.lines = text.split('\n');
        this.lineCount = this.lines.length;
    }

    lineAt(lineNumber: number): TextLine {
        return {
            text: this.lines[lineNumber],
            range: {
                start: { line: lineNumber, character: 0 },
                end: { line: lineNumber, character: this.lines[lineNumber].length }
            }
        };
    }
}

// Test class
class SerilogDetectorTest {
    testVerbatimMultiLine() {
        console.log('\n=== Testing Verbatim Multi-line Detection ===');

        const code = `        var filePath = @"C:\\Users\\alice\\Documents";
        logger.LogInformation(@"Processing files in path: {FilePath}
Multiple lines are supported in verbatim strings
With properties like {UserId} and {@Order}
Even with ""escaped quotes"" in the template",
            filePath, userId, order);`;

        const doc = new MockDocument(code);
        const ranges = findSerilogRanges(doc);

        console.log(`Found ${ranges.length} range(s)`);
        for (const range of ranges) {
            console.log(`  Range: Line ${range.start.line}:${range.start.character} to Line ${range.end.line}:${range.end.character}`);

            // The range should span from line 1 (LogInformation) to line 5 (closing paren)
            if (range.start.line === 1 && range.end.line === 5) {
                console.log('✓ PASS: Range correctly spans all lines of the multi-line call');
                return true;
            }
        }

        console.error('✗ FAIL: Range does not span the correct lines');
        return false;
    }

    testRawStringMultiLine() {
        console.log('\n=== Testing Raw String Multi-line Detection ===');

        const code = `        var recordId = "REC-2024";
        var status = "Processing";
        logger.LogInformation("""
            Raw String Report:
            Record: {RecordId} | Status: {Status,-12}
            User: {UserName} (ID: {UserId})
            Order: {@Order}
            Timestamp: {Timestamp:yyyy-MM-dd HH:mm:ss}
            """, recordId, status, userName, userId, order, timestamp);`;

        const doc = new MockDocument(code);
        const ranges = findSerilogRanges(doc);

        console.log(`Found ${ranges.length} range(s)`);
        for (const range of ranges) {
            console.log(`  Range: Line ${range.start.line}:${range.start.character} to Line ${range.end.line}:${range.end.character}`);

            // The range should span from line 2 (LogInformation) to line 8 (closing paren)
            if (range.start.line === 2 && range.end.line === 8) {
                console.log('✓ PASS: Range correctly spans all lines of the raw string call');
                return true;
            }
        }

        console.error('✗ FAIL: Range does not span the correct lines');
        return false;
    }

    testExpressionTemplateMultiLine() {
        console.log('\n=== Testing ExpressionTemplate Multi-line Detection ===');

        const code = `        var template = new ExpressionTemplate(
            @"[{@t:HH:mm:ss} {@l:u3}] {#if SourceContext is not null}[{SourceContext}] {#end}" +
            @"{@m}" +
            @"{#if @x is not null}{NewLine}  {@x}{#end}" +
            @"{NewLine}");`;

        const doc = new MockDocument(code);
        const ranges = findSerilogRanges(doc);

        console.log(`Found ${ranges.length} range(s)`);
        for (const range of ranges) {
            console.log(`  Range: Line ${range.start.line}:${range.start.character} to Line ${range.end.line}:${range.end.character}`);

            // The range should span from line 0 to line 4
            if (range.start.line === 0 && range.end.line === 4) {
                console.log('✓ PASS: Range correctly spans all lines of the ExpressionTemplate');
                return true;
            }
        }

        console.error('✗ FAIL: Range does not span the correct lines');
        return false;
    }

    runAll() {
        console.log('=====================================');
        console.log('Serilog Detector Multi-line Tests');
        console.log('=====================================');

        let passed = 0;
        let failed = 0;

        if (this.testVerbatimMultiLine()) passed++; else failed++;
        if (this.testRawStringMultiLine()) passed++; else failed++;
        if (this.testExpressionTemplateMultiLine()) passed++; else failed++;

        console.log('\n=====================================');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log('=====================================');

        if (failed > 0) {
            process.exit(1);
        }
    }
}

// Run the tests
const test = new SerilogDetectorTest();
test.runAll();