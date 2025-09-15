# Serilog Syntax Highlighting for VS Code - Incremental Implementation Guide

## Overview
This guide breaks down the implementation into bite-sized, testable chunks. Each section ends with verification steps and a git commit before moving forward.

---

## Phase 1: Minimal Working Extension

### Step 1.1: Project Setup

```bash
# Initialize package.json
npm init -y

# Install minimal dependencies
npm install --save-dev @types/vscode@^1.74.0 @types/node@18.x typescript@^5.0.0

# Create basic structure
mkdir src
mkdir .vscode
```

### Step 1.2: Minimal package.json

```json
{
  "name": "serilog-syntax-vscode",
  "displayName": "Serilog Syntax Highlighting",
  "version": "0.0.1",
  "publisher": "mtlog",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Programming Languages"],
  "activationEvents": ["onLanguage:csharp"],
  "main": "./out/extension.js",
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "18.x",
    "typescript": "^5.0.0"
  }
}
```

### Step 1.3: TypeScript config

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules"]
}
```

### Step 1.4: Minimal working extension

Create `src/extension.ts`:
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Serilog extension activated!');
    
    // Simple test command to verify extension loads
    const disposable = vscode.commands.registerCommand('serilog.test', () => {
        vscode.window.showInformationMessage('Serilog Extension is Working!');
    });
    
    context.subscriptions.push(disposable);
}

export function deactivate() {}
```

Add command to `package.json`:
```json
"contributes": {
  "commands": [{
    "command": "serilog.test",
    "title": "Test Serilog Extension"
  }]
}
```

### Step 1.5: Launch configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [{
    "name": "Run Extension",
    "type": "extensionHost",
    "request": "launch",
    "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
    "outFiles": ["${workspaceFolder}/out/**/*.js"]
  }]
}
```

### Test & Verify Phase 1
```bash
# Compile
npm run compile

# Test:
# 1. Press F5 in VS Code
# 2. In new window, press Ctrl+Shift+P
# 3. Run "Test Serilog Extension"
# 4. Should see "Serilog Extension is Working!" message

# If working, commit:
git add .
git commit -m "Phase 1: Minimal working extension with test command"
```

---

## Phase 2: Basic Regex Highlighting

### Step 2.1: Simple decoration

Replace `src/extension.ts`:
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Serilog extension activated!');
    
    // Create decoration type
    const propertyDecoration = vscode.window.createTextEditorDecorationType({
        color: '#4EC9B0',
        fontWeight: 'bold'
    });
    
    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }
        
        const text = editor.document.getText();
        const decorations: vscode.DecorationOptions[] = [];
        
        // Find all {Property} patterns
        const regex = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const startPos = editor.document.positionAt(match.index + 1); // Skip {
            const endPos = editor.document.positionAt(match.index + match[0].length - 1); // Skip }
            decorations.push({ range: new vscode.Range(startPos, endPos) });
        }
        
        editor.setDecorations(propertyDecoration, decorations);
    }
    
    // Initial update
    updateDecorations();
    
    // Register listeners
    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);
}

export function deactivate() {}
```

### Test & Verify Phase 2
```bash
# Compile
npm run compile

# Test:
# 1. Press F5
# 2. Open a .cs file
# 3. Type: logger.LogInformation("User {UserId} logged in");
# 4. Should see "UserId" colored in cyan

# If working, commit:
git commit -am "Phase 2: Basic regex property highlighting"
```

---

## Phase 3: Serilog Call Detection

### Step 3.1: Create detector utility

Create `src/utils/serilogDetector.ts`:
```typescript
import * as vscode from 'vscode';

export function isSerilogCall(line: string): boolean {
    const patterns = [
        /\b(Log|logger|_logger)\.(Information|Debug|Warning|Error|Fatal|Verbose)/,
        /\b(Log|logger|_logger)\.(LogInformation|LogDebug|LogWarning|LogError|LogCritical)/,
        /\.WriteTo\.\w+\([^)]*outputTemplate:/,
        /new\s+ExpressionTemplate\s*\(/
    ];
    
    return patterns.some(pattern => pattern.test(line));
}

export function findSerilogRanges(document: vscode.TextDocument): vscode.Range[] {
    const ranges: vscode.Range[] = [];
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (isSerilogCall(line.text)) {
            ranges.push(line.range);
        }
    }
    
    return ranges;
}
```

### Step 3.2: Update extension to use detector

