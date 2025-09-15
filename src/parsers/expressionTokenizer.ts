export enum TokenType {
    Identifier,
    StringLiteral,
    NumberLiteral,
    ComparisonOperator,
    LogicalOperator,
    ArithmeticOperator,
    Directive,
    BuiltInProperty,
    Function,
    Punctuation,
    FormatSpecifier,
    Unknown
}

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
}

export class ExpressionTokenizer {
    private template: string;
    private position: number = 0;
    private tokens: Token[] = [];
    private inTemplateMode: boolean = false;

    constructor(template: string) {
        this.template = template;
    }

    tokenize(): Token[] {
        this.position = 0;
        this.tokens = [];

        while (this.position < this.template.length) {
            // Skip whitespace but not escape sequences
            this.skipWhitespace();
            if (this.position >= this.template.length) break;

            const char = this.template[this.position];

            // Skip escape sequences - they're part of the C# string, not the expression
            if (char === '\\' && this.position + 1 < this.template.length) {
                this.position += 2; // Skip escape sequence
                continue;
            }

            if (char === '{') {
                if (this.position + 1 < this.template.length && this.template[this.position + 1] === '#') {
                    this.inTemplateMode = false; // Entering a directive
                    this.readDirective();
                } else if (this.position + 1 < this.template.length && this.template[this.position + 1] === '@') {
                    // Template property like {@m} or {@x}
                    this.readTemplateBuiltInProperty();
                } else if (this.position + 1 < this.template.length && this.template[this.position + 1] === '$') {
                    // Stringified property like {$Version}
                    this.readTemplateProperty('stringify');
                } else if (this.position + 1 < this.template.length && /[A-Za-z0-9]/.test(this.template[this.position + 1])) {
                    // Check if this is actually a template property or just an expression in braces
                    // Template properties are simple identifiers followed by optional format/alignment and }
                    // If we see a function call pattern, it's an expression, not a property
                    let isTemplateProperty = true;
                    let lookahead = this.position + 1;

                    // Skip the identifier part
                    while (lookahead < this.template.length && /[A-Za-z0-9_]/.test(this.template[lookahead])) {
                        lookahead++;
                    }

                    // Skip whitespace
                    while (lookahead < this.template.length && /\s/.test(this.template[lookahead])) {
                        lookahead++;
                    }

                    // If we see a '(' it's a function call, not a template property
                    if (lookahead < this.template.length && this.template[lookahead] === '(') {
                        isTemplateProperty = false;
                    }

                    if (isTemplateProperty) {
                        // It's a simple template property like {Property} or {0}
                        this.readTemplateProperty('standard');
                    } else {
                        // It's an expression in braces, just add the opening brace
                        this.tokens.push({
                            type: TokenType.Punctuation,
                            value: '{',
                            start: this.position,
                            end: this.position + 1
                        });
                        this.position++;
                    }
                } else {
                    // Just a brace
                    this.tokens.push({
                        type: TokenType.Punctuation,
                        value: char,
                        start: this.position,
                        end: this.position + 1
                    });
                    this.position++;
                }
            } else if (char === '@') {
                this.readBuiltInProperty();
            } else if (char === '\'' || char === '"') {
                this.readStringLiteral();
            } else if (this.isDigit(char)) {
                this.readNumberLiteral();
            } else if (this.isIdentifierStart(char)) {
                this.readIdentifierOrKeyword();
            } else if (this.isOperatorStart(char)) {
                // Only tokenize operators if we're not in template mode
                if (!this.inTemplateMode) {
                    this.readOperator();
                } else {
                    // In template mode, '=' is just literal text
                    this.position++;
                }
            } else if ('(){},.;:'.includes(char)) {
                this.tokens.push({
                    type: TokenType.Punctuation,
                    value: char,
                    start: this.position,
                    end: this.position + 1
                });
                this.position++;
            } else if (char === '[' || char === ']') {
                // Brackets are complex - they could be:
                // 1. Part of property access like @p['key'] or Items[0]
                // 2. Literal text like [ERROR]
                // 3. Container for expressions like [{Substring(...)}]

                if (char === '[') {
                    // Look at what's before and after
                    const beforeBracket = this.position > 0 ? this.template[this.position - 1] : '';
                    const afterBracket = this.position + 1 < this.template.length ? this.template[this.position + 1] : '';

                    // Check if it's property/array access
                    if (beforeBracket === 'p' || beforeBracket === ']' || /[a-zA-Z0-9_]/.test(beforeBracket)) {
                        // It's property/array access
                        this.tokens.push({
                            type: TokenType.Punctuation,
                            value: char,
                            start: this.position,
                            end: this.position + 1
                        });
                        this.position++;
                    } else if (afterBracket === '{') {
                        // It's a container for an expression like [{...}]
                        // Skip the bracket - it's just literal text
                        this.position++;
                    } else {
                        // It's literal text like [ERROR]
                        this.skipLiteralText();
                    }
                } else { // char === ']'
                    if (this.isInsidePropertyAccess()) {
                        // It's closing a property access
                        this.tokens.push({
                            type: TokenType.Punctuation,
                            value: char,
                            start: this.position,
                            end: this.position + 1
                        });
                        this.position++;
                    } else {
                        // It's just a literal bracket
                        this.position++;
                    }
                }
            } else {
                // Skip any other characters (plain text between directives)
                this.position++;
            }
        }

        return this.tokens;
    }

