# Serilog Syntax Highlighting for VS Code

A Visual Studio Code extension that provides syntax highlighting and enhanced support for Serilog message templates and Serilog.Expressions in C#/.NET projects.

## Features

### 🎨 Syntax Highlighting

#### Message Templates
- **Property names** highlighted in theme-appropriate blue: `{UserId}`, `{UserName}`
- **Destructuring operator** `@` highlighted in warm orange/red: `{@User}`
- **Stringification operator** `$` highlighted in warm orange/red: `{$Settings}`
- **Format specifiers** highlighted in green: `{Timestamp:yyyy-MM-dd}`
- **Alignment** highlighted in red: `{Name,10}`, `{Price,-8}`
- **Positional parameters** highlighted in purple: `{0}`, `{1}`
- **Property braces** highlighted for structure
- **Multi-line verbatim strings** fully supported with proper highlighting across lines
- **C# 11 raw string literals** supported with `"""` delimiters for complex templates
- **Automatic theme adaptation** - All colors automatically adjust for Light/Dark themes

#### Serilog.Expressions
- **Filter expressions** in `Filter.ByExcluding()` and `Filter.ByIncludingOnly()`
- **Expression templates** with control flow directives
- **Operators** highlighted in red: `and`, `or`, `not`, `like`, `in`, `is null`
- **Functions** highlighted in purple: `StartsWith()`, `Contains()`, `Length()`, etc.
- **Keywords** highlighted in blue: conditional and control flow keywords
- **Literals** highlighted in cyan/teal: strings, numbers, booleans, null
- **Directives** highlighted in magenta: `{#if}`, `{#each}`, `{#else}`, `{#end}`
- **Built-in properties** highlighted in teal: `@t`, `@m`, `@l`, `@x`, `@i`, `@p`
- **Theme-aware colors** - All expression elements adapt to Light/Dark themes

### 🔗 Smart Detection
- Works with any logger variable name (not just `_logger` or `log`)
- Supports both direct Serilog calls: `Log.Information(...)`
- Supports Microsoft.Extensions.Logging integration: `_logger.LogInformation(...)`
- Supports `BeginScope` for scoped logging: `logger.BeginScope("Operation={Id}", operationId)`
- Supports `LogError` with exception parameter: `logger.LogError(ex, "Error: {Message}", msg)`
- Recognizes configuration templates: `outputTemplate: "[{Timestamp:HH:mm:ss}...]"`