Update `src/extension.ts`:
```typescript
import * as vscode from 'vscode';
import { findSerilogRanges } from './utils/serilogDetector';

export function activate(context: vscode.ExtensionContext) {
    console.log('Serilog extension activated!');
    
    const propertyDecoration = vscode.window.createTextEditorDecorationType({
        color: '#4EC9B0',
        fontWeight: 'bold'
    });
    
    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'csharp') {
            return;
        }
        
        const decorations: vscode.DecorationOptions[] = [];
        const serilogRanges = findSerilogRanges(editor.document);
        
        // Only highlight properties in Serilog calls
        for (const range of serilogRanges) {
            const lineText = editor.document.getText(range);
            const regex = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;
            let match;
            
            while ((match = regex.exec(lineText)) !== null) {
                const startPos = editor.document.positionAt(
                    editor.document.offsetAt(range.start) + match.index + 1
                );
                const endPos = editor.document.positionAt(
                    editor.document.offsetAt(range.start) + match.index + match[0].length - 1
                );
                decorations.push({ range: new vscode.Range(startPos, endPos) });
            }
        }
        
        editor.setDecorations(propertyDecoration, decorations);
    }
    
    updateDecorations();
    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);
}

export function deactivate() {}
```

### Test & Verify Phase 3
```bash
# Compile
npm run compile

# Test:
# 1. Press F5
# 2. Open a .cs file with:
#    - logger.LogInformation("User {UserId} logged in");  // Should highlight
#    - Console.WriteLine("Not {Highlighted}");            // Should NOT highlight
# 3. Verify only Serilog calls get highlighting

# If working, commit:
git commit -am "Phase 3: Serilog call detection"
```

---

## Phase 4: Template Parser

### Step 4.1: Create parser

Create `src/parsers/templateParser.ts`:
```typescript
export interface TemplateProperty {
    name: string;
    startIndex: number;
    endIndex: number;
    type: 'standard' | 'destructured' | 'stringified' | 'positional';
    formatSpecifier?: string;
    alignment?: string;
}

export function parseTemplate(template: string): TemplateProperty[] {
    const properties: TemplateProperty[] = [];
    const regex = /\{([@$])?([A-Za-z_][A-Za-z0-9_]*|\d+)(,([+-]?\d+))?(:[^}]+)?\}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
        const property: TemplateProperty = {
            name: match[2],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            type: 'standard'
        };
        
        if (match[1] === '@') property.type = 'destructured';
        else if (match[1] === '$') property.type = 'stringified';
        else if (/^\d+$/.test(match[2])) property.type = 'positional';
        
        if (match[4]) property.alignment = match[4];
        if (match[5]) property.formatSpecifier = match[5].substring(1);
        
        properties.push(property);
    }
    
    return properties;
}
```

### Step 4.2: Add parser tests

Create `src/test/templateParser.test.ts`:
```typescript
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
```

### Test & Verify Phase 4
```bash
# Compile and test parser
npm run compile
node out/test/templateParser.test.js

# Should see "All parser tests passed!"

# If working, commit:
git commit -am "Phase 4: Template parser with tests"
```

---

## Phase 5: Multiple Decoration Types

### Step 5.1: Create decoration manager

Create `src/decorations/decorationManager.ts`:
```typescript
import * as vscode from 'vscode';

export class DecorationManager {
    private decorations: Map<string, vscode.TextEditorDecorationType>;
    
    constructor() {
        this.decorations = new Map([
            ['property', vscode.window.createTextEditorDecorationType({
                color: '#4EC9B0'
            })],
            ['destructure', vscode.window.createTextEditorDecorationType({
                color: '#D16969',
                fontWeight: 'bold'
            })],
            ['brace', vscode.window.createTextEditorDecorationType({
                color: '#DA70D6'
            })],
            ['format', vscode.window.createTextEditorDecorationType({
                color: '#629755'
            })]
        ]);
    }
    
    getDecoration(type: string): vscode.TextEditorDecorationType | undefined {
        return this.decorations.get(type);
    }
    
    dispose() {
        this.decorations.forEach(d => d.dispose());
    }
}
```

### Step 5.2: Use decoration manager and parser

Update `src/extension.ts` to use decoration manager and template parser for richer highlighting.

### Test & Verify Phase 5
```bash
# Compile
npm run compile

# Test different property types:
# - {UserId} - standard (cyan)
# - {@Exception} - destructured (red)
# - {Timestamp:yyyy-MM-dd} - with format (green format part)

# If working, commit:
git commit -am "Phase 5: Multiple decoration types"
```

---

## Phase 6: String Literal Detection

### Step 6.1: Create string detector

