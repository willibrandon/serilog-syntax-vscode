# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension project for Serilog syntax highlighting that provides decoration-based highlighting for Serilog message templates and Serilog.Expressions in C#/.NET projects.

**Current Status**: Fully implemented with decoration-based highlighting, comprehensive parsers, caching, theme management, and testing infrastructure.

## Architecture

The extension follows a modular architecture designed for performance and maintainability:

### Core Modules (implemented)

1. **Parsers** (`src/parsers/`) ✅
   - `templateParser.ts` - Parses Serilog message templates (properties, destructuring, format specifiers)
   - `expressionParser.ts` - Handles Serilog.Expressions syntax (operators, functions, directives)
   - `expressionTokenizer.ts` - Tokenizes Serilog.Expressions syntax
   - `stringLiteralParser.ts` - Detects C# string literals (regular, verbatim, raw)

2. **Providers** (`src/providers/`) ✅
   - `navigationProvider.ts` - Code actions for navigating from properties to arguments
   - `propertyArgumentHighlighter.ts` - Highlights template properties and their corresponding arguments

3. **Decorations** (`src/decorations/`) ✅
   - `decorationManager.ts` - Manages text decorations for highlighting (replaces semantic tokens)

4. **Utilities** (`src/utils/`) ✅
   - `serilogCallDetector.ts` - Identifies Serilog method calls in C# code
   - `cacheManager.ts` - LRU cache for parsed templates (max 100 entries)
   - `themeManager.ts` - Theme-aware color management
   - `debouncer.ts` - Debounces updates for performance

### Key Design Decisions

- **Activation**: On startup for C# language files
- **Performance**: Uses incremental parsing, caching, and debouncing for large files
- **Highlighting**: Decoration-based approach for full control over appearance and theme integration
- **String Detection**: Comprehensive detection of regular, verbatim, and raw string literals
- **Architecture**: Modular design with separated concerns (parsers, decorations, utilities)

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

## Implementation Status

### ✅ Completed
- **Project Setup**: package.json, TypeScript config, webpack bundling, extension entry point
- **Core Parsing**: Template parser, expression parser & tokenizer, string literal parser, Serilog call detector
- **Decoration-based Highlighting**: Full highlighting system with decoration manager
- **Performance Optimization**: Caching system, debouncing, LRU cache for templates
- **Theme Management**: Automatic theme detection and WCAG AA compliant colors
- **Testing Infrastructure**: Jest setup with comprehensive test coverage
- **Configuration**: Extensive user customization options
- **Property-Argument Highlighting**: Cursor-based highlighting showing connection between properties and arguments
- **Navigation Provider**: Code actions to jump from properties to their arguments

### 🚫 Not Implemented (by design)
- **Semantic Tokens Provider**: Replaced with decoration-based approach for better control
- **Diagnostics Provider**: Not included in initial release (following reference extension)
- **IntelliSense/Completion**: Not included in initial release (following reference extension)

## Testing Strategy

Tests should cover:
- **Template parsing**: All Serilog syntax variations
- **Expression parsing**: Operators, functions, directives
- **String detection**: Regular, verbatim, raw, concatenated strings
- **Performance**: Large files (10K+ lines) under 1 second
- **Memory**: Cache eviction and no memory leaks

Test coverage includes unit tests, integration tests, and comprehensive real-world scenarios.

## Important Notes

1. ✅ Project is fully implemented and functional
2. ✅ Uses VS Code extension API patterns (not Visual Studio patterns)
3. ✅ Uses decoration-based highlighting (not semantic tokens) for better control
4. ✅ WCAG AA compliant theme colors with automatic theme detection
5. ✅ Targets VS Code ^1.74.0 for compatibility
6. ✅ Comprehensive test coverage with Jest
7. ✅ Performance optimized with caching and debouncing