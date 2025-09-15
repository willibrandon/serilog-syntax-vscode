// Test string tokenization in expressions
import { ExpressionTokenizer, TokenType } from '../parsers/expressionTokenizer';

const testCases = [
    {
        name: "String in comparison",
        input: "Level = 'Warning'",
        expected: [
            { type: TokenType.Identifier, value: "Level" },
            { type: TokenType.ComparisonOperator, value: "=" },
            { type: TokenType.StringLiteral, value: "'Warning'" }
        ]
    },
    {
        name: "String in array access",
        input: "@p['RequestId']",
        expected: [
            { type: TokenType.BuiltInProperty, value: "@p" },
            { type: TokenType.Punctuation, value: "[" },
            { type: TokenType.StringLiteral, value: "'RequestId'" },
            { type: TokenType.Punctuation, value: "]" }
        ]
    },
    {
        name: "Literal text between directives",
        input: "{#if IsError}[ERROR]{#else if Level = 'Warning'}[WARN]{#else}[INFO]{#end}",
        expectedStrings: ["'Warning'"],  // Only 'Warning' should be a string token
        unexpectedTokens: ["[ERROR]", "[WARN]", "[INFO]"]  // These should NOT be tokenized
    }
];

console.log('=== String Tokenization Test ===\n');

let failures = 0;

for (const testCase of testCases) {
    const tokenizer = new ExpressionTokenizer(testCase.input);
    const tokens = tokenizer.tokenize();

    console.log(`Test: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);

    if (testCase.expected) {
        // Check exact token sequence
        let passed = true;
        for (let i = 0; i < testCase.expected.length; i++) {
            const expected = testCase.expected[i];
            const actual = tokens[i];

            if (!actual || actual.type !== expected.type || actual.value !== expected.value) {
                console.log(`❌ Token ${i}: Expected ${expected.type}='${expected.value}', got ${actual?.type}='${actual?.value}'`);
                passed = false;
                failures++;
            }
        }
        if (passed) {
            console.log(`✅ All tokens match`);
        }
    }

    if (testCase.expectedStrings) {
        // Check that certain strings are tokenized
        const stringTokens = tokens.filter(t => t.type === TokenType.StringLiteral).map(t => t.value);
        for (const expected of testCase.expectedStrings) {
            if (stringTokens.includes(expected)) {
                console.log(`✅ Found string token: ${expected}`);
            } else {
                console.log(`❌ Missing string token: ${expected}`);
                console.log(`   Found strings: ${stringTokens.join(', ')}`);
                failures++;
            }
        }
    }

    if (testCase.unexpectedTokens) {
        // Check that certain text is NOT tokenized
        const allTokenValues = tokens.map(t => t.value);
        for (const unexpected of testCase.unexpectedTokens) {
            if (allTokenValues.includes(unexpected)) {
                console.log(`❌ Should NOT tokenize: ${unexpected}`);
                failures++;
            } else {
                console.log(`✅ Correctly not tokenized: ${unexpected}`);
            }
        }
    }

    console.log(`Actual tokens: ${tokens.map(t => `${t.type}='${t.value}'`).join(', ')}\n`);
}

console.log('=== SUMMARY ===');
if (failures > 0) {
    throw new Error(`FAILURE: ${failures} string tokenization tests failed!`);
} else {
    console.log('✅ All string tokenization tests passed!');
}