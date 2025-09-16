import { parseTemplate } from '../parsers/templateParser';

function testParser() {
    const tests = [
        { input: 'User {UserId} logged in', expected: 1 },
        { input: 'Error {@Exception} occurred', expected: 1 },
        { input: '{0} {1} {2}', expected: 3 },
        { input: 'Time: {Timestamp:yyyy-MM-dd}', expected: 1 },
        { input: 'Name: {Name,10}', expected: 1 }
    ];

    for (const test of tests) {
        const result = parseTemplate(test.input);
        console.assert(result.length === test.expected,
            `Failed: "${test.input}" - Expected ${test.expected}, got ${result.length}`);
    }

    console.log('All parser tests passed!');
}

testParser();