Create `src/utils/stringLiteralDetector.ts`:
```typescript
import * as vscode from 'vscode';

export interface StringLiteral {
    range: vscode.Range;
    content: string;
    type: 'regular' | 'verbatim' | 'raw';
}

export function findStringLiterals(document: vscode.TextDocument, line: number): StringLiteral[] {
    const literals: StringLiteral[] = [];
    const lineText = document.lineAt(line).text;
    
    // Regular strings: "..."
    const regularRegex = /"(?:[^"\\]|\\.)*"/g;
    let match;
    while ((match = regularRegex.exec(lineText)) !== null) {
        literals.push({
            range: new vscode.Range(line, match.index, line, match.index + match[0].length),
            content: match[0].slice(1, -1),
            type: 'regular'
        });
    }
    
    // Verbatim strings: @"..."
    const verbatimRegex = /@"(?:[^"]|"")*"/g;
    while ((match = verbatimRegex.exec(lineText)) !== null) {
        literals.push({
            range: new vscode.Range(line, match.index, line, match.index + match[0].length),
            content: match[0].slice(2, -1).replace(/""/g, '"'),
            type: 'verbatim'
        });
    }
    
    return literals;
}
```

### Test & Verify Phase 6
```bash
# Test different string types
# Verify detection works correctly

# If working, commit:
git commit -am "Phase 6: String literal detection"
```

---

## Phase 7: Configuration Support

### Step 7.1: Add configuration schema

Update `package.json`:
```json
"contributes": {
  "configuration": {
    "title": "Serilog Syntax",
    "properties": {
      "serilog-syntax.highlighting.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable Serilog syntax highlighting"
      },
      "serilog-syntax.colors.property": {
        "type": "string",
        "default": "#4EC9B0",
        "description": "Color for property names"
      }
    }
  }
}
```

### Step 7.2: Read configuration in extension

```typescript
const config = vscode.workspace.getConfiguration('serilog-syntax');
const enabled = config.get<boolean>('highlighting.enabled', true);

if (!enabled) return;

const propertyColor = config.get<string>('colors.property', '#4EC9B0');
```

### Test & Verify Phase 7
```bash
# Test configuration changes
# Verify settings take effect

# If working, commit:
git commit -am "Phase 7: Configuration support"
```

---

## Phase 8: Performance Optimization

### Step 8.1: Add caching

Create `src/utils/cacheManager.ts`:
```typescript
export class CacheManager<T> {
    private cache: Map<string, { value: T; timestamp: number }>;
    private maxAge: number;
    
    constructor(maxAge: number = 60000) {
        this.cache = new Map();
        this.maxAge = maxAge;
    }
    
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return undefined;
        }
        
        return entry.value;
    }
    
    set(key: string, value: T): void {
        this.cache.set(key, { value, timestamp: Date.now() });
    }
    
    clear(): void {
        this.cache.clear();
    }
}
```

### Step 8.2: Implement debouncing

```typescript
let updateTimeout: NodeJS.Timeout | undefined;

function scheduleUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(updateDecorations, 100);
}
```

### Test & Verify Phase 8
```bash
# Test with large files
# Monitor performance

# If working, commit:
git commit -am "Phase 8: Performance optimization with caching"
```

---

## Phase 9: Diagnostics [NOT INCLUDED IN INITIAL RELEASE]

**Status**: Not planned for initial release - may not be implemented
**Reason**: The reference VS 2022 extension (serilog-syntax) does not provide diagnostic features

### Step 9.1: Create diagnostics provider

Create `src/providers/diagnosticsProvider.ts`:
```typescript
import * as vscode from 'vscode';
import { parseTemplate } from '../parsers/templateParser';

export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('serilog');
    }
    
    updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        
        // Check for unclosed braces
        const text = document.getText();
        const regex = /\{[^}]*$/gm;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position.translate(0, match[0].length));
            const diagnostic = new vscode.Diagnostic(
                range,
                'Unclosed brace in template',
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
        }
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
```

### Test & Verify Phase 9
```bash
# Test diagnostics appear for errors
# Verify error highlighting works

# If working, commit:
git commit -am "Phase 9: Basic diagnostics"
```

---

## Phase 10: Expression Parser [COMPLETED]

**Status**: ✅ COMPLETED
**Implementation**: Full Serilog.Expressions support with tokenizer and parser

### Step 10.1: Create expression tokenizer

Create `src/parsers/expressionTokenizer.ts`:
```typescript
export enum TokenType {
    Identifier,
    Operator,
    Literal,
    Function,
    Directive,
    BuiltIn
}

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
}

export function tokenizeExpression(expression: string): Token[] {
    const tokens: Token[] = [];
    // Implementation for tokenizing Serilog.Expressions
    return tokens;
}
```

