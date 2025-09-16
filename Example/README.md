# Serilog Syntax Example

This is a standalone console application that demonstrates all the features of the Serilog Syntax Highlighting extension for Visual Studio.

## Running the Example

1. **Prerequisites**: Ensure you have .NET 8.0 SDK installed
2. **Build and Run**:
   ```bash
   cd Example
   dotnet run
   ```

## What This Example Demonstrates

### Basic Property Logging
- Simple property substitution: `{UserId}`, `{UserName}`
- Multiple properties in one message
- Different log levels (Debug, Information, Warning, Error)

### Destructuring & Stringification
- **Destructuring with `@`**: `{@User}` - Captures object structure
- **Stringification with `$`**: `{$Settings}` - Forces string representation
- Complex object logging with nested properties

### Formatting Features
- **Date/Time formatting**: `{Timestamp:yyyy-MM-dd HH:mm:ss}`
- **Numeric formatting**: `{Price:C}`, `{Rate:P2}`
- **Alignment**: `{Name,10}`, `{Price,8:C}`
- **Combined formatting**: `{Price,8:C2}`

### Verbatim String Support
- **Multi-line templates**: Properties highlighted across all lines in `@"..."` strings
- **Escaped quotes**: Proper handling of `""` in verbatim strings
- **Complex formatting**: Format specifiers and alignment work in verbatim strings
- **Mixed content**: Verbatim strings with positional parameters and operators

### Raw String Literal Support (C# 11)
- **Triple-quote strings**: Properties highlighted in `"""..."""` strings
- **Multi-line raw strings**: No escape sequences needed
- **Custom delimiters**: Support for 4+ quotes for complex scenarios

### Serilog.Expressions
- **Filter expressions**: `Filter.ByExcluding("RequestPath like '/health%'")`
- **Conditional expressions**: `Filter.ByIncludingOnly("Level = 'Error' or StatusCode >= 500")`
- **Computed properties**: `Enrich.WithComputed("ResponseTime", "Elapsed * 2")`
- **Expression templates** with control flow:
  - `{#if}`, `{#else}`, `{#end}` for conditional rendering
  - `{#each}` for iteration over collections
  - Built-in properties: `@t`, `@m`, `@l`, `@x`, `@i`, `@p`
- **Operators**: `and`, `or`, `not`, `like`, `in`, `is null`, `=`, `<>`, `>`, `<`, `>=`, `<=`
- **Functions**: `StartsWith()`, `EndsWith()`, `Contains()`, `Length()`, `Has()`
- **Property paths**: `User.Name`, `Order.Customer.Address.City`

### Configuration Templates
- **Output templates** in Serilog configuration
- File sink templates with custom formatting
- Bootstrap logger configuration

### Error Handling
- Exception logging with structured properties
- Legacy positional parameters: `{0}`, `{1}`
- Context-aware error messages

### Performance Logging
- Timing and metrics capture
- Structured performance data with `@`
- Scoped logging with `BeginScope`

## Testing the Extension

Open `Program.cs` in Visual Studio with the Serilog Syntax extension installed to see:

### Message Template Highlighting (Dark Theme)
- **Light blue** `{` `}` braces around properties (`#98CFDF`)
- **Blue** property names (`#569CD6`)
- **Orange/coral** destructuring `@` operator (`#FF8C64`)
- **Red/orange** stringification `$` operator (`#FF6464`)
- **Green** format specifiers like `:yyyy-MM-dd` (`#8CCB80`)
- **Light red** alignment specifiers like `,10` (`#F87171`)
- **Light blue** positional indices `{0}`, `{1}` (`#AAE3FF`)

### Expression Syntax Highlighting (Dark Theme)
- **Light red** for expression operators (`and`, `or`, `not`, `like`, `in`) (`#FF7B72`)
- **Purple** for expression functions (`StartsWith()`, `Contains()`, etc.) (`#C896FF`)
- **Light purple** for built-in properties (`@t`, `@m`, `@l`) (`#DCB4FF`)
- **Pink** for expression directives (`{#if}`, `{#each}`, `{#end}`) (`#F078B4`)
- **Cyan** for string literals in expressions (`#64C8C8`)
- **Light green** for numeric literals (`#B5CEA8`)
- **Blue** for expression keywords (`null`, `true`, `false`) (`#569CD6`)
- **Light cyan** for identifiers/property names in expressions (`#9CDCFE`)

### Light Theme Colors
Colors automatically adapt for light themes with WCAG AA compliant contrast ratios - darker variants of the same color families for optimal readability on light backgrounds.

### Interactive Features
- **Brace matching** when cursor is on `{` or `}`
- **Light bulb navigation** from properties to arguments
- **Immediate highlighting** as you type (before closing quotes)
- **Multi-line support** for verbatim and raw strings

## Output

The example creates both console output and log files in the `logs/` directory, demonstrating real Serilog usage while showcasing all the syntax highlighting features.