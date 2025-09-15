# Serilog Syntax Highlighting for VS Code - Comprehensive Implementation Guide

## Project Overview

You are implementing a VS Code extension called `serilog-syntax-vscode` that provides syntax highlighting, IntelliSense, diagnostics, and navigation features for Serilog message templates and Serilog.Expressions in C#/.NET projects. This extension should match the capabilities of the Visual Studio version while leveraging VS Code's extension architecture.

## Initial Setup

### 1. Project Initialization

Create a new VS Code extension project:
```bash
npm install -g yo generator-code
yo code
```
- Choose: New Extension (TypeScript)
- Name: serilog-syntax-vscode
- Identifier: serilog-syntax-vscode
- Description: Syntax highlighting, IntelliSense, and diagnostics for Serilog message templates and Serilog.Expressions
- Initialize git repository: Yes
- Bundle source code: Yes
- Package manager: npm

### 2. Dependencies to Install

```json
{
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "18.x",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0",
    "@vscode/test-electron": "^2.3.0",
    "esbuild": "^0.19.0"
  },
  "dependencies": {
    "lru-cache": "^10.0.0"
  }
}
```

## Core Implementation Structure

### Directory Structure

Create the following directory structure:
```
serilog-syntax-vscode/
├── src/
│   ├── extension.ts
│   ├── providers/
│   │   ├── semanticTokensProvider.ts
│   │   ├── hoverProvider.ts
│   │   ├── completionProvider.ts
│   │   ├── definitionProvider.ts
│   │   ├── diagnosticsProvider.ts
│   │   ├── documentSymbolProvider.ts
│   │   └── codeLensProvider.ts
│   ├── parsers/
│   │   ├── templateParser.ts
│   │   ├── expressionParser.ts
│   │   ├── syntaxAnalyzer.ts
│   │   └── stringLiteralParser.ts
│   ├── decorators/
│   │   ├── bracketDecorator.ts
│   │   └── bracketMatchingProvider.ts
│   ├── utils/
│   │   ├── cacheManager.ts
│   │   ├── serilogCallDetector.ts
│   │   ├── themeManager.ts
│   │   ├── constants.ts
│   │   └── logger.ts
│   ├── models/
│   │   ├── templateProperty.ts
│   │   ├── expressionRegion.ts
│   │   ├── serilogCall.ts
│   │   └── diagnosticResult.ts
│   └── test/
│       ├── suite/
│       │   ├── templateParser.test.ts
│       │   ├── expressionParser.test.ts
│       │   ├── semanticTokens.test.ts
│       │   └── diagnostics.test.ts
│       └── fixtures/
│           └── sampleFiles.ts
├── syntaxes/
│   ├── serilog.injection.json
│   └── serilog-expressions.injection.json
├── language-configuration.json
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .vscodeignore
├── webpack.config.js
└── README.md
```

## Detailed Implementation Components

### 1. Extension Entry Point (`src/extension.ts`)

The main extension file should:
- Register all providers with VS Code
- Set up activation events for C# files
- Initialize the cache manager
- Set up file watchers for configuration changes
- Handle extension lifecycle (activate/deactivate)

Key implementation points:
- Use `vscode.languages.registerDocumentSemanticTokensProvider` for semantic highlighting
- Register providers only for `csharp` language ID
- Set up disposal pattern for cleanup
- Initialize diagnostics collection
- Set up configuration change listeners

### 2. Template Parser (`src/parsers/templateParser.ts`)

Implement a parser that can handle all Serilog template syntax:

#### Parser Requirements:
1. **Property Detection**: `{PropertyName}`, `{PropertyName:format}`, `{PropertyName,alignment}`
2. **Destructuring Operator**: `{@Object}`
3. **Stringification Operator**: `{$Object}`
4. **Positional Parameters**: `{0}`, `{1}`, etc.
5. **Format Specifiers**: After `:` character (e.g., `:yyyy-MM-dd`, `:C2`)
6. **Alignment**: After `,` character (e.g., `,10`, `,-15`)
7. **Nested Braces**: Handle escaped braces `{{` and `}}`

#### Implementation Strategy:
- Use a state machine approach for parsing
- Track position information for each element
- Return structured data with start/end positions
- Handle malformed templates gracefully
- Cache parsing results for performance

#### Edge Cases to Handle:
- Unclosed braces
- Invalid format specifiers
- Nested properties (not valid but should not crash)
- Unicode characters in property names
- Very long templates (>1000 characters)

### 3. Expression Parser (`src/parsers/expressionParser.ts`)

