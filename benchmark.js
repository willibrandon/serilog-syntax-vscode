// Mock jest and vscode using existing mock structure
global.jest = { fn: (impl) => impl || (() => {}) };

// Use the existing vscode mock pattern
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === 'vscode') {
        const vscode = require('./out/test/mocks/vscode.js');
        return vscode.default;
    }
    return originalRequire.apply(this, arguments);
};

const { parseTemplate } = require('./out/parsers/templateParser.js');
const { isSerilogCall } = require('./out/utils/serilogDetector.js');
const { CacheManager } = require('./out/utils/cacheManager.js');

function benchmark(name, iterations, operation) {
    // Warmup
    for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
        operation();
    }

    const measurements = [];
    for (let run = 0; run < 10; run++) {
        const start = process.hrtime.bigint();
        for (let i = 0; i < iterations; i++) {
            operation();
        }
        const end = process.hrtime.bigint();

        const totalNs = Number(end - start);
        const avgNs = totalNs / iterations;
        measurements.push(avgNs);
    }

    measurements.sort((a, b) => a - b);
    const mean = measurements.reduce((a, b) => a + b) / measurements.length;
    const median = measurements[Math.floor(measurements.length / 2)];

    const unit = mean < 1000 ? 'ns' : mean < 1000000 ? 'μs' : 'ms';
    const divisor = unit === 'ns' ? 1 : unit === 'μs' ? 1000 : 1000000;

    console.log(`${name.padEnd(30)} | Mean: ${(mean / divisor).toFixed(1).padStart(7)} ${unit} | Median: ${(median / divisor).toFixed(1).padStart(7)} ${unit}`);
}

console.log('Serilog Syntax Benchmarks');
console.log('=========================');
console.log();

// Parser Benchmarks
console.log('ParserBenchmarks');
console.log('---------------');

benchmark('ParseSimpleTemplate', 100000, () => {
    parseTemplate("Simple template with {Property}");
});

benchmark('ParseComplexTemplate', 100000, () => {
    parseTemplate("Complex {@User} with {Count:N0} and {Timestamp:yyyy-MM-dd HH:mm:ss}");
});

benchmark('ParseMultipleProperties', 100000, () => {
    parseTemplate("Multiple {Prop1} {Prop2} {Prop3} {Prop4} {Prop5}");
});

benchmark('ParseAllTemplates', 10000, () => {
    const templates = [
        "Simple template with {Property}",
        "Complex {@User} with {Count:N0} and {Timestamp:yyyy-MM-dd HH:mm:ss}",
        "Multiple {Prop1} {Prop2} {Prop3} {Prop4} {Prop5}",
        "Nested {Outer,10:F2} and {@Inner} with {$String}",
        "Positional {0} {1} {2} mixed with {Named}",
        "Verbatim string with {Property1} and {Property2}",
        "Malformed {Unclosed and {Valid} property",
        "Empty {} and {Valid} with {@Destructured}"
    ];
    for (const template of templates) {
        parseTemplate(template);
    }
});

benchmark('ParseWithErrorRecovery', 100000, () => {
    parseTemplate("Malformed {Unclosed and {Valid} property");
});

benchmark('ParseVerbatimString', 100000, () => {
    parseTemplate("Verbatim string with {Property1} and {Property2}");
});

console.log();

// Cache Benchmarks
console.log('CacheBenchmarks');
console.log('--------------');

let cache = new CacheManager(100);
let cacheKeys = [];

for (let i = 0; i < 200; i++) {
    cacheKeys.push(`Log.Information("Test {Property${i}}")`);
}

for (let i = 0; i < 50; i++) {
    cache.set(cacheKeys[i], i % 2 === 0);
}

benchmark('CacheHitPerformance', 50000, () => {
    for (let i = 0; i < 50; i++) {
        cache.get(cacheKeys[i]);
    }
});

benchmark('CacheMissPerformance', 50000, () => {
    for (let i = 150; i < 200; i++) {
        cache.get(cacheKeys[i]);
    }
});

benchmark('CacheAddPerformance', 10000, () => {
    const localCache = new CacheManager(100);
    for (let i = 0; i < 100; i++) {
        localCache.set(cacheKeys[i], true);
    }
});

benchmark('CacheEvictionPerformance', 5000, () => {
    const localCache = new CacheManager(50);
    for (let i = 0; i < 100; i++) {
        localCache.set(cacheKeys[i], true);
    }
});

benchmark('CacheMixedOperations', 1000, () => {
    const localCache = new CacheManager(100);
    for (let i = 0; i < 200; i++) {
        const key = cacheKeys[i % cacheKeys.length];
        if (!localCache.get(key)) {
            localCache.set(key, i % 2 === 0);
        }
    }
});

console.log();

// Call Detector Benchmarks
console.log('CallDetectorBenchmarks');
console.log('---------------------');

const serilogLines = [
    "_logger.LogInformation(\"User {UserId} logged in\", userId);",
    "Log.Information(\"Processing {Count} items\", count);",
    "_logger.LogError(ex, \"Failed to process {ItemId}\", id);",
    "logger.BeginScope(\"Operation {OperationId}\", opId);",
    ".WriteTo.Console(outputTemplate: \"[{Timestamp}] {Message}\")"
];

const nonSerilogLines = [
    "Console.WriteLine(\"Hello World\");",
    "var result = ProcessData(input);",
    "if (condition) { return true; }",
    "// This is a comment about logging",
    "string message = \"User logged in\";"
];

const mixedLines = [];
for (let i = 0; i < 100; i++) {
    if (i % 3 === 0) {
        mixedLines.push(serilogLines[i % serilogLines.length]);
    } else {
        mixedLines.push(nonSerilogLines[i % nonSerilogLines.length]);
    }
}

benchmark('DetectSerilogCalls', 50000, () => {
    for (const line of serilogLines) {
        isSerilogCall(line);
    }
});

benchmark('DetectNonSerilogCalls', 50000, () => {
    for (const line of nonSerilogLines) {
        isSerilogCall(line);
    }
});

benchmark('DetectMixedCalls', 5000, () => {
    for (const line of mixedLines) {
        isSerilogCall(line);
    }
});

console.log();
console.log('Benchmark completed');