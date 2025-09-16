// Test that FAILS - reads ExampleService.cs and proves expressions aren't highlighted

const fs = require('fs');
const path = require('path');

// Read the actual example file
const examplePath = path.join(__dirname, '../../Example/ExampleService.cs');
const exampleContent = fs.readFileSync(examplePath, 'utf8');

// Load the actual extension parser
const { parseTemplate } = require('../parsers/templateParser');
const { ExpressionParser } = require('../parsers/expressionParser');

// Extract expression strings from ExampleService.cs
const expressionExamples = [
    { line: 76, content: "RequestPath like '/health%' and StatusCode < 400" },
    { line: 77, content: "IsError", note: "computed property expression" },
    { line: 77, content: "Level = 'Error' or Level = 'Fatal'" },
    { line: 81, content: "{@t:HH:mm:ss} {@l:u3}] {#if IsError}❌{#else}✅{#end} {@m}\\n{#if @x is not null}{@x}\\n{#end}" },
    { line: 312, content: "RequestPath like '/health%' and StatusCode < 400" },
    { line: 313, content: "SourceContext = 'Microsoft.AspNetCore.Hosting.Diagnostics' and Level < 'Warning'" },
    { line: 314, content: "Level >= 'Information' or SourceContext = 'Example.ExampleService'" },
    { line: 315, content: "Message not like '%debug%' ci" },
    { line: 316, content: "User.Role in ['Admin', 'Moderator'] or Level = 'Error'" },
    { line: 317, content: "Exception is not null and Contains(Exception.Type, 'OperationCanceled')" },
    { line: 320, content: "Level >= 'Warning'" },
    { line: 321, content: "Contains(RequestPath, '/api')" },
    { line: 322, content: "User.IsAuthenticated and User.Role = 'Admin'" },
    { line: 325, content: "Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)" },
    { line: 326, content: "Level = 'Error' or Level = 'Fatal'" },
    { line: 327, content: "if StartsWith(RequestPath, '/api') then 'API' else 'Web'" },
    { line: 328, content: "Round(Elapsed.TotalMilliseconds, 2)" },
    { line: 329, content: "Coalesce(User.FullName, User.Email, 'Anonymous')" },
    { line: 332, content: "Environment = 'Production' and Level >= 'Warning'" },
    { line: 334, content: "Contains(SourceContext, 'Security') or Contains(Message, 'Authentication')" },
    { line: 336, content: "RequestPath like '/api%' and StatusCode >= 400" },
    { line: 344, content: "[{@t:HH:mm:ss} {@l:u3}] {#if SourceContext is not null}[{Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)}]{#end} {@m}\\n{@x}" },
    { line: 346, content: "{#if IsError}[ERROR]{#else if Level = 'Warning'}[WARN]{#else}[INFO]{#end}" },
    { line: 350, content: "{#each name, value in @p} | {name}={value}{#end}" },
    { line: 351, content: "{#if @x is not null}\\n{@x}{#end}" },
    { line: 446, content: "{#if SourceContext is not null} ({Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)}){#end}" },
    { line: 447, content: "{@m} (first item is {coalesce(Items[0], '<empty>')}) {rest()}" },
    { line: 468, content: "coalesce(Items[0], '<empty>')" },
    { line: 469, content: "coalesce(Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1), '<no source>')" },
    { line: 470, content: "Items is null or Items[?] like 'C%'" },
    { line: 503, content: "{#if Scope is not null}" },
    { line: 504, content: "{#each s in Scope}=> {s}{#delimit} {#end}" }
];

console.log('\n=== Serilog.Expressions Highlighting Failure Test ===\n');
console.log(`Testing ${expressionExamples.length} expression examples from ExampleService.cs\n`);

let totalFailures = 0;
let totalExpressionElements = 0;

for (const example of expressionExamples) {
    // Try to parse the expression with both parsers
    const templateParsed = parseTemplate(example.content);
    const expressionParser = new ExpressionParser(example.content);
    const expressionParsed = expressionParser.parse();

    // Use expression parser results if available, otherwise template parser
    const parsed = expressionParsed.length > 0 ? expressionParsed : templateParsed;

    // Count expected elements (operators, functions, directives, built-ins)
    let expectedElements = 0;

    // Count operators
    expectedElements += (example.content.match(/\b(and|or|not|in|like)\b/gi) || []).length;
    expectedElements += (example.content.match(/[<>=!]+/g) || []).length;

    // Count functions
    expectedElements += (example.content.match(/\b(Contains|Substring|LastIndexOf|StartsWith|Round|Coalesce|coalesce|rest)\s*\(/g) || []).length;

    // Count directives
    expectedElements += (example.content.match(/{#(if|else|end|each|delimit)/g) || []).length;

    // Count built-in properties
    expectedElements += (example.content.match(/@[tlmxirp]/g) || []).length;

    if (parsed.length === 0 && expectedElements > 0) {
        console.log(`❌ Line ${example.line}: NOTHING parsed from expression`);
        console.log(`   Content: "${example.content.substring(0, 60)}${example.content.length > 60 ? '...' : ''}"`);
        console.log(`   Expected at least ${expectedElements} elements`);
        console.log(`   Actual: 0 - template parser cannot handle expressions!\n`);
        totalFailures++;
        totalExpressionElements += expectedElements;
    } else if (parsed.length < expectedElements) {
        console.log(`⚠️  Line ${example.line}: Incomplete parsing`);
        console.log(`   Content: "${example.content.substring(0, 60)}${example.content.length > 60 ? '...' : ''}"`);
        console.log(`   Expected: ${expectedElements} elements`);
        console.log(`   Actual: ${parsed.length} elements\n`);
        totalFailures++;
    }
}

console.log('=== SUMMARY ===');
console.log(`Failed: ${totalFailures}/${expressionExamples.length} expressions`);
console.log(`Total expression elements not highlighted: ${totalExpressionElements}\n`);

if (totalFailures > 0) {
    throw new Error(`FAILURE: ${totalFailures} Serilog.Expressions from ExampleService.cs are NOT highlighted!\nThe template parser cannot handle expression syntax at all.`);
}