Parse Serilog.Expressions syntax for filter expressions and expression templates:

#### Expression Types to Support:
1. **Operators**: `and`, `or`, `not`, `=`, `<>`, `<`, `>`, `<=`, `>=`, `like`, `in`, `is null`, `is not null`
2. **Functions**: `StartsWith()`, `EndsWith()`, `Contains()`, `Length()`, `Substring()`, `IndexOf()`, etc.
3. **Literals**: Strings (`'text'`), numbers, booleans (`true`/`false`), `null`
4. **Properties**: Regular properties and built-in (`@t`, `@m`, `@l`, `@x`, `@i`, `@p`)
5. **Directives**: `{#if}`, `{#each}`, `{#else}`, `{#end}` for expression templates
6. **Computed Properties**: Mathematical and string operations

#### Parser Implementation:
- Implement tokenizer first (lexical analysis)
- Build AST (Abstract Syntax Tree) for complex expressions
- Support operator precedence
- Handle function calls with parameters
- Track source positions for all tokens

### 4. Semantic Tokens Provider (`src/providers/semanticTokensProvider.ts`)

Implement VS Code's semantic tokens API:

#### Token Types to Register:
```typescript
const tokenTypes = [
  'serilogProperty',
  'serilogDestructure', 
  'serilogStringify',
  'serilogFormat',
  'serilogAlignment',
  'serilogPositional',
  'serilogExpressionOperator',
  'serilogExpressionFunction',
  'serilogExpressionKeyword',
  'serilogExpressionLiteral',
  'serilogExpressionDirective',
  'serilogExpressionBuiltin'
];
```

#### Implementation Requirements:
1. **Document Analysis**:
   - Find all string literals in C# code
   - Detect which strings are Serilog templates
   - Parse templates and generate tokens
   - Return tokens in VS Code's format

2. **Performance Optimization**:
   - Implement incremental updates
   - Cache results per document version
   - Use document change events efficiently
   - Batch token updates

3. **Context Detection**:
   - Identify Serilog method calls (Log.*, ILogger.*, etc.)
   - Handle different string literal types (regular, verbatim, raw)
   - Support multi-line strings
   - Detect configuration contexts (outputTemplate, etc.)

### 5. Syntax Analyzer (`src/parsers/syntaxAnalyzer.ts`)

Analyze C# syntax to determine Serilog contexts:

#### Key Functions:
1. **`isSerilogCall(line: string): boolean`**
   - Detect Serilog method patterns
   - Support various logger variable names
   - Handle static and instance calls

2. **`findStringLiteralsInRange(document: TextDocument, range: Range): StringLiteral[]`**
   - Find all string literals in a range
   - Detect string type (regular/verbatim/raw)
   - Handle concatenated strings
   - Track string boundaries

3. **`getTemplateContext(document: TextDocument, position: Position): TemplateContext`**
   - Determine if position is in a Serilog template
   - Identify expression context (filter/template/computed)
   - Handle nested method calls

