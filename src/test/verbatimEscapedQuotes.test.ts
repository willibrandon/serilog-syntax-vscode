/**
 * Test for verbatim strings with escaped quotes bug
 */

// Mock types
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

// Mock document
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

// Import the string parser to test
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

class VerbatimEscapedQuotesTest {
    private parser = new StringLiteralParser();

    testVerbatimWithManyEscapedQuotes() {
        console.log('\n=== Testing Verbatim String with Many Escaped Quotes ===');

        // The problematic code
        const code = `logger.LogInformation(@"XML: <user name=""{UserName}"" id=""{UserId}"" />", userName, userId);`;

        console.log('Code:', code);

        // Find all string literals
        const literals = this.parser.findAllStringLiterals(code);
        console.log(`Found ${literals.length} string literal(s)`);

        if (literals.length === 0) {
            console.error('✗ FAIL: No string literals found!');
            return false;
        }

        const literal = literals[0];
        console.log(`Literal type: ${literal.type}`);
        console.log(`Literal content: "${literal.content}"`);
        console.log(`Start: ${literal.start}, End: ${literal.end}`);
        console.log(`Content positions: ${literal.contentStart} to ${literal.contentEnd}`);

        // Parse the template to find properties
        const properties = parseTemplate(literal.content);
        console.log(`Found ${properties.length} properties:`, properties.map(p => p.name));

        // We should find UserName and UserId
        if (properties.length !== 2) {
            console.error(`✗ FAIL: Expected 2 properties, found ${properties.length}`);
            return false;
        }

        if (properties[0].name !== 'UserName' || properties[1].name !== 'UserId') {
            console.error(`✗ FAIL: Expected UserName and UserId, got ${properties[0].name} and ${properties[1].name}`);
            return false;
        }

        // Check the actual string extraction
        const expectedContent = 'XML: <user name=""{UserName}"" id=""{UserId}"" />';
        if (literal.content !== expectedContent) {
            console.error(`✗ FAIL: Content mismatch`);
            console.error(`  Expected: "${expectedContent}"`);
            console.error(`  Got:      "${literal.content}"`);
            return false;
        }

        console.log('✓ PASS: Verbatim string with escaped quotes parsed correctly');
        return true;
    }

    testSimpleVerbatimString() {
        console.log('\n=== Testing Simple Verbatim String ===');

        const code = `logger.LogInformation(@"User {UserName} logged in", userName);`;

        const literals = this.parser.findAllStringLiterals(code);
        if (literals.length !== 1) {
            console.error(`✗ FAIL: Expected 1 literal, found ${literals.length}`);
            return false;
        }

        const literal = literals[0];
        const properties = parseTemplate(literal.content);

        if (properties.length !== 1 || properties[0].name !== 'UserName') {
            console.error(`✗ FAIL: Expected UserName property`);
            return false;
        }

        console.log('✓ PASS: Simple verbatim string works');
        return true;
    }

    testPositionAccuracy() {
        console.log('\n=== Testing Position Accuracy ===');

        const code = `        logger.LogInformation(@"XML: <user name=""{UserName}"" id=""{UserId}"" />", userName, userId);`;
        //                                  ^30                            ^49               ^65        ^79 ^81
        // The @" starts at position 30
        // {UserName} is at positions 49-58 (after "")
        // {UserId} is at positions 65-72 (after "")
        // The closing " is at position 81 (after all the "")

        const literals = this.parser.findAllStringLiterals(code);
        if (literals.length === 0) {
            console.error('✗ FAIL: No literals found');
            return false;
        }

        const literal = literals[0];
        console.log(`String starts at: ${literal.start} (expected: 30)`);
        console.log(`String ends at: ${literal.end} (expected: 81)`);
        console.log(`Content starts at: ${literal.contentStart} (expected: 32)`);
        console.log(`Content ends at: ${literal.contentEnd} (expected: 81)`);

        // Check positions
        if (literal.start !== 30) {
            console.error(`✗ FAIL: Start position wrong. Expected 30, got ${literal.start}`);
            return false;
        }

        if (literal.end !== 81) {
            console.error(`✗ FAIL: End position wrong. Expected 81, got ${literal.end}`);
            return false;
        }

        console.log('✓ PASS: Positions are accurate');
        return true;
    }

    runAll() {
        console.log('=====================================');
        console.log('Verbatim Escaped Quotes Tests');
        console.log('=====================================');

        let passed = 0;
        let failed = 0;

        if (this.testSimpleVerbatimString()) passed++; else failed++;
        if (this.testVerbatimWithManyEscapedQuotes()) passed++; else failed++;
        if (this.testPositionAccuracy()) passed++; else failed++;

        console.log('\n=====================================');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log('=====================================');

        if (failed > 0) {
            process.exit(1);
        }
    }
}

// Run tests
const test = new VerbatimEscapedQuotesTest();
test.runAll();