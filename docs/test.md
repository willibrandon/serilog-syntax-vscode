# Serilog Syntax Highlighting for VS Code - Comprehensive Test Plan

## Overview

This test plan covers the VS Code extension for Serilog syntax highlighting, based on the extensive test suite from the Visual Studio 2022 version. The plan ensures feature parity while adapting to VS Code's testing framework and capabilities.

## Test Strategy

### Testing Principles
1. **Port all critical test cases** from VS 2022 to ensure compatibility
2. **Adapt tests for VS Code APIs** (TextDocument, Range, Position instead of ITextBuffer, SnapshotSpan)
3. **Add VS Code-specific scenarios** (themes, workspace, settings)
4. **Maintain performance baselines** from the original extension
5. **Test incrementally** - unit → integration → E2E

### Test Organization
```
test/
├── unit/
│   ├── parsers/
│   │   ├── templateParser.test.ts
│   │   ├── expressionParser.test.ts
│   │   └── stringLiteralParser.test.ts
│   ├── utils/
│   │   ├── serilogCallDetector.test.ts
│   │   ├── cacheManager.test.ts
│   │   └── themeManager.test.ts
│   └── expressions/
│       ├── expressionDetector.test.ts
│       └── expressionTokenizer.test.ts
├── integration/
│   ├── semanticTokens.test.ts
│   ├── multilineStrings.test.ts
│   ├── stringConcatenation.test.ts
│   ├── expressionTemplates.test.ts
│   └── syntaxTreeAnalyzer.test.ts
├── e2e/
│   ├── highlighting.test.ts
│   ├── bracketMatching.test.ts
│   ├── navigation.test.ts
│   └── performance.test.ts
├── fixtures/
│   ├── templates/
│   ├── expressions/
│   └── realWorld/
└── snapshots/
```

## 1. Unit Tests

### 1.1 Template Parser Tests

**Test Cases from VS 2022 to Port:**

#### Basic Properties
```typescript
describe('TemplateParser', () => {
  test.each([
    ['User {UserId} logged in', [{name: 'UserId', type: 'standard'}]],
    ['Error {@Exception} occurred', [{name: 'Exception', type: 'destructured'}]],
    ['Config: {$Settings}', [{name: 'Settings', type: 'stringified'}]],
    ['{0} {1} {2}', [{name: '0', type: 'positional'}, {name: '1', type: 'positional'}, {name: '2', type: 'positional'}]],
    ['Time: {Timestamp:yyyy-MM-dd}', [{name: 'Timestamp', format: 'yyyy-MM-dd'}]],
    ['Name: {Name,10}', [{name: 'Name', alignment: '10'}]],
    ['Price: {Price,-8:C2}', [{name: 'Price', alignment: '-8', format: 'C2'}]]
  ])('should parse: %s', (template, expected) => {
    // Test implementation
  });
});
```

#### Edge Cases
- Empty template: `""`
- Just braces: `"{}"`
- Unclosed brace: `"{Property"`
- Escaped braces: `"{{escaped}}"`
- Unicode properties: `"{Προπερτυ}"`
- Very long property names (>100 chars)
- Deep nesting attempts: `"{{{nested}}}"`
- Invalid format specifiers: `"{Prop:invalid}"`

#### Multi-line Templates
- Verbatim strings with newlines
- Raw strings with multiple lines
- Templates with \r, \n, \r\n combinations

### 1.2 Expression Parser Tests

**Core Expression Tests:**

```typescript
describe('ExpressionParser', () => {
  describe('Filter Expressions', () => {
    test.each([
      ["Level = 'Error'", ['Level', '=', 'Error']],
      ["StatusCode >= 400", ['StatusCode', '>=', '400']],
      ["RequestPath like '/api%'", ['RequestPath', 'like', '/api%']],
      ["User.Role in ['Admin', 'Moderator']", ['User.Role', 'in', 'Admin', 'Moderator']],
      ["Exception is not null", ['Exception', 'is not null']],
      ["Name = 'john' ci", ['Name', '=', 'john', 'ci']]
    ])('should parse filter: %s', (expression, expectedTokens) => {
      // Test implementation
    });
  });
});
```