#### String Literal Detection:
- Regular strings: `"text"`
- Verbatim strings: `@"text"`
- Raw strings: `"""text"""` (C# 11+)
- Concatenated strings: `"part1" + "part2"`
- Interpolated strings: `$"text"` (should NOT be highlighted)

### 6. Diagnostics Provider (`src/providers/diagnosticsProvider.ts`)

Provide real-time error detection and warnings:

#### Diagnostic Rules:
1. **Errors**:
   - Unclosed braces
   - Mismatched brace pairs
   - Invalid format specifiers
   - Syntax errors in expressions
   - Duplicate property names in same template

2. **Warnings**:
   - Property/argument count mismatch
   - Unused properties
   - Deprecated syntax patterns
   - Performance suggestions (e.g., excessive destructuring)

3. **Information**:
   - Suggest using destructuring for complex objects
   - Recommend format specifiers for dates/numbers
   - Suggest expression templates for complex logic

#### Implementation Details:
- Use VS Code's diagnostic collection API
- Update diagnostics on document change
- Provide quick fixes where applicable
- Support configurable severity levels
- Clear diagnostics when issues are resolved

### 7. Completion Provider (`src/providers/completionProvider.ts`)

Implement IntelliSense for Serilog templates:

#### Completion Contexts:
1. **Inside Braces `{|}`**:
   - Suggest property names from current scope
   - Offer destructuring/stringification operators
   - Show recently used properties

2. **After Colon `{Property:|}`**:
   - Date/time format specifiers
   - Numeric format specifiers
   - Custom format patterns

3. **After Comma `{Property,|}`**:
   - Alignment suggestions
   - Common alignment values

4. **Expression Context**:
   - Function names
   - Operators
   - Built-in properties
   - Keywords

#### Implementation Requirements:
- Context-aware suggestions
- Include documentation for each item
- Sort by relevance
- Support snippet completions
- Cache common patterns

### 8. Hover Provider (`src/providers/hoverProvider.ts`)

Show information on hover:

#### Hover Information:
1. **Properties**: Show property name, type if known, usage count
2. **Operators**: Explain destructuring (@) and stringification ($)
3. **Format Specifiers**: Show example output
4. **Expressions**: Display function signatures
5. **Directives**: Explain template directives

### 9. Cache Manager (`src/utils/cacheManager.ts`)

Implement efficient caching using LRU cache:

```typescript
class CacheManager {
  private templateCache: LRUCache<string, ParsedTemplate>;
  private diagnosticCache: Map<string, Diagnostic[]>;
  private documentVersions: Map<string, number>;
  
  // Methods:
  // - getCachedTemplate(key: string): ParsedTemplate | undefined
  // - setCachedTemplate(key: string, template: ParsedTemplate): void
  // - invalidateDocument(uri: string): void
  // - invalidateRange(uri: string, range: Range): void
  // - clear(): void
}
```

### 10. Serilog Call Detector (`src/utils/serilogCallDetector.ts`)

Detect Serilog method calls efficiently:

#### Detection Patterns:
```typescript
// Static calls
Log.Information("...");
Log.Debug("...");
Log.Error("...");

// Instance calls  
_logger.LogInformation("...");
logger.LogDebug("...");

// Contextual loggers
Log.ForContext<T>().Information("...");

// Configuration
.WriteTo.Console(outputTemplate: "...");

// Expressions
.Filter.ByExcluding("...");
.Enrich.WithComputed("prop", "expression");
```

### 11. Theme Manager (`src/utils/themeManager.ts`)

Handle theme-aware colors:

#### Requirements:
- Detect current theme (dark/light/high-contrast)
- Provide WCAG AA compliant colors
- Support user color customization
- Cache color calculations
- Update on theme change

### 12. Bracket Decorator (`src/decorators/bracketDecorator.ts`)

Highlight matching brackets:

#### Features:
- Highlight matching brace pairs on cursor position
- Support nested braces
- Handle multi-line templates
- Show mismatched braces in different color
- Clear decoration on cursor move

### 13. TextMate Grammar (`syntaxes/serilog.injection.json`)

Create injection grammar for basic syntax highlighting:

```json
{
  "scopeName": "source.serilog",
  "injectionSelector": "L:string.quoted.double.cs, L:string.quoted.single.cs",
  "patterns": [
    {
      "name": "meta.template.serilog",
      "begin": "(?=\\{[@$]?[A-Za-z_])",
      "end": "(?<=\\})",
      "patterns": [
        {
          "name": "meta.property.serilog",
          "match": "\\{([@$])?([A-Za-z_][A-Za-z0-9_]*)(:[^}]+)?(,[+-]?\\d+)?\\}",
          "captures": {
            "1": { "name": "keyword.operator.serilog" },
            "2": { "name": "variable.other.property.serilog" },
            "3": { "name": "string.unquoted.format.serilog" },
            "4": { "name": "constant.numeric.alignment.serilog" }
          }
        }
      ]
    }
  ]
}
```

## Configuration Schema

### Package.json Contributions

```json
{
  "contributes": {
    "configuration": {
      "title": "Serilog Syntax",
      "properties": {
        "serilog-syntax.highlighting.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Serilog syntax highlighting"
        },
        "serilog-syntax.diagnostics.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable diagnostics for Serilog templates"
        },
        "serilog-syntax.diagnostics.argumentMismatch": {
          "type": "string",
          "enum": ["error", "warning", "information", "none"],
          "default": "warning",
          "description": "Severity for property/argument count mismatch"
        },
        "serilog-syntax.completion.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable IntelliSense for Serilog templates"
        },
        "serilog-syntax.completion.includeFormatSpecifiers": {
          "type": "boolean",
          "default": true,
          "description": "Include format specifier suggestions"
        },
        "serilog-syntax.bracketMatching.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable bracket matching in templates"
        },
        "serilog-syntax.performance.maxCacheSize": {
          "type": "number",
          "default": 100,
          "minimum": 10,
          "maximum": 1000,
          "description": "Maximum number of cached parse results"
        },
        "serilog-syntax.colors.useThemeColors": {
          "type": "boolean",
          "default": true,
          "description": "Use theme-aware colors"
        }
      }
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests

Create comprehensive unit tests for each parser:

#### Template Parser Tests:
- Valid templates with all features
- Invalid templates (malformed)
- Edge cases (empty, very long, special characters)
- Performance tests with large templates

#### Expression Parser Tests:
- All operator types
- Function calls with various parameters
- Complex nested expressions
- Invalid syntax handling

### 2. Integration Tests

Test the providers with real VS Code APIs:

#### Semantic Tokens Tests:
- Verify correct token generation
- Test incremental updates
- Multi-line string handling
- Performance with large files

#### Diagnostics Tests:
- Error detection accuracy
- Warning conditions
- Quick fix suggestions
- Real-time update performance

### 3. End-to-End Tests

Create sample C# files with various Serilog patterns:
- Basic logging calls
- Complex templates
- Expression filters
- Configuration scenarios
- Multi-line templates
- Edge cases

## Performance Optimizations

### 1. Parsing Optimization
- Cache parsed templates aggressively
- Use incremental parsing where possible
- Implement early exit conditions
- Batch updates to reduce overhead

### 2. Memory Management
- Implement LRU cache with size limits
- Clear caches on configuration change
- Dispose resources properly
- Monitor memory usage in tests

### 3. Responsiveness
- Use async/await for long operations
- Implement cancellation tokens
- Debounce rapid changes
- Provide progress indicators

## Error Handling

### Robust Error Handling Strategy:
1. Never crash the extension
2. Log errors to output channel
3. Provide fallback behavior
4. Show user-friendly error messages
5. Include error recovery mechanisms

### Logging:
Create a dedicated output channel for debugging:
```typescript
const outputChannel = vscode.window.createOutputChannel('Serilog Syntax');
```

## Deployment Preparation

### 1. Build Configuration

Configure webpack for production builds:
- Minimize bundle size
- Tree-shake unused code
- Externalize VS Code API
- Source map generation for debugging

### 2. Publishing Preparation

#### Files to include:
- Compiled JavaScript
- Grammar files
- README with examples
- CHANGELOG
- LICENSE

#### Files to exclude (.vscodeignore):
- Source TypeScript files
- Test files
- Development configurations
- Node_modules (except required runtime deps)

### 3. Marketplace Requirements

#### package.json metadata:
```json
{
  "publisher": "your-publisher-id",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/serilog-syntax-vscode"
  },
  "bugs": {
    "url": "https://github.com/yourusername/serilog-syntax-vscode/issues"
  },
  "categories": ["Programming Languages", "Linters", "Snippets"],
  "keywords": ["serilog", "logging", "csharp", "dotnet", "syntax highlighting"],
  "icon": "images/icon.png",
  "galleryBanner": {
    "color": "#007ACC",
    "theme": "dark"
  }
}
```

## Implementation Order

Recommended implementation sequence:

1. **Phase 1 - Core Parsing**:
   - Template parser
   - Basic Serilog call detection
   - String literal detection

2. **Phase 2 - Basic Highlighting**:
   - Semantic tokens provider
   - TextMate grammar
   - Basic theme support

3. **Phase 3 - Advanced Parsing**:
   - Expression parser
   - Syntax analyzer
   - Multi-line string support

4. **Phase 4 - Diagnostics**:
   - Diagnostics provider
   - Error detection rules
   - Quick fixes

5. **Phase 5 - IntelliSense**:
   - Completion provider
   - Hover provider
   - Signature help

6. **Phase 6 - Enhancements**:
   - Bracket matching
   - Code lens
   - Definition provider

7. **Phase 7 - Optimization**:
   - Performance tuning
   - Cache implementation
   - Memory optimization

8. **Phase 8 - Polish**:
   - Comprehensive testing
   - Documentation
   - Example files

## Success Criteria

The extension is complete when:

1. **Functionality**:
   - All Serilog template syntax is highlighted
   - Expression syntax is fully supported
   - Diagnostics catch common errors
   - IntelliSense provides helpful suggestions

2. **Performance**:
   - Highlights appear within 100ms
   - No noticeable lag on large files
   - Memory usage under 50MB
   - Handles 1000+ line files smoothly

3. **Quality**:
   - 80%+ test coverage
   - No critical bugs
   - Handles edge cases gracefully
   - Clear error messages

4. **User Experience**:
   - Intuitive default settings
   - Good documentation
   - Example templates included
   - Responsive to theme changes

This comprehensive guide provides all the necessary details for implementing a production-ready VS Code extension for Serilog syntax highlighting. Follow the implementation order and ensure each component meets the specified requirements.