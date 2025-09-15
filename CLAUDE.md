# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension project for Serilog syntax highlighting. The extension provides syntax highlighting, diagnostics, and IntelliSense for Serilog message templates and Serilog.Expressions in C#/.NET projects.

## Common Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

### Development
```bash
# Run extension in development host
# Press F5 in VS Code or use:
npm run test

# Lint the code
npm run lint

# Package the extension
vsce package

# Publish to marketplace
vsce publish
```

## Architecture

### Core Components

The extension architecture follows the design in `docs/design.md`:

- **Semantic Token Provider**: Provides semantic highlighting for Serilog templates within C# strings
- **Template Parser**: Parses Serilog message templates to identify properties, destructuring operators, format specifiers
- **Expression Parser**: Handles Serilog.Expressions syntax
- **Diagnostics Provider**: Real-time validation of template syntax
- **IntelliSense Provider**: Context-aware completions for format specifiers and expressions

### Key Implementation Areas

1. **String Literal Detection**: Must accurately detect when cursor is inside a Serilog method call string literal
2. **TextMate Grammar Injection**: Injects Serilog syntax highlighting into C# string literals
3. **Performance Optimization**: Uses caching and incremental updates to handle large files efficiently
4. **C# Extension Integration**: Coordinates with the existing C# extension for language features

### Extension Activation

The extension activates on C# files (`onLanguage:csharp`) and provides:
- Semantic tokens for Serilog-specific syntax elements
- Bracket matching and navigation within templates
- Diagnostics for invalid template syntax
- IntelliSense completions for format specifiers and expressions

## Testing Approach

Tests should cover:
- Template parsing accuracy
- Expression syntax validation
- Performance with large files
- Integration with C# language features
- Theme compatibility (dark/light modes)

Run tests with appropriate VS Code extension testing framework commands once implemented.