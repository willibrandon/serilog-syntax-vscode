// Test that verifies expression template highlighting matches expected behavior
import * as fs from 'fs';
import * as path from 'path';
import { ExpressionParser } from '../parsers/expressionParser';
import { ExpressionTokenizer } from '../parsers/expressionTokenizer';

// Test cases from ExampleService.cs lines 343-352
const testCases = [
    {
        name: 'Console ExpressionTemplate',
        template: "[{@t:HH:mm:ss} {@l:u3}] {#if SourceContext is not null}[{Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)}]{#end} {@m}\n{@x}",
        expectedHighlights: [
            // "[" - plain text (not highlighted)
            { text: '{@t', type: 'builtin' },
            { text: ':HH:mm:ss', type: 'format' },
            { text: '}', type: 'brace' },
            // " " - plain text
            { text: '{@l', type: 'builtin' },
            { text: ':u3', type: 'format' },
            { text: '}', type: 'brace' },
            // "] " - plain text
            { text: '{', type: 'brace' },
            { text: '#if', type: 'directive' },
            { text: 'SourceContext', type: 'identifier' },
            { text: 'is not null', type: 'operator' },
            { text: '}', type: 'brace' },
            // "[" - plain text
            { text: '{', type: 'brace' },
            { text: 'Substring', type: 'function' },
            { text: '(', type: 'punctuation' },
            { text: 'SourceContext', type: 'identifier' },
            { text: ',', type: 'punctuation' },
            { text: 'LastIndexOf', type: 'function' },
            { text: '(', type: 'punctuation' },
            { text: 'SourceContext', type: 'identifier' },
            { text: ',', type: 'punctuation' },
            { text: "'.'", type: 'string' },
            { text: ')', type: 'punctuation' },
            { text: '+', type: 'operator' },
            { text: '1', type: 'number' },
            { text: ')', type: 'punctuation' },
            { text: '}', type: 'brace' },
            // "]" - plain text
            { text: '{', type: 'brace' },
            { text: '#end', type: 'directive' },
            { text: '}', type: 'brace' },
            // " " - plain text
            { text: '{@m', type: 'builtin' },
            { text: '}', type: 'brace' },
            // "\n" - plain text
            { text: '{@x', type: 'builtin' },
            { text: '}', type: 'brace' }
        ]
    },
    {
        name: 'File ExpressionTemplate with conditionals',
        template: "{#if IsError}[ERROR]{#else if Level = 'Warning'}[WARN]{#else}[INFO]{#end}",
        expectedHighlights: [
            { text: '{', type: 'brace' },
            { text: '#if', type: 'directive' },
            { text: 'IsError', type: 'identifier' },
            { text: '}', type: 'brace' },
            // "[ERROR]" - plain text (NOT highlighted)
            { text: '{', type: 'brace' },
            { text: '#else', type: 'directive' },
            { text: 'if', type: 'operator' },
            { text: 'Level', type: 'identifier' },
            { text: '=', type: 'operator' },
            { text: "'Warning'", type: 'string' },
            { text: '}', type: 'brace' },
            // "[WARN]" - plain text (NOT highlighted)
            { text: '{', type: 'brace' },
            { text: '#else', type: 'directive' },
            { text: '}', type: 'brace' },
            // "[INFO]" - plain text (NOT highlighted)
            { text: '{', type: 'brace' },
            { text: '#end', type: 'directive' },
            { text: '}', type: 'brace' }
        ]
    },
    {
        name: 'Property access expression',
        template: "{#if @p['RequestId'] is not null}[{@p['RequestId']}] {#end}",
        expectedHighlights: [
            { text: '{', type: 'brace' },
            { text: '#if', type: 'directive' },
            { text: '@p', type: 'builtin' },
            { text: '[', type: 'punctuation' },
            { text: "'RequestId'", type: 'string' },
            { text: ']', type: 'punctuation' },
            { text: 'is not null', type: 'operator' },
            { text: '}', type: 'brace' },
            // "[" - plain text
            { text: '{@p', type: 'builtin' },
            { text: '[', type: 'punctuation' },
            { text: "'RequestId'", type: 'string' },
            { text: ']', type: 'punctuation' },
            { text: '}', type: 'brace' },
            // "] " - plain text
            { text: '{', type: 'brace' },
            { text: '#end', type: 'directive' },
            { text: '}', type: 'brace' }
        ]
    },
    {
        name: 'Each loop expression',
        template: "{#each name, value in @p} | {name}={value}{#end}",
        expectedHighlights: [
            { text: '{', type: 'brace' },
            { text: '#each', type: 'directive' },
            { text: 'name', type: 'identifier' },
            { text: ',', type: 'punctuation' },
            { text: 'value', type: 'identifier' },
            { text: 'in', type: 'operator' },
            { text: '@p', type: 'builtin' },
            { text: '}', type: 'brace' },
            // " | " - plain text
            { text: '{', type: 'brace' },
            { text: 'name', type: 'identifier' },
            { text: '}', type: 'brace' },
            // "=" - plain text
            { text: '{', type: 'brace' },
            { text: 'value', type: 'identifier' },
            { text: '}', type: 'brace' },
            { text: '{', type: 'brace' },
            { text: '#end', type: 'directive' },
            { text: '}', type: 'brace' }
        ]
    }
];