    private skipWhitespace(): void {
        while (this.position < this.template.length && /\s/.test(this.template[this.position])) {
            this.position++;
        }
    }

    private readDirective(): void {
        const start = this.position;

        // Add opening brace as punctuation
        this.tokens.push({
            type: TokenType.Punctuation,
            value: '{',
            start: this.position,
            end: this.position + 1
        });

        this.position++; // Skip '{'
        const directiveStart = this.position;
        this.position++; // Skip '#'

        // Read directive name
        let directiveName = '';
        while (this.position < this.template.length && /[a-z]/i.test(this.template[this.position])) {
            directiveName += this.template[this.position];
            this.position++;
        }

        // Add the directive token (just #keyword, no braces)
        this.tokens.push({
            type: TokenType.Directive,
            value: '#' + directiveName,
            start: directiveStart,
            end: this.position
        });

        // Special handling for simple directives like {#end}, {#else}, or {#delimit}
        if ((directiveName === 'end' || directiveName === 'else' || directiveName === 'delimit') &&
            this.position < this.template.length && this.template[this.position] === '}') {
            // Add closing brace as punctuation
            this.tokens.push({
                type: TokenType.Punctuation,
                value: '}',
                start: this.position,
                end: this.position + 1
            });
            this.position++; // Skip closing brace
            return;
        }

        // For directives with expressions, tokenize the expression part
        this.skipWhitespace();

        // Save the closing brace position
        let bracePos = this.position;
        let depth = 1;
        while (bracePos < this.template.length && depth > 0) {
            if (this.template[bracePos] === '{') depth++;
            else if (this.template[bracePos] === '}') {
                depth--;
                if (depth === 0) break;
            }
            bracePos++;
        }

        // Tokenize the expression content between directive and closing brace
        const savedEnd = this.template;
        const expressionContent = this.template.substring(this.position, bracePos);
        if (expressionContent.trim()) {
            // Temporarily process the expression content
            const savedPos = this.position;
            const endPos = bracePos;

            // Continue tokenizing until we reach the closing brace
            while (this.position < endPos) {
                this.skipWhitespace();
                if (this.position >= endPos) break;

                const char = this.template[this.position];

                if (char === '@') {
                    // Built-in property inside directive
                    this.readBuiltInProperty();
                } else if (char === '\'' || char === '"') {
                    this.readStringLiteral();
                } else if (this.isDigit(char)) {
                    this.readNumberLiteral();
                } else if (this.isIdentifierStart(char)) {
                    this.readIdentifierOrKeyword();
                } else if (this.isOperatorStart(char)) {
                    this.readOperator();
                } else if ('()[],.;:'.includes(char)) {
                    this.tokens.push({
                        type: TokenType.Punctuation,
                        value: char,
                        start: this.position,
                        end: this.position + 1
                    });
                    this.position++;
                } else if (char === '}') {
                    break; // Stop at closing brace
                } else {
                    this.position++;
                }
            }
        }

        // Add the closing brace as punctuation if found
        if (bracePos < this.template.length && this.template[bracePos] === '}') {
            this.tokens.push({
                type: TokenType.Punctuation,
                value: '}',
                start: bracePos,
                end: bracePos + 1
            });
        }

        // Move to after the closing brace
        this.position = bracePos + 1;

        // After a directive, we're in template mode, not expression mode
        this.inTemplateMode = true;
    }