**Expression Template Tests:**
- Directives: `{#if}`, `{#else}`, `{#else if}`, `{#end}`, `{#each}`
- Built-in properties: `@t`, `@m`, `@l`, `@x`, `@p`, `@i`, `@r`, `@tr`, `@sp`
- Format specifiers in expressions: `{@t:HH:mm:ss}`
- Mixed content: template + expression syntax

### 1.3 String Literal Detection Tests

**Critical Scenarios from VS 2022:**

```typescript
describe('StringLiteralDetector', () => {
  test('detects regular strings', () => {
    // "simple string"
  });
  
  test('detects verbatim strings', () => {
    // @"verbatim string"
  });
  
  test('detects raw string literals', () => {
    // """raw string"""
  });
  
  test('detects concatenated strings', () => {
    // "part1" + "part2" + "part3"
  });
  
  test('handles escaped quotes correctly', () => {
    // "escaped \" quote"
    // @"escaped "" quote"
  });
});
```

### 1.4 Serilog Call Detection Tests

**Pattern Recognition:**

```typescript
describe('SerilogCallDetector', () => {
  test.each([
    'Log.Information("...")',
    'Log.Debug("...")',
    '_logger.LogInformation("...")',
    'logger.LogError(ex, "...")',
    'Log.ForContext<T>().Information("...")',
    'logger.BeginScope("...")',
    '.WriteTo.Console(outputTemplate: "...")',
    '.Filter.ByExcluding("...")',
    'new ExpressionTemplate("...")'
  ])('should detect: %s', (code) => {
    // Test implementation
  });
  
  test.each([
    'Console.WriteLine("...")',
    'var message = "..."',
    'string.Format("...")',
    'Debug.Log("...")'
  ])('should NOT detect: %s', (code) => {
    // Test implementation
  });
});
```

## 2. Integration Tests

### 2.1 Semantic Tokens Provider Tests

**VS Code Specific Implementation:**

```typescript
describe('SemanticTokensProvider', () => {
  let provider: SemanticTokensProvider;
  
  beforeEach(() => {
    provider = new SemanticTokensProvider();
  });
  
  test('provides tokens for simple template', async () => {
    const document = await createTestDocument('logger.LogInformation("User {UserId} logged in", userId);');
    const tokens = await provider.provideDocumentSemanticTokens(document);
    
    // Verify token positions and types
    expect(tokens).toContainToken({
      line: 0,
      char: 30,
      length: 6,
      tokenType: 'serilogProperty'
    });
  });
});
```

### 2.2 Multi-line String Tests

**Critical Test Cases from VS 2022:**

1. **Raw String Multi-line**
   ```csharp
   logger.LogInformation("""
       Processing record:
       ID: {RecordId}
       Status: {Status}
       """, recordId, status);
   ```

2. **Verbatim String Multi-line**
   ```csharp
   logger.LogInformation(@"
       User: {UserName}
       Department: {Department}
       ", userName, dept);
   ```

3. **String Concatenation Multi-line**
   ```csharp
   logger.LogError("Error processing {Operation}" +
       "for user {UserId} " +
       "at time {Timestamp} ",
       "DataSync", 42, DateTime.Now);
   ```

### 2.3 Expression Template Tests

**Complex Scenarios:**

```typescript
describe('ExpressionTemplate Integration', () => {
  test('handles complex multi-line expression template', async () => {
    const code = `
    new ExpressionTemplate(
      "{#if IsError}[ERROR]{#else if Level = 'Warning'}[WARN]{#else}[INFO]{#end} " +
      "[{@t:yyyy-MM-dd HH:mm:ss.fff}] " +
      "{#if @p['RequestId'] is not null}[{@p['RequestId']}] {#end}" +
      "{@m}" +
      "{#each name, value in @p} | {name}={value}{#end}" +
      "{#if @x is not null}\\n{@x}{#end}\\n"
    )`;
    
    // Test all elements are classified correctly
  });
});
```

