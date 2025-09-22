# Changelog

All notable changes to the Serilog Syntax Highlighting extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-09-21

### Added
- ESC key handler to temporarily dismiss brace matching and property-argument highlights

## [0.2.0] - 2025-09-21

### Added
- Brace matching provider for Serilog templates with multi-line support
- Visual highlighting for matching braces in message templates and expressions

### Fixed
- Property-argument highlighting now works when LogError has Exception as first parameter
- Multi-line Serilog call detection now correctly excludes string literals from parenthesis counting

## [0.1.0] - 2025-09-20

### Added
- Initial release of Serilog Syntax Highlighting for VS Code
- Template parser for Serilog message templates with property detection
- Expression parser for Serilog.Expressions syntax
- String literal parser supporting regular, verbatim (@"), and raw (""") strings
- Property-argument highlighter showing connections between template properties and their values
- Navigation provider with code actions to jump from properties to arguments
- Decoration manager using VS Code decoration API for syntax highlighting
- Theme manager with dark/light theme color schemes
- Cache manager with LRU eviction (100 entry limit)
- Debouncer utility for performance optimization
- Serilog method call detector for identifying log statements
- Test infrastructure with Jest
- Webpack bundling configuration
- GitHub CI/CD workflows for automated testing and releases

