// Test for Serilog call detection including ForContext patterns
// Inline the function to avoid vscode module dependency
function isSerilogCall(line: string): boolean {
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

const testCases = [
    {
        name: 'Direct log.Information call',
        line: 'log.Information("Running {Example}", nameof(PipelineComponentExample));',
        shouldDetect: true
    },
    {
        name: 'log.ForContext on same line as Information',
        line: 'log.ForContext<Program>().Information("Cart contains {@Items}", ["Tea", "Coffee"]);',
        shouldDetect: true
    },
    {
        name: 'log.ForContext standalone line',
        line: 'log.ForContext<Program>()',
        shouldDetect: true
    },
    {
        name: 'Information on continuation line after ForContext',
        line: '    .Information("Cart contains {@Items}", ["Tea", "Coffee"]);',
        shouldDetect: true
    },
    {
        name: 'logger.LogInformation call',
        line: 'logger.LogInformation("Test {Value}", 123);',
        shouldDetect: true
    },
    {
        name: '_logger.Information call',
        line: '_logger.Information("Test {Value}", 123);',
        shouldDetect: true
    },
    {
        name: 'myLog.Debug call',
        line: 'myLog.Debug("Debug message");',
        shouldDetect: true
    },
    {
        name: 'customLogger.Warning call',
        line: 'customLogger.Warning("Warning message");',
        shouldDetect: true
    },
    {
        name: 'Non-Serilog call',
        line: 'Console.WriteLine("Not a Serilog call");',
        shouldDetect: false
    },
    {
        name: 'Variable assignment without call',
        line: 'var log = new LoggerConfiguration();',
        shouldDetect: false
    },
    {
        name: 'program.Information from ForContext result',
        line: 'program.Information("Host listening at {ListenUri}", "https://hello-world.local");',
        shouldDetect: true
    },
    {
        name: 'any variable with .Information method',
        line: 'myCustomLogger.Information("Message {Value}", 123);',
        shouldDetect: true
    }
];

console.log('=== Serilog Detection Test ===\n');

let failures = 0;

for (const testCase of testCases) {
    const detected = isSerilogCall(testCase.line);
    const passed = detected === testCase.shouldDetect;

    if (!passed) {
        console.log(`❌ ${testCase.name}`);
        console.log(`   Line: "${testCase.line}"`);
        console.log(`   Expected: ${testCase.shouldDetect ? 'detected' : 'not detected'}`);
        console.log(`   Actual: ${detected ? 'detected' : 'not detected'}\n`);
        failures++;
    } else {
        console.log(`✅ ${testCase.name}`);
    }
}

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${testCases.length - failures}/${testCases.length}`);

if (failures > 0) {
    // Now let's test the actual problematic code pattern
    console.log('\n=== Testing Multi-line Pattern ===');

    // The actual pattern from the user's code
    const multiLineCode = `
        log.ForContext<Program>()
            .Information("Cart contains {@Items}", ["Tea", "Coffee"]);

        log.ForContext<Program>()
            .Information("Cart contains {@Items}", ["Apricots"]);
    `;

    const lines = multiLineCode.split('\n').filter(line => line.trim());
    console.log('Lines to test:');
    lines.forEach((line, i) => {
        const detected = isSerilogCall(line);
        console.log(`  Line ${i + 1}: ${detected ? '✅' : '❌'} "${line.trim()}"`);
    });

    throw new Error(`FAILURE: ${failures} test cases failed!`);
}

console.log('✅ All Serilog detection tests passed!');