### ⚡ Real-time Highlighting
- Immediate visual feedback as you type
- Highlighting appears as soon as you close braces `}` (doesn't wait for closing quotes)
- Supports incomplete strings during editing

## Installation

### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions view
3. Search for "Serilog Syntax Highlighting"
4. Click **Install**

### From VSIX File
1. Download the latest `.vsix` file from the [releases page](../../releases)
2. In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open Command Palette
3. Type "Extensions: Install from VSIX..." and select it
4. Choose the downloaded `.vsix` file

## Configuration

The extension provides extensive customization options. Open VS Code Settings (`Ctrl+,` or `Cmd+,`) and search for "serilog" to see all available options:

### Basic Settings
- `serilog.enabled` - Enable/disable Serilog syntax highlighting

### Color Customization
- `serilog.colors.property` - Color for property names (e.g., `{Property}`)
- `serilog.colors.destructure` - Color for destructure operator (`@`)
- `serilog.colors.stringify` - Color for stringify operator (`$`)
- `serilog.colors.brace` - Color for braces around properties
- `serilog.colors.format` - Color for format specifiers (e.g., `:yyyy-MM-dd`)
- `serilog.colors.alignment` - Color for alignment specifiers (e.g., `,10`)
- `serilog.colors.positional` - Color for positional parameters (e.g., `{0}`, `{1}`)

### Expression Colors
- `serilog.colors.expression.operator` - Color for expression operators (`and`, `or`, `not`, etc.)
- `serilog.colors.expression.function` - Color for expression functions (`Contains`, `StartsWith`, etc.)
- `serilog.colors.expression.builtin` - Color for built-in properties (`@t`, `@l`, `@m`, etc.)
- `serilog.colors.expression.directive` - Color for directives (`#if`, `#else`, `#each`, etc.)
- `serilog.colors.expression.string` - Color for string literals in expressions
- `serilog.colors.expression.number` - Color for number literals in expressions
- `serilog.colors.expression.keyword` - Color for keywords (`null`, `true`, `false`, etc.)
- `serilog.colors.expression.identifier` - Color for identifiers/property names in expressions

## Getting Started

After installation, the extension works automatically - no configuration required!

1. **Open any C# file** that uses Serilog logging
2. **Start typing** a Serilog log statement:
   ```csharp
   _logger.LogInformation("User {UserId} logged in", userId);
   ```
3. **See instant highlighting** as you type - properties turn blue, operators orange, etc.

### Quick Test
Create a new C# file and paste this to see all features:
```csharp
using Serilog;

Log.Information("User {UserId} logged in with {@Details} at {Timestamp:HH:mm:ss}",
    userId, userDetails, DateTime.Now);
```

You should see:
- `UserId` in blue (adapts to your theme)
- `@` in warm orange/red, `Details` in blue
- `Timestamp` in blue, `:HH:mm:ss` in green
- Colors automatically match your Light/Dark theme preference

## Supported Serilog Syntax

The extension recognizes and highlights all Serilog message template features:

```csharp
// Basic properties
logger.LogInformation("User {UserId} logged in at {LoginTime}", userId, loginTime);

// Destructuring (captures object structure)
logger.LogInformation("Processing user {@User}", user);

// Stringification (forces string representation)
logger.LogInformation("Configuration loaded {$Settings}", settings);

// Format specifiers
logger.LogInformation("Current time: {Timestamp:yyyy-MM-dd HH:mm:ss}", DateTime.Now);

// Alignment
logger.LogInformation("Item: {Name,10} | Price: {Price,8:C}", name, price);

// Positional parameters (legacy support)
logger.LogWarning("Error {0} occurred in {1}", errorCode, methodName);

// Multi-line verbatim strings
logger.LogInformation(@"Processing report:
    User: {UserName}
    Department: {Department}
    Generated: {Timestamp:yyyy-MM-dd}", userName, dept, DateTime.Now);

// C# 11 raw string literals (no escaping needed for quotes)
logger.LogInformation("""
    Processing record:
    ID: {RecordId}
    Status: {Status}
    User: {@User}
    """, recordId, status, user);

// Configuration templates
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}")
    .CreateLogger();

// Serilog.Expressions filter syntax
Log.Logger = new LoggerConfiguration()
    .Filter.ByExcluding("RequestPath like '/health%'")
    .Filter.ByIncludingOnly("Level = 'Error' or StatusCode >= 500")
    .CreateLogger();

// Expression templates with control flow
var expressionTemplate = new ExpressionTemplate(
    "{#if Level = 'Error'}❌{#else}✅{#end} {@m}");

// Computed properties with expressions
.Enrich.WithComputed("ResponseTime", "EndsWith(RequestPath, '.json') ? Elapsed * 2 : Elapsed")
```

## Supported Logger Names

The extension automatically detects Serilog calls regardless of how you name your logger variables:

```csharp
// All of these work automatically
_logger.LogInformation("Message with {Property}", value);
logger.LogDebug("Debug message with {Data}", data);
myCustomLogger.LogWarning("Warning with {Details}", details);
log.LogError("Error with {Context}", context);
```

## Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Serilog: Test Extension** - Verify the extension is working
- **Serilog: Refresh Highlighting** - Refresh syntax highlighting in the current file

## Development

### Prerequisites
- VS Code
- Node.js 18+
- npm

### Building
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Watch mode for development
npm run watch

# Package extension
npm run package
```

### Architecture

The extension uses VS Code's extensibility APIs:

- **TextEditorDecorationType API** - For syntax highlighting via decorations
- **Configuration API** - For user customization settings
- **Theme API** - For automatic theme adaptation

Key components:
- `templateParser.ts` - Parses Serilog message templates
- `expressionParser.ts` & `expressionTokenizer.ts` - Handles Serilog.Expressions syntax
- `stringLiteralParser.ts` - Detects C# string literals (regular, verbatim, raw)
- `serilogDetector.ts` - Identifies Serilog method calls in C# code
- `cacheManager.ts` - LRU cache for parsed templates providing performance optimization
- `themeManager.ts` - Theme-aware color management
- `decorationManager.ts` - Manages text decorations for highlighting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite: `npm test`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.