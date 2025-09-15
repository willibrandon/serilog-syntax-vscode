/**
 * Integration test that simulates the actual extension behavior
 * to demonstrate the multi-line string bug
 */

import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

// Mock VS Code TextDocument
class MockTextDocument {
    private lines: string[];
    public lineCount: number;

    constructor(text: string) {
        this.lines = text.split('\n');
        this.lineCount = this.lines.length;
    }

    lineAt(lineNumber: number) {
        return {
            text: this.lines[lineNumber],
            range: {
                start: { line: lineNumber, character: 0 },
                end: { line: lineNumber, character: this.lines[lineNumber].length }
            }
        };
    }

    getText(range?: any): string {
        if (!range) return this.lines.join('\n');

        // For single line range
        if (range.start.line === range.end.line) {
            return this.lines[range.start.line];
        }

        // For multi-line range
        const startLine = range.start.line;
        const endLine = range.end.line;
        return this.lines.slice(startLine, endLine + 1).join('\n');
    }

    offsetAt(position: any): number {
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            offset += this.lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
    }

    positionAt(offset: number): any {
        let currentOffset = 0;
        for (let line = 0; line < this.lines.length; line++) {
            const lineLength = this.lines[line].length + 1; // +1 for newline
            if (currentOffset + lineLength > offset) {
                return {
                    line: line,
                    character: offset - currentOffset
                };
            }
            currentOffset += lineLength;
        }
        return { line: this.lines.length - 1, character: 0 };
    }
}

class ExtensionIntegrationTest {
    private stringParser = new StringLiteralParser();

    /**
     * This simulates exactly what the extension does in updateDecorations()
     */
    private findPropertiesLikeExtension(document: MockTextDocument): string[] {
        const allProperties: string[] = [];

        // This is exactly what extension.ts does
        const serilogRanges = findSerilogRanges(document as any);

        for (const range of serilogRanges) {
            const lineText = document.getText(range);
            const lineStartOffset = document.offsetAt(range.start);

            // Find string literals in the line using proper parser
            const stringLiterals = this.stringParser.findAllStringLiterals(lineText);

            for (const literal of stringLiterals) {
                // Skip interpolated strings - Serilog doesn't use them
                if (literal.type === 'interpolated') {
                    continue;
                }

                const templateContent = literal.content;

                // Parse the template
                const properties = parseTemplate(templateContent);
                allProperties.push(...properties.map(p => p.name));
            }
        }

        return allProperties;
    }

    testVerbatimStringMultiLine_Fails() {
        console.log('\n=== Testing Verbatim String (Multi-line) ===');

        const code = `        var filePath = @"C:\\Users\\alice\\Documents";
        logger.LogInformation(@"Processing files in path: {FilePath}
Multiple lines are supported in verbatim strings
With properties like {UserId} and {@Order}
Even with ""escaped quotes"" in the template",
            filePath, userId, order);`;

        const document = new MockTextDocument(code);
        const foundProperties = this.findPropertiesLikeExtension(document);

        console.log('Expected properties: FilePath, UserId, Order');
        console.log('Found properties:', foundProperties);

        if (foundProperties.length !== 3) {
            console.error(`✗ FAIL: Expected 3 properties, found ${foundProperties.length}`);
            return false;
        }

        console.log('✓ PASS');
        return true;
    }

    testRawStringMultiLine_Fails() {
        console.log('\n=== Testing Raw String (Multi-line) ===');

        const code = `        var recordId = "REC-2024";
        var status = "Processing";
        logger.LogInformation("""
            Raw String Report:
            Record: {RecordId} | Status: {Status,-12}
            User: {UserName} (ID: {UserId})
            Order: {@Order}
            Timestamp: {Timestamp:yyyy-MM-dd HH:mm:ss}
            """, recordId, status, userName, userId, order, timestamp);`;

        const document = new MockTextDocument(code);
        const foundProperties = this.findPropertiesLikeExtension(document);

        console.log('Expected properties: RecordId, Status, UserName, UserId, Order, Timestamp');
        console.log('Found properties:', foundProperties);

        if (foundProperties.length !== 6) {
            console.error(`✗ FAIL: Expected 6 properties, found ${foundProperties.length}`);
            return false;
        }

        console.log('✓ PASS');
        return true;
    }

    testSingleLineString_Passes() {
        console.log('\n=== Testing Single Line String (Should Work) ===');

        const code = `logger.LogInformation("User {UserId} logged in with {@Order}", userId, order);`;

        const document = new MockTextDocument(code);
        const foundProperties = this.findPropertiesLikeExtension(document);

        console.log('Expected properties: UserId, Order');
        console.log('Found properties:', foundProperties);

        if (foundProperties.length !== 2) {
            console.error(`✗ FAIL: Expected 2 properties, found ${foundProperties.length}`);
            return false;
        }

        console.log('✓ PASS');
        return true;
    }

    testNewExpressionTemplate_Fails() {
        console.log('\n=== Testing new ExpressionTemplate (Multi-line) ===');

        const code = `        var template = new ExpressionTemplate(
            @"[{@t:HH:mm:ss} {@l:u3}] {#if SourceContext is not null}[{SourceContext}] {#end}" +
            @"{@m}" +
            @"{#if @x is not null}{NewLine}  {@x}{#end}" +
            @"{NewLine}");`;

        const document = new MockTextDocument(code);
        const foundProperties = this.findPropertiesLikeExtension(document);

        console.log('Expected properties: Should find some properties/directives');
        console.log('Found properties:', foundProperties);

        if (foundProperties.length === 0) {
            console.error(`✗ FAIL: Expected to find properties, found none`);
            return false;
        }

        console.log('✓ PASS');
        return true;
    }

    runAll() {
        console.log('=====================================');
        console.log('Extension Integration Tests');
        console.log('Testing actual extension behavior');
        console.log('=====================================');

        let passed = 0;
        let failed = 0;

        // This should pass
        if (this.testSingleLineString_Passes()) passed++; else failed++;

        // These should fail, demonstrating the bug
        if (this.testVerbatimStringMultiLine_Fails()) passed++; else failed++;
        if (this.testRawStringMultiLine_Fails()) passed++; else failed++;
        if (this.testNewExpressionTemplate_Fails()) passed++; else failed++;

        console.log('\n=====================================');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        if (failed > 0) {
            console.log('\nThe failures above demonstrate the multi-line bug!');
            console.log('Only single-line Serilog calls are properly highlighted.');
        }
        console.log('=====================================');

        // Exit with error code if tests failed
        if (failed > 0) {
            process.exit(1);
        }
    }
}

// Run the tests
const test = new ExtensionIntegrationTest();
test.runAll();