console.log('\n=== Expression Template Highlighting Test ===\n');

let totalFailures = 0;

for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Template: "${testCase.template}"`);

    const parser = new ExpressionParser(testCase.template);
    const elements = parser.parse();

    // Check if we're getting the expected elements
    const expectedTypes = new Set(testCase.expectedHighlights.map(h => h.type));
    const actualTypes = new Set(elements.map(e => e.classificationType));

    // Find what's missing
    const missingTypes = [...expectedTypes].filter(t => !actualTypes.has(t));
    const unexpectedTypes = [...actualTypes].filter(t => !expectedTypes.has(t));

    if (missingTypes.length > 0) {
        console.log(`  ❌ Missing highlight types: ${missingTypes.join(', ')}`);
        totalFailures++;
    }

    if (unexpectedTypes.length > 0) {
        console.log(`  ❌ Unexpected highlight types: ${unexpectedTypes.join(', ')}`);
        totalFailures++;
    }

    // Check for plain text that should NOT be highlighted
    const plainTextSegments = [
        '[ERROR]', '[WARN]', '[INFO]', // Literal text in conditionals
    ];

    for (const text of plainTextSegments) {
        if (testCase.template.includes(text)) {
            // Check if this text is being incorrectly tokenized
            const textIndex = testCase.template.indexOf(text);
            const hasHighlightInRange = elements.some(e =>
                e.startIndex <= textIndex && e.endIndex > textIndex
            );

            if (hasHighlightInRange) {
                console.log(`  ❌ Plain text "${text}" is incorrectly highlighted`);
                totalFailures++;
            }
        }
    }

    // Special check for literal text between template properties
    if (testCase.template.includes('{name}={value}')) {
        // The '=' between {name} and {value} should NOT be tokenized
        const match = testCase.template.match(/\{name\}(=)\{value\}/);
        if (match && match.index !== undefined) {
            const equalIndex = match.index + '{name}'.length;
            const hasEqualHighlight = elements.some(e =>
                e.startIndex === equalIndex && e.endIndex === equalIndex + 1
            );
            if (hasEqualHighlight) {
                console.log(`  ❌ Literal '=' between template properties is incorrectly highlighted`);
                totalFailures++;
            }
        }
    }

    // Verify specific critical elements
    if (testCase.template.includes('{#if') && !elements.some(e => e.classificationType === 'directive')) {
        console.log('  ❌ Directives not highlighted');
        totalFailures++;
    }

    if (testCase.template.includes('@t') && !elements.some(e => e.classificationType === 'builtin')) {
        console.log('  ❌ Built-in properties not highlighted');
        totalFailures++;
    }

    if (testCase.template.includes(':HH:mm:ss') && !elements.some(e => e.classificationType === 'format')) {
        console.log('  ❌ Format specifiers not highlighted');
        totalFailures++;
    }

    console.log(`  Found ${elements.length} highlighted elements\n`);
}

console.log('=== SUMMARY ===');
console.log(`Total test failures: ${totalFailures}`);

if (totalFailures > 0) {
    // Debug output - show what we're actually getting
    console.log('\n=== DEBUG: Actual tokenization ===');
    const debugTemplate = "{#if IsError}[ERROR]{#else if Level = 'Warning'}[WARN]{#else}[INFO]{#end}";
    const tokenizer = new ExpressionTokenizer(debugTemplate);
    const tokens = tokenizer.tokenize();
    console.log(`Template: "${debugTemplate}"`);
    console.log('Tokens:');
    tokens.forEach(t => {
        const typeNames = ['Identifier', 'StringLiteral', 'NumberLiteral', 'ComparisonOperator', 'LogicalOperator', 'ArithmeticOperator', 'Directive', 'BuiltInProperty', 'Function', 'Punctuation', 'FormatSpecifier', 'Unknown'];
        console.log(`  ${typeNames[t.type]}: '${t.value}' [${t.start}-${t.end}]`);
    });

    throw new Error(`FAILURE: ${totalFailures} issues with expression template highlighting!`);
}

console.log('✅ All expression template highlighting tests passed!');