    private readBuiltInProperty(): void {
        const start = this.position;
        this.position++; // Skip @

        let name = '';
        while (this.position < this.template.length && /[a-z]/i.test(this.template[this.position])) {
            name += this.template[this.position];
            this.position++;
        }

        this.tokens.push({
            type: TokenType.BuiltInProperty,
            value: '@' + name,
            start,
            end: this.position
        });
    }

    private readStringLiteral(): void {
        const start = this.position;
        const quote = this.template[this.position];
        this.position++; // Skip opening quote

        let content = '';
        while (this.position < this.template.length && this.template[this.position] !== quote) {
            if (this.template[this.position] === '\\' && this.position + 1 < this.template.length) {
                this.position++; // Skip escape char
                content += this.template[this.position];
            } else {
                content += this.template[this.position];
            }
            this.position++;
        }

        if (this.position < this.template.length) {
            this.position++; // Skip closing quote
        }

        // Return content without quotes (matching C# implementation)
        this.tokens.push({
            type: TokenType.StringLiteral,
            value: content,
            start,
            end: this.position
        });
    }

    private readNumberLiteral(): void {
        const start = this.position;
        let value = '';

        while (this.position < this.template.length && (this.isDigit(this.template[this.position]) || this.template[this.position] === '.')) {
            value += this.template[this.position];
            this.position++;
        }

        this.tokens.push({
            type: TokenType.NumberLiteral,
            value,
            start,
            end: this.position
        });
    }

    private readIdentifierOrKeyword(): void {
        const start = this.position;
        let value = '';

        while (this.position < this.template.length && this.isIdentifierPart(this.template[this.position])) {
            value += this.template[this.position];
            this.position++;
        }

        // Save the end position of the identifier
        const identifierEnd = this.position;

        // Check if it's a function call
        this.skipWhitespace();
        if (this.position < this.template.length && this.template[this.position] === '(') {
            this.tokens.push({
                type: TokenType.Function,
                value,
                start,
                end: identifierEnd
            });
        } else {
            // Check for logical operators and keywords
            const lowerValue = value.toLowerCase();
            if (['and', 'or', 'not', 'in', 'like', 'is', 'null', 'if', 'then', 'else'].includes(lowerValue)) {
                this.tokens.push({
                    type: TokenType.LogicalOperator,
                    value,
                    start,
                    end: identifierEnd
                });
            } else {
                this.tokens.push({
                    type: TokenType.Identifier,
                    value,
                    start,
                    end: identifierEnd
                });
            }
        }
    }

    private readOperator(): void {
        const start = this.position;
        let value = this.template[this.position];
        this.position++;

        // Check for multi-character operators
        if (this.position < this.template.length) {
            const next = this.template[this.position];
            if ((value === '=' && next === '=') ||
                (value === '!' && next === '=') ||
                (value === '<' && next === '=') ||
                (value === '>' && next === '=') ||
                (value === '<' && next === '>')) {
                value += next;
                this.position++;
            }
        }

        const type = this.getOperatorType(value);
        this.tokens.push({
            type,
            value,
            start,
            end: this.position
        });
    }