## 3. End-to-End Tests

### 3.1 Visual Highlighting Tests

```typescript
describe('E2E Highlighting', () => {
  test('highlights on file open', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'logger.LogInformation("User {UserId} logged in", userId);',
      language: 'csharp'
    });
    
    await vscode.window.showTextDocument(doc);
    await waitForHighlighting();
    
    // Verify decorations are applied
    const decorations = getActiveDecorations();
    expect(decorations).toContainDecoration('UserId', 'serilogProperty');
  });
  
  test('updates highlighting on edit', async () => {
    // Open document
    // Make edit
    // Verify highlighting updates
  });
});
```

### 3.2 Bracket Matching Tests

```typescript
describe('Bracket Matching', () => {
  test('highlights matching braces', async () => {
    // Position cursor on {
    // Verify matching } is highlighted
  });
  
  test('dismisses highlight on ESC', async () => {
    // Trigger bracket matching
    // Press ESC
    // Verify highlight removed
  });
  
  test('handles nested braces', async () => {
    // Test nested template properties
  });
});
```

### 3.3 Navigation Tests

```typescript
describe('Navigation', () => {
  test('navigates from property to argument', async () => {
    // Hover over {UserId}
    // Click code action
    // Verify cursor moves to userId argument
  });
});
```

## 4. Performance Tests

### 4.1 Parsing Performance

```typescript
describe('Performance', () => {
  test('parses large template under 10ms', () => {
    const largeTemplate = generateLargeTemplate(1000); // 1000 properties
    
    const start = performance.now();
    const result = parser.parse(largeTemplate);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(10);
    expect(result.length).toBe(1000);
  });
  
  test('handles 10K line file smoothly', async () => {
    const largeFile = generateLargeFile(10000);
    
    const start = performance.now();
    const tokens = await provider.provideSemanticTokens(largeFile);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // Under 1 second
  });
});
```

### 4.2 Memory Tests

```typescript
describe('Memory Management', () => {
  test('cache evicts old entries', () => {
    const cache = new CacheManager(100); // Max 100 entries
    
    // Add 150 entries
    for (let i = 0; i < 150; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    // Verify only 100 entries remain
    expect(cache.size).toBe(100);
    
    // Verify LRU eviction
    expect(cache.has('key0')).toBe(false);
    expect(cache.has('key149')).toBe(true);
  });
  
  test('no memory leak on repeated parsing', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Parse 1000 times
    for (let i = 0; i < 1000; i++) {
      parser.parse(complexTemplate);
    }
    
    global.gc(); // Force garbage collection
    const finalMemory = process.memoryUsage().heapUsed;
    
    // Memory shouldn't grow significantly
    expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

## 5. VS Code Specific Tests

### 5.1 Theme Integration

```typescript
describe('Theme Integration', () => {
  test('adapts colors to dark theme', async () => {
    await vscode.commands.executeCommand('workbench.action.selectTheme', 'Dark+');
    const colors = themeManager.getCurrentColors();
    
    expect(colors.property).toBe('#9CDCFE'); // Light blue for dark theme
  });
  
  test('adapts colors to light theme', async () => {
    await vscode.commands.executeCommand('workbench.action.selectTheme', 'Light+');
    const colors = themeManager.getCurrentColors();
    
    expect(colors.property).toBe('#0000FF'); // Dark blue for light theme
  });
});
```

### 5.2 Configuration Tests

```typescript
describe('Configuration', () => {
  test('respects highlighting.enabled setting', async () => {
    await vscode.workspace.getConfiguration('serilog-syntax')
      .update('highlighting.enabled', false);
    
    // Verify no highlighting occurs
  });
  
  test('respects custom colors', async () => {
    await vscode.workspace.getConfiguration('serilog-syntax')
      .update('colors.property', '#FF0000');
    
    // Verify custom color is used
  });
});
```

### 5.3 Workspace Tests

```typescript
describe('Workspace', () => {
  test('handles multiple open files', async () => {
    // Open 5 files with Serilog templates
    // Verify all are highlighted
    // Make edits
    // Verify independent highlighting
  });
  
  test('handles workspace folders', async () => {
    // Open multi-root workspace
    // Verify extension works across folders
  });
});
```

## 6. Test Data

### 6.1 Fixture Files

Create comprehensive test fixtures based on VS 2022 test data:

```
fixtures/
├── templates/
│   ├── basic.cs
│   ├── destructuring.cs
│   ├── formatting.cs
│   ├── positional.cs
│   └── edge-cases.cs
├── expressions/
│   ├── filters.cs
│   ├── expression-templates.cs
│   ├── computed-properties.cs
│   └── directives.cs
├── multiline/
│   ├── raw-strings.cs
│   ├── verbatim-strings.cs
│   └── concatenation.cs
└── real-world/
    ├── aspnet-logging.cs
    ├── serilog-config.cs
    └── complex-templates.cs