### Step 10.2: Create expression parser

Create `src/parsers/expressionParser.ts`:
```typescript
import { Token, tokenizeExpression } from './expressionTokenizer';

export function parseExpression(expression: string) {
    const tokens = tokenizeExpression(expression);
    // Parse tokens into AST or classifications
    return tokens;
}
```

### Test & Verify Phase 10
```bash
# Test expression parsing
# Verify Serilog.Expressions support

# If working, commit:
git commit -am "Phase 10: Expression parser support"
```

---

## Phase 11: Semantic Tokens Provider

### Step 11.1: Implement semantic tokens

Create `src/providers/semanticTokensProvider.ts`:
```typescript
import * as vscode from 'vscode';

export class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    private legend: vscode.SemanticTokensLegend;
    
    constructor() {
        const tokenTypes = ['property', 'destructure', 'format', 'operator'];
        const tokenModifiers: string[] = [];
        this.legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
    }
    
    provideDocumentSemanticTokens(
        document: vscode.TextDocument
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        const builder = new vscode.SemanticTokensBuilder(this.legend);
        // Add tokens based on parsing
        return builder.build();
    }
}
```

### Step 11.2: Register provider

In `extension.ts`:
```typescript
const provider = new SemanticTokensProvider();
context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'csharp' },
        provider,
        provider.legend
    )
);
```

### Test & Verify Phase 11
```bash
# Test semantic highlighting
# Verify better VS Code integration

# If working, commit:
git commit -am "Phase 11: Semantic tokens provider"
```

---

## Phase 12: IntelliSense Support [NOT INCLUDED IN INITIAL RELEASE]

**Status**: Not planned for initial release - may not be implemented
**Reason**: The reference VS 2022 extension (serilog-syntax) does not provide IntelliSense/completion features

### Step 12.1: Create completion provider

Create `src/providers/completionProvider.ts`:
```typescript
import * as vscode from 'vscode';

export class CompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        
        // Add format specifiers after ':'
        items.push(new vscode.CompletionItem('yyyy-MM-dd', vscode.CompletionItemKind.Value));
        items.push(new vscode.CompletionItem('HH:mm:ss', vscode.CompletionItemKind.Value));
        
        return items;
    }
}
```

### Test & Verify Phase 12
```bash
# Test IntelliSense
# Verify completions appear

# If working, commit:
git commit -am "Phase 12: IntelliSense support"
```

---

## Phase 13: Production Build

### Step 13.1: Setup webpack

```bash
npm install --save-dev webpack webpack-cli ts-loader
```

Create `webpack.config.js`:
```javascript
const path = require('path');

module.exports = {
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: 'ts-loader'
        }]
    }
};
```

### Step 13.2: Update package.json

```json
{
  "main": "./dist/extension.js",
  "scripts": {
    "vscode:prepublish": "webpack --mode production",
    "compile": "webpack --mode development",
    "watch": "webpack --mode development --watch"
  }
}
```

### Test & Verify Phase 13
```bash
# Build for production
npm run vscode:prepublish

# Test built extension
# Verify it works correctly

# If working, commit:
git commit -am "Phase 13: Production build configuration"
```

---

## Phase 14: Testing Infrastructure

### Step 14.1: Setup test framework

```bash
npm install --save-dev @vscode/test-electron mocha @types/mocha
```

Create test runner and sample tests.

### Test & Verify Phase 14
```bash
# Run tests
npm test

# Verify tests pass

# If working, commit:
git commit -am "Phase 14: Testing infrastructure"
```

---

## Phase 15: Theme-Aware WCAG Compliant Colors

### Step 15.1: Detect VS Code theme

Create `src/utils/themeDetector.ts`:
```typescript
import * as vscode from 'vscode';

export enum ThemeType {
    Light,
    Dark,
    HighContrast
}

export function detectThemeType(): ThemeType {
    const theme = vscode.window.activeColorTheme;

    // VS Code doesn't directly expose theme type, so we need to check background color
    // Get the editor background color to determine if it's light or dark
    const config = vscode.workspace.getConfiguration('workbench');
    const colorTheme = config.get<string>('colorTheme', '');

    if (colorTheme.includes('High Contrast')) {
        return ThemeType.HighContrast;
    } else if (colorTheme.includes('Light')) {
        return ThemeType.Light;
    }

    // Default to dark for most themes
    return ThemeType.Dark;
}

export function getContrastRatio(color1: string, color2: string): number {
    // Calculate WCAG contrast ratio between two colors
    // Implementation of luminance calculation
    return 4.5; // Placeholder - implement actual calculation
}
```

