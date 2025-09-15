# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension project for Serilog syntax highlighting that provides semantic highlighting, diagnostics, and IntelliSense for Serilog message templates and Serilog.Expressions in C#/.NET projects.

**Current Status**: Documentation-only. Full implementation required.

## Architecture

The extension follows a modular architecture designed for performance and maintainability:

### Core Modules (to be implemented)

1. **Parsers** (`src/parsers/`)
   - `templateParser.ts` - Parses Serilog message templates (properties, destructuring, format specifiers)
   - `expressionParser.ts` - Handles Serilog.Expressions syntax (operators, functions, directives)
   - `stringLiteralParser.ts` - Detects C# string literals (regular, verbatim, raw)

2. **Providers** (`src/providers/`)
   - `semanticTokensProvider.ts` - Provides VS Code semantic tokens for syntax highlighting
   - `diagnosticsProvider.ts` - Real-time validation and error detection
   - `completionProvider.ts` - IntelliSense for format specifiers and expressions
   - `hoverProvider.ts` - Documentation on hover

3. **Utilities** (`src/utils/`)
   - `serilogCallDetector.ts` - Identifies Serilog method calls in C# code
   - `cacheManager.ts` - LRU cache for parsed templates (max 100 entries)
   - `themeManager.ts` - Theme-aware color management

### Key Design Decisions

- **Activation**: On C# language files (`onLanguage:csharp`)
- **Performance**: Uses incremental parsing and caching to handle large files
- **Integration**: Coordinates with C# extension via semantic tokens
- **String Detection**: Multi-pass approach (regex → AST → context analysis)

## Common Commands

### Initial Setup (first time only)
```bash
# Initialize npm project
npm init -y

# Install VS Code extension dependencies
npm install --save-dev @types/vscode @types/node typescript webpack webpack-cli ts-loader
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
npm install --save-dev @vscode/test-electron jest @types/jest ts-jest

# Install runtime dependencies
npm install lru-cache
```

### Development Commands
```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm run test

# Lint code
npm run lint

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

## Implementation Roadmap

### Phase 1: Project Setup
1. Create `package.json` with VS Code extension manifest
2. Set up TypeScript configuration (`tsconfig.json`)
3. Configure webpack bundling (`webpack.config.js`)
4. Create main extension entry point (`src/extension.ts`)

### Phase 2: Core Parsing
1. Implement `templateParser.ts` for Serilog templates
2. Implement `stringLiteralParser.ts` for C# string detection
3. Implement `serilogCallDetector.ts` for method recognition

### Phase 3: Semantic Highlighting
1. Implement `semanticTokensProvider.ts`
2. Create TextMate grammar injection (`syntaxes/serilog.injection.json`)
3. Register provider in extension activation

### Phase 4: Advanced Features
1. Implement `expressionParser.ts` for Serilog.Expressions
2. Add `diagnosticsProvider.ts` for validation
3. Add `completionProvider.ts` for IntelliSense

### Phase 5: Optimization & Polish
1. Implement `cacheManager.ts` for performance
2. Add comprehensive test suite
3. Performance optimization for large files

## Testing Strategy

Tests should cover:
- **Template parsing**: All Serilog syntax variations
- **Expression parsing**: Operators, functions, directives
- **String detection**: Regular, verbatim, raw, concatenated strings
- **Performance**: Large files (10K+ lines) under 1 second
- **Memory**: Cache eviction and no memory leaks

Use the comprehensive test plan in `docs/test.md` for detailed test cases.

## Documentation References

- **Design Document**: `docs/design.md` - Complete architecture and component design
- **Implementation Guide**: `docs/guide.md` - Detailed implementation instructions
- **Test Plan**: `docs/test.md` - Comprehensive test cases and strategies
- **Configuration**: `docs/config.md` - Missing configuration files and setup

## Important Notes

1. This project requires implementing from scratch - no existing code
2. Follow the VS Code extension API patterns, not Visual Studio patterns
3. Use semantic tokens for highlighting, not decorations
4. Ensure WCAG AA compliance for theme colors
5. Target VS Code ^1.74.0 for compatibility