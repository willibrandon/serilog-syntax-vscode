import { ExpressionParser, ClassifiedRegion } from './expressionParser';

describe('ExpressionParser', () => {
    describe('Built-in Properties', () => {
        it('should parse @t timestamp', () => {
            const parser = new ExpressionParser('@t >= DateTime.Now');
            const result = parser.parse();

            const builtin = result.find(r => r.classificationType === 'builtin');
            expect(builtin).toBeDefined();
            expect(builtin?.startIndex).toBe(0);
            expect(builtin?.endIndex).toBe(2);
        });

        it('should parse all built-in properties', () => {
            const builtins = ['@t', '@l', '@m', '@x', '@p', '@i', '@r'];

            for (const prop of builtins) {
                const parser = new ExpressionParser(`${prop} is not null`);
                const result = parser.parse();
                const builtin = result.find(r => r.classificationType === 'builtin');
                expect(builtin).toBeDefined();
            }
        });
    });

    describe('Operators', () => {
        it('should parse comparison operators', () => {
            const parser = new ExpressionParser('Level >= "Warning"');
            const result = parser.parse();

            const operator = result.find(r => r.classificationType === 'operator');
            expect(operator).toBeDefined();
        });

        it('should parse logical operators', () => {
            const operators = ['and', 'or', 'not'];

            for (const op of operators) {
                const parser = new ExpressionParser(`Status = "Error" ${op} Level = "Critical"`);
                const result = parser.parse();
                const hasOperator = result.some(r => r.classificationType === 'operator');
                expect(hasOperator).toBe(true);
            }
        });

        it('should parse in operator', () => {
            const parser = new ExpressionParser('Level in ["Warning", "Error"]');
            const result = parser.parse();

            const operators = result.filter(r => r.classificationType === 'operator');
            expect(operators.length).toBeGreaterThan(0);
        });

        it('should parse like operator', () => {
            const parser = new ExpressionParser('Message like "%error%"');
            const result = parser.parse();

            const operators = result.filter(r => r.classificationType === 'operator');
            expect(operators.length).toBeGreaterThan(0);
        });

        it('should parse is operator', () => {
            const parser = new ExpressionParser('@x is not null');
            const result = parser.parse();

            const operators = result.filter(r => r.classificationType === 'operator');
            expect(operators.length).toBeGreaterThan(0);
        });
    });

    describe('Functions', () => {
        it('should parse Contains function', () => {
            const parser = new ExpressionParser('Contains(Message, "error")');
            const result = parser.parse();

            const func = result.find(r => r.classificationType === 'function');
            expect(func).toBeDefined();
        });

        it('should parse Substring function', () => {
            const parser = new ExpressionParser('Substring(Message, 0, 10)');
            const result = parser.parse();

            const func = result.find(r => r.classificationType === 'function');
            expect(func).toBeDefined();
        });

        it('should parse nested functions', () => {
            const parser = new ExpressionParser('Contains(Substring(Message, 0, 10), "error")');
            const result = parser.parse();

            const functions = result.filter(r => r.classificationType === 'function');
            expect(functions).toHaveLength(2);
        });

        it('should parse function with property access', () => {
            const parser = new ExpressionParser('StartsWith(User.Name, "Admin")');
            const result = parser.parse();

            const func = result.find(r => r.classificationType === 'function');
            expect(func).toBeDefined();
        });
    });

    describe('Directives', () => {
        it('should parse #if directive', () => {
            const parser = new ExpressionParser('{#if Level = "Error"}ERROR{#end}');
            const result = parser.parse();

            const directives = result.filter(r => r.classificationType === 'directive');
            expect(directives.length).toBeGreaterThanOrEqual(2);
        });

        it('should parse #else directive', () => {
            const parser = new ExpressionParser('{#if @l = "Error"}ERROR{#else}OK{#end}');
            const result = parser.parse();

            const directives = result.filter(r => r.classificationType === 'directive');
            expect(directives.length).toBeGreaterThanOrEqual(3);
        });

        it('should parse #each directive', () => {
            const parser = new ExpressionParser('{#each item in Items}{item}{#delimit}, {#end}');
            const result = parser.parse();

            const directives = result.filter(r => r.classificationType === 'directive');
            expect(directives.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('String Literals', () => {
        it('should parse single-quoted strings', () => {
            const parser = new ExpressionParser("Level = 'Warning'");
            const result = parser.parse();

            const string = result.find(r => r.classificationType === 'string');
            expect(string).toBeDefined();
        });

        it('should parse double-quoted strings', () => {
            const parser = new ExpressionParser('Level = "Error"');
            const result = parser.parse();

            const string = result.find(r => r.classificationType === 'string');
            expect(string).toBeDefined();
        });

        it('should handle escaped quotes', () => {
            const parser = new ExpressionParser('Message = "Say \\"Hello\\""');
            const result = parser.parse();

            const string = result.find(r => r.classificationType === 'string');
            expect(string).toBeDefined();
        });
    });

    describe('Numbers', () => {
        it('should parse integers', () => {
            const parser = new ExpressionParser('Count > 100');
            const result = parser.parse();

            const number = result.find(r => r.classificationType === 'number');
            expect(number).toBeDefined();
        });

        it('should parse decimals', () => {
            const parser = new ExpressionParser('Amount >= 99.99');
            const result = parser.parse();

            const number = result.find(r => r.classificationType === 'number');
            expect(number).toBeDefined();
        });

        it('should parse negative numbers', () => {
            const parser = new ExpressionParser('Temperature < -10.5');
            const result = parser.parse();

            const number = result.find(r => r.classificationType === 'number');
            expect(number).toBeDefined();
        });
    });

    describe('Identifiers', () => {
        it('should parse simple identifiers', () => {
            const parser = new ExpressionParser('Username = "admin"');
            const result = parser.parse();

            const identifier = result.find(r => r.classificationType === 'identifier');
            expect(identifier).toBeDefined();
        });

        it('should parse property paths', () => {
            const parser = new ExpressionParser('User.Email.Domain = "example.com"');
            const result = parser.parse();

            const identifiers = result.filter(r => r.classificationType === 'identifier');
            expect(identifiers.length).toBeGreaterThan(0);
        });

        it('should parse array indexing', () => {
            const parser = new ExpressionParser('Items[0].Name = "First"');
            const result = parser.parse();

            const identifiers = result.filter(r => r.classificationType === 'identifier');
            expect(identifiers.length).toBeGreaterThan(0);
        });
    });

    describe('Complex Expressions', () => {
        it('should parse Filter.ByExcluding expression', () => {
            const parser = new ExpressionParser('Filter.ByExcluding("@p.ErrorDetails is not null and @p.ErrorDetails.Count > 0")');
            const result = parser.parse();

            const hasIdentifier = result.some(r => r.classificationType === 'identifier');
            const hasString = result.some(r => r.classificationType === 'string');

            expect(hasIdentifier).toBe(true);
            expect(hasString).toBe(true);
        });

        it('should parse ExpressionTemplate with directives', () => {
            const parser = new ExpressionParser('{#if @l = "Error"}[ERROR]{#else}[INFO]{#end} {@m}');
            const result = parser.parse();

            const directives = result.filter(r => r.classificationType === 'directive');
            const builtins = result.filter(r => r.classificationType === 'builtin');

            expect(directives.length).toBeGreaterThan(0);
            expect(builtins.length).toBeGreaterThan(0);
        });

        it('should parse Enrich.When expression', () => {
            const parser = new ExpressionParser('Enrich.When("RequestPath like \'/api/%\'", x => x.WithProperty("ApiCall", true))');
            const result = parser.parse();

            const identifiers = result.filter(r => r.classificationType === 'identifier');
            const strings = result.filter(r => r.classificationType === 'string');

            expect(identifiers.length).toBeGreaterThan(0);
            expect(strings.length).toBeGreaterThan(0);
        });

        it('should parse complex conditional expression', () => {
            const parser = new ExpressionParser('(@l = "Warning" and Contains(@m, "timeout")) or (@l = "Error" and @x is not null)');
            const result = parser.parse();

            const operators = result.filter(r => r.classificationType === 'operator');
            const builtins = result.filter(r => r.classificationType === 'builtin');
            const functions = result.filter(r => r.classificationType === 'function');

            expect(operators.length).toBeGreaterThan(0);
            expect(builtins.length).toBeGreaterThan(0);
            expect(functions.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty expression', () => {
            const parser = new ExpressionParser('');
            const result = parser.parse();

            expect(result).toHaveLength(0);
        });

        it('should handle whitespace-only expression', () => {
            const parser = new ExpressionParser('   \t\n   ');
            const result = parser.parse();

            expect(result).toHaveLength(0);
        });

        it('should handle unclosed string', () => {
            const parser = new ExpressionParser('Message = "unclosed');
            const result = parser.parse();

            const string = result.find(r => r.classificationType === 'string');
            expect(string).toBeDefined();
        });

        it('should handle special characters in identifiers', () => {
            const parser = new ExpressionParser('_internal$var123 = true');
            const result = parser.parse();

            const identifier = result.find(r => r.classificationType === 'identifier');
            expect(identifier).toBeDefined();
        });
    });
});