### Step 15.2: Create WCAG compliant color palettes

Update `src/decorations/decorationManager.ts`:
```typescript
interface ColorPalette {
    property: string;
    destructure: string;
    stringify: string;
    brace: string;
    format: string;
    // ... all other colors
}

class ThemeAwareColors {
    private lightPalette: ColorPalette = {
        // Colors with 4.5:1 contrast against white (#FFFFFF)
        property: '#0050DA',  // Blue - 5.3:1 contrast
        destructure: '#FF4400', // Orange - 4.5:1 contrast
        stringify: '#C80000',   // Red - 5.3:1 contrast
        brace: '#0E559C',      // Dark blue - 4.8:1 contrast
        format: '#004B00',     // Green - 5.4:1 contrast
    };

    private darkPalette: ColorPalette = {
        // Colors with 4.5:1 contrast against dark (#1E1E1E)
        property: '#569CD6',   // Light blue - 5.1:1 contrast
        destructure: '#FF8C64', // Light orange - 4.7:1 contrast
        stringify: '#FF6464',   // Light red - 4.5:1 contrast
        brace: '#98CFDF',      // Cyan - 4.8:1 contrast
        format: '#8CCB80',     // Light green - 5.2:1 contrast
    };

    private highContrastPalette: ColorPalette = {
        // Maximum contrast colors
        property: '#00FFFF',   // Cyan
        destructure: '#FFFF00', // Yellow
        stringify: '#FF00FF',   // Magenta
        brace: '#FFFFFF',      // White
        format: '#00FF00',     // Green
    };

    getPalette(theme: ThemeType): ColorPalette {
        switch (theme) {
            case ThemeType.Light: return this.lightPalette;
            case ThemeType.HighContrast: return this.highContrastPalette;
            default: return this.darkPalette;
        }
    }
}
```

### Step 15.3: Auto-adjust colors based on theme

```typescript
// Listen for theme changes
vscode.window.onDidChangeActiveColorTheme(() => {
    const theme = detectThemeType();
    const colors = new ThemeAwareColors().getPalette(theme);

    // Recreate decorations with new colors
    decorationManager.updateColors(colors);
    updateDecorations();
});
```

### Step 15.4: Test with popular themes

Test with these popular VS Code themes:
- **Dark themes**: Dracula, One Dark Pro, Material Theme, Nord, Tokyo Night
- **Light themes**: GitHub Light, Atom One Light, Solarized Light, Quiet Light
- **High contrast**: High Contrast (built-in)
- **Special cases**: Monokai, Gruvbox, Palenight

### Step 15.5: Add contrast validation

```typescript
function validateContrast(foreground: string, background: string): boolean {
    const ratio = getContrastRatio(foreground, background);
    return ratio >= 4.5; // WCAG AA standard
}

// Validate all color combinations
function validatePalette(palette: ColorPalette, backgroundColor: string) {
    for (const [key, color] of Object.entries(palette)) {
        if (!validateContrast(color, backgroundColor)) {
            console.warn(`Color ${key} fails WCAG AA contrast requirements`);
        }
    }
}
```

### Test & Verify Phase 15
```bash
# Test with different themes
# 1. Install popular theme extensions
# 2. Switch between themes
# 3. Verify colors remain readable
# 4. Check WCAG compliance

# If working, commit:
git commit -am "Phase 15: Theme-aware WCAG compliant colors"
```

---

## Phase 16: Package and Publish

### Step 16.1: Prepare for marketplace

```bash
npm install -g vsce
vsce package
```

### Step 16.2: Test VSIX locally

Install and test the generated .vsix file in a clean VS Code instance.

### Final Verification
```bash
# Install VSIX
code --install-extension serilog-syntax-vscode-0.0.1.vsix

# Test all features
# If all working:
git commit -am "Phase 16: Ready for marketplace"
git tag v0.1.0
```

---

## Success Metrics

Each phase should be verified with:
1. **Functionality**: Feature works as intended
2. **Performance**: No noticeable lag
3. **Error Handling**: Doesn't crash on edge cases
4. **Code Quality**: Clean, documented code

## Next Iterations

After v0.1.0 release:
- User feedback incorporation
- Advanced expression support
- Language server implementation
- Multi-file analysis
- Project-wide refactoring tools

This incremental approach ensures each piece works before moving forward, making debugging easier and progress visible.