    private getOperatorType(op: string): TokenType {
        if (['=', '==', '!=', '<', '>', '<=', '>=', '<>'].includes(op)) {
            return TokenType.ComparisonOperator;
        } else if (['+', '-', '*', '/', '%'].includes(op)) {
            return TokenType.ArithmeticOperator;
        } else {
            return TokenType.Unknown;
        }
    }

    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }

    private isIdentifierStart(char: string): boolean {
        return /[a-zA-Z_]/.test(char);
    }

    private isIdentifierPart(char: string): boolean {
        return /[a-zA-Z0-9_]/.test(char);
    }

    private isOperatorStart(char: string): boolean {
        return '=!<>+-*/%'.includes(char);
    }

    private isInsidePropertyAccess(): boolean {
        // Look back to see if we have an open bracket that suggests property access
        let depth = 0;
        for (let i = this.position - 1; i >= 0; i--) {
            if (this.template[i] === ']') depth++;
            else if (this.template[i] === '[') {
                depth--;
                if (depth < 0) {
                    // Found unmatched open bracket - check what's before it
                    const before = i > 0 ? this.template[i - 1] : '';
                    return before === 'p' || /[a-zA-Z0-9_]/.test(before);
                }
            }
        }
        return false;
    }

    private skipLiteralText(): void {
        // Skip text like [ERROR] that's not part of an expression
        // BUT don't skip if the bracket contains an expression like [{...}]
        const start = this.position;

        // If we're at '[', check if it contains an expression
        if (this.template[this.position] === '[') {
            // Look ahead to see if there's a { before the ]
            let hasExpression = false;
            let i = this.position + 1;
            while (i < this.template.length && this.template[i] !== ']') {
                if (this.template[i] === '{') {
                    hasExpression = true;
                    break;
                }
                i++;
            }

            if (!hasExpression) {
                // It's plain text like [ERROR], skip it
                this.position++;
                while (this.position < this.template.length && this.template[this.position] !== ']') {
                    this.position++;
                }
                if (this.position < this.template.length && this.template[this.position] === ']') {
                    this.position++;
                }
            } else {
                // It contains an expression, just skip the bracket itself
                this.position++;
            }
        } else {
            // Just skip the character
            this.position++;
        }
    }

    private readTemplateBuiltInProperty(): void {
        const start = this.position;

        // Add opening brace as punctuation
        this.tokens.push({
            type: TokenType.Punctuation,
            value: '{',
            start: this.position,
            end: this.position + 1
        });

        this.position++; // Skip {
        const propStart = this.position;
        this.position++; // Skip @

        let name = '';
        while (this.position < this.template.length && /[a-z]/i.test(this.template[this.position])) {
            name += this.template[this.position];
            this.position++;
        }

        // Add the built-in property token (just @property, no braces)
        this.tokens.push({
            type: TokenType.BuiltInProperty,
            value: '@' + name,
            start: propStart,
            end: this.position
        });

        // Check for format specifier
        if (this.position < this.template.length && this.template[this.position] === ':') {
            const formatStart = this.position;
            this.position++; // Skip :
            let formatSpec = ':';

            while (this.position < this.template.length && this.template[this.position] !== '}') {
                formatSpec += this.template[this.position];
                this.position++;
            }

            // Add format specifier token
            this.tokens.push({
                type: TokenType.FormatSpecifier,
                value: formatSpec,
                start: formatStart,
                end: this.position
            });
        }

        if (this.position < this.template.length && this.template[this.position] === '}') {
            // Add closing brace as punctuation
            this.tokens.push({
                type: TokenType.Punctuation,
                value: '}',
                start: this.position,
                end: this.position + 1
            });
            this.position++; // Skip }
        }
    }

    private readTemplateProperty(propertyType: string): void {
        const start = this.position;

        // Add opening brace as punctuation
        this.tokens.push({
            type: TokenType.Punctuation,
            value: '{',
            start: this.position,
            end: this.position + 1
        });

        this.position++; // Skip {
        let propStart = this.position;

        if (propertyType === 'stringify') {
            // Add $ as part of the property
            propStart = this.position;
            this.position++; // Skip $
        }

        let name = '';
        const nameStart = this.position;
        while (this.position < this.template.length && /[A-Za-z0-9_]/.test(this.template[this.position])) {
            name += this.template[this.position];
            this.position++;
        }

        // Add the property token
        this.tokens.push({
            type: TokenType.Identifier,
            value: (propertyType === 'stringify' ? '$' : '') + name,
            start: propertyType === 'stringify' ? propStart : nameStart,
            end: this.position
        });

        // Handle optional alignment and format specifier
        if (this.position < this.template.length && (this.template[this.position] === ',' || this.template[this.position] === ':')) {
            const formatStart = this.position;
            let formatContent = '';
            while (this.position < this.template.length && this.template[this.position] !== '}') {
                formatContent += this.template[this.position];
                this.position++;
            }
            // Add format/alignment as a separate token
            if (formatContent) {
                this.tokens.push({
                    type: TokenType.FormatSpecifier,
                    value: formatContent,
                    start: formatStart,
                    end: this.position
                });
            }
        }

        // Add closing brace as punctuation
        if (this.position < this.template.length && this.template[this.position] === '}') {
            this.tokens.push({
                type: TokenType.Punctuation,
                value: '}',
                start: this.position,
                end: this.position + 1
            });
            this.position++; // Skip }
        }
    }
}