```

### 6.2 Snapshot Testing

```typescript
describe('Snapshot Tests', () => {
  test.each(getFixtureFiles())('matches snapshot: %s', async (file) => {
    const content = await readFixture(file);
    const tokens = await provider.provideSemanticTokens(content);
    
    expect(tokens).toMatchSnapshot();
  });
});
```

## 7. Test Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 80%
- **Parsers**: 95% (critical path)
- **Providers**: 85%
- **Utils**: 75%
- **E2E**: 60% (UI testing limitations)

### Critical Paths (100% coverage required)
1. Template property parsing
2. Expression operator detection
3. String literal boundary detection
4. Serilog method recognition

## 8. Test Execution Strategy

### CI/CD Pipeline
```yaml
test:
  - stage: unit
    parallel: true
    script: npm run test:unit
    
  - stage: integration
    parallel: true
    script: npm run test:integration
    
  - stage: e2e
    parallel: false
    script: xvfb-run -a npm run test:e2e
    
  - stage: performance
    script: npm run test:performance
    
  - stage: coverage
    script: npm run test:coverage
    after_script: 
      - upload coverage to codecov
```

### Local Development
```bash
# Quick unit tests during development
npm run test:unit:watch

# Full test suite before commit
npm run test:all

# Specific test file
npm run test -- semanticTokens.test.ts
```

## 9. Regression Testing

### Test Against Known Issues
Based on VS 2022 bug fixes:
1. Multi-line ForContext patterns
2. String concatenation edge cases
3. LogError with exception parameter
4. Unclosed directive spillover
5. Raw string delimiter detection

### Backward Compatibility
- Test with VS Code 1.74.0 (minimum version)
- Test with latest VS Code Insiders
- Test with different Node.js versions (14, 16, 18)

## 10. Manual Testing Protocol

### Smoke Test Checklist
- [ ] Install extension in clean VS Code
- [ ] Open C# project with Serilog
- [ ] Verify immediate highlighting
- [ ] Type new log statement - verify real-time highlighting
- [ ] Test bracket matching
- [ ] Test navigation feature
- [ ] Switch themes - verify color adaptation
- [ ] Change settings - verify they take effect
- [ ] Test with large file (>5000 lines)
- [ ] Test with multiple files open

### User Acceptance Scenarios
1. **New User**: Install → Open file → See highlighting
2. **Migration from VS**: Feature parity verification
3. **Power User**: Complex templates, expressions
4. **Performance**: Large codebases, many files

This comprehensive test plan ensures the VS Code extension maintains the quality and features of the Visual Studio version while leveraging VS Code's specific capabilities and testing frameworks.