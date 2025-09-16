import { StringLiteralParser } from '../utils/stringLiteralParser';

/**
 * Comprehensive tests for StringLiteralParser
 * Based on serilog-syntax test patterns
 */
class StringLiteralParserTests {
    private parser = new StringLiteralParser();

    // Helper to run a test
    private runTest(description: string, test: () => void) {
        try {
            test();
            console.log(`✓ ${description}`);
        } catch (error: any) {
            console.error(`✗ ${description}: ${error.message}`);
            throw error;
        }
    }

    // Helper assertions
    private assertEqual<T>(actual: T, expected: T, message?: string) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    private assertNotNull<T>(value: T | null | undefined, message?: string): asserts value is T {
        if (value === null || value === undefined) {
            throw new Error(message || 'Expected non-null value');
        }
    }

    private assertNull(value: any, message?: string) {
        if (value !== null) {
            throw new Error(message || `Expected null, got ${value}`);
        }
    }

    // ========== REGULAR STRING TESTS ==========

    testRegularString_Simple() {
        this.runTest('Regular string - simple', () => {
            const text = 'logger.LogInformation("User {UserId} logged in");';
            const result = this.parser.tryParseStringLiteral(text, 22); // Position of opening "

            this.assertNotNull(result);
            this.assertEqual(result.type, 'regular');
            this.assertEqual(result.start, 22);
            this.assertEqual(result.end, 46); // Position of closing "
            this.assertEqual(result.content, 'User {UserId} logged in');
        });
    }

    testRegularString_WithEscapedQuotes() {
        this.runTest('Regular string - escaped quotes', () => {
            const text = '"Say \\"Hello\\" to {Name}"';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'regular');
            this.assertEqual(result.content, 'Say \\"Hello\\" to {Name}');
        });
    }

    testRegularString_WithEscapedBackslash() {
        this.runTest('Regular string - escaped backslash', () => {
            const text = '"Path: C:\\\\Users\\\\{Username}"';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.content, 'Path: C:\\\\Users\\\\{Username}');
        });
    }

    testRegularString_Incomplete() {
        this.runTest('Regular string - incomplete', () => {
            const text = '"Incomplete string with {Property}';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'regular');
            this.assertEqual(result.content, 'Incomplete string with {Property}');
        });
    }

    // ========== VERBATIM STRING TESTS ==========

    testVerbatimString_Simple() {
        this.runTest('Verbatim string - simple', () => {
            const text = 'logger.LogInformation(@"User {UserId} logged in");';
            const result = this.parser.tryParseStringLiteral(text, 22); // Position of @

            this.assertNotNull(result);
            this.assertEqual(result.type, 'verbatim');
            this.assertEqual(result.start, 22);
            this.assertEqual(result.end, 47); // Position of closing "
            this.assertEqual(result.content, 'User {UserId} logged in');
        });
    }

    testVerbatimString_WithDoubleQuotes() {
        this.runTest('Verbatim string - double quotes', () => {
            const text = '@"Say ""Hello"" to {Name}"';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'verbatim');
            this.assertEqual(result.content, 'Say ""Hello"" to {Name}'); // Keep "" as-is
        });
    }

    testVerbatimString_Multiline() {
        this.runTest('Verbatim string - multiline', () => {
            const text = '@"Line 1 {Prop1}\nLine 2 {Prop2}"';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'verbatim');
            this.assertEqual(result.content, 'Line 1 {Prop1}\nLine 2 {Prop2}');
        });
    }

    testVerbatimString_Incomplete() {
        this.runTest('Verbatim string - incomplete', () => {
            const text = '@"Incomplete verbatim with {Property}';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'verbatim');
            this.assertEqual(result.content, 'Incomplete verbatim with {Property}');
        });
    }

    // ========== RAW STRING TESTS ==========

    testRawString_Simple() {
        this.runTest('Raw string - simple', () => {
            const text = 'logger.LogInformation("""User {UserId} logged in""");';
            const result = this.parser.tryParseStringLiteral(text, 22); // Position of first "

            this.assertNotNull(result);
            this.assertEqual(result.type, 'raw');
            this.assertEqual(result.start, 22);
            this.assertEqual(result.end, 50); // Position of last " in closing """
            this.assertEqual(result.content, 'User {UserId} logged in');
        });
    }

    testRawString_WithQuotes() {
        this.runTest('Raw string - with quotes', () => {
            const text = '"""Say "Hello" to {Name}"""';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'raw');
            this.assertEqual(result.content, 'Say "Hello" to {Name}');
        });
    }

    testRawString_Multiline() {
        this.runTest('Raw string - multiline', () => {
            const text = '"""\nLine 1 {Prop1}\nLine 2 {Prop2}\n"""';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'raw');
            this.assertEqual(result.content, '\nLine 1 {Prop1}\nLine 2 {Prop2}\n');
        });
    }

    testRawString_FourQuotes() {
        this.runTest('Raw string - four quotes delimiter', () => {
            const text = '""""Content with """ inside""""';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'raw');
            this.assertEqual(result.content, 'Content with """ inside');
        });
    }

    testRawString_Incomplete() {
        this.runTest('Raw string - incomplete', () => {
            const text = '"""Incomplete raw string with {Property}';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'raw');
            this.assertEqual(result.content, 'Incomplete raw string with {Property}');
        });
    }

    // ========== INTERPOLATED STRING TESTS ==========

    testInterpolatedString_ShouldBeDetected() {
        this.runTest('Interpolated string - detected but marked', () => {
            const text = '$"User {userId} logged in"';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'interpolated');
            // Interpolated strings should not be processed for Serilog templates
        });
    }

    // ========== EDGE CASES ==========

    testNotAString() {
        this.runTest('Not a string', () => {
            const text = 'var x = 42;';
            const result = this.parser.tryParseStringLiteral(text, 8); // Position of 4

            this.assertNull(result);
        });
    }

    testSingleQuote_NotAString() {
        this.runTest('Single quote - not a C# string', () => {
            const text = "'This is not a C# string'";
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNull(result);
        });
    }

    testEmptyString() {
        this.runTest('Empty string', () => {
            const text = '""';
            const result = this.parser.tryParseStringLiteral(text, 0);

            this.assertNotNull(result);
            this.assertEqual(result.type, 'regular');
            this.assertEqual(result.content, '');
        });
    }

    // ========== FIND ALL STRINGS TESTS ==========

    testFindAllStrings_Mixed() {
        this.runTest('Find all strings - mixed types', () => {
            const text = 'var a = "regular"; var b = @"verbatim"; var c = """raw""";';
            const results = this.parser.findAllStringLiterals(text);

            this.assertEqual(results.length, 3);
            this.assertEqual(results[0].type, 'regular');
            this.assertEqual(results[0].content, 'regular');
            this.assertEqual(results[1].type, 'verbatim');
            this.assertEqual(results[1].content, 'verbatim');
            this.assertEqual(results[2].type, 'raw');
            this.assertEqual(results[2].content, 'raw');
        });
    }

    testFindAllStrings_InSerilogCall() {
        this.runTest('Find all strings - in Serilog call', () => {
            const text = 'logger.LogInformation("User {UserId} logged in", userId);';
            const results = this.parser.findAllStringLiterals(text);

            this.assertEqual(results.length, 1);
            this.assertEqual(results[0].content, 'User {UserId} logged in');
            this.assertEqual(results[0].start, 22);
            this.assertEqual(results[0].end, 46);
        });
    }

    testFindAllStrings_Concatenated() {
        this.runTest('Find all strings - concatenated', () => {
            const text = 'var msg = "Part 1 {Prop1}" + "Part 2 {Prop2}";';
            const results = this.parser.findAllStringLiterals(text);

            this.assertEqual(results.length, 2);
            this.assertEqual(results[0].content, 'Part 1 {Prop1}');
            this.assertEqual(results[1].content, 'Part 2 {Prop2}');
        });
    }

    // ========== POSITION ACCURACY TESTS ==========

    testPositionAccuracy_RegularString() {
        this.runTest('Position accuracy - regular string', () => {
            const text = '    "String at position 4"    ';
            const result = this.parser.tryParseStringLiteral(text, 4);

            this.assertNotNull(result);
            this.assertEqual(result.start, 4);
            this.assertEqual(result.end, 25);
            this.assertEqual(result.contentStart, 5);
            this.assertEqual(result.contentEnd, 25);
            this.assertEqual(text.substring(result.contentStart, result.contentEnd), 'String at position 4');
        });
    }

    testPositionAccuracy_VerbatimString() {
        this.runTest('Position accuracy - verbatim string', () => {
            const text = '    @"Verbatim at 4"    ';
            const result = this.parser.tryParseStringLiteral(text, 4);

            this.assertNotNull(result);
            this.assertEqual(result.start, 4);
            this.assertEqual(result.end, 19);
            this.assertEqual(result.contentStart, 6);
            this.assertEqual(result.contentEnd, 19);
            this.assertEqual(text.substring(result.contentStart, result.contentEnd), 'Verbatim at 4');
        });
    }

    testPositionAccuracy_RawString() {
        this.runTest('Position accuracy - raw string', () => {
            const text = '    """Raw at 4"""    ';
            const result = this.parser.tryParseStringLiteral(text, 4);

            this.assertNotNull(result);
            this.assertEqual(result.start, 4);
            this.assertEqual(result.end, 17);
            this.assertEqual(result.contentStart, 7);
            this.assertEqual(result.contentEnd, 15);
            this.assertEqual(text.substring(result.contentStart, result.contentEnd), 'Raw at 4');
        });
    }

    // Run all tests
    runAllTests() {
        console.log('Running String Literal Parser Tests...\n');

        // Regular strings
        this.testRegularString_Simple();
        this.testRegularString_WithEscapedQuotes();
        this.testRegularString_WithEscapedBackslash();
        this.testRegularString_Incomplete();

        // Verbatim strings
        this.testVerbatimString_Simple();
        this.testVerbatimString_WithDoubleQuotes();
        this.testVerbatimString_Multiline();
        this.testVerbatimString_Incomplete();

        // Raw strings
        this.testRawString_Simple();
        this.testRawString_WithQuotes();
        this.testRawString_Multiline();
        this.testRawString_FourQuotes();
        this.testRawString_Incomplete();

        // Interpolated strings
        this.testInterpolatedString_ShouldBeDetected();

        // Edge cases
        this.testNotAString();
        this.testSingleQuote_NotAString();
        this.testEmptyString();

        // Find all strings
        this.testFindAllStrings_Mixed();
        this.testFindAllStrings_InSerilogCall();
        this.testFindAllStrings_Concatenated();

        // Position accuracy
        this.testPositionAccuracy_RegularString();
        this.testPositionAccuracy_VerbatimString();
        this.testPositionAccuracy_RawString();

        console.log('\nAll string literal parser tests passed! ✓');
    }
}

// Run tests
const tester = new StringLiteralParserTests();
tester.runAllTests();