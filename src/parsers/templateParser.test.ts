import { parseTemplate, TemplateProperty } from './templateParser';

describe('parseTemplate', () => {
    describe('Basic Properties', () => {
        it('should parse simple property', () => {
            const template = 'User {Username} logged in';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                type: 'standard',
                name: 'Username',
                startIndex: 5,
                endIndex: 15
            });
        });

        it('should parse multiple properties', () => {
            const template = 'User {Username} logged in at {Timestamp}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Username');
            expect(result[1].name).toBe('Timestamp');
        });

        it('should parse positional parameters', () => {
            const template = 'Processing {0} items from {1}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                type: 'positional',
                name: '0'
            });
            expect(result[1]).toMatchObject({
                type: 'positional',
                name: '1'
            });
        });
    });

    describe('Destructuring Operators', () => {
        it('should parse destructure operator @', () => {
            const template = 'User {@User} details';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'destructured',
                name: 'User',
                startIndex: 5,
                endIndex: 12
            });
        });

        it('should parse stringify operator $', () => {
            const template = 'Data {$Data} as string';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'stringified',
                name: 'Data'
            });
        });
    });

    describe('Format Specifiers', () => {
        it('should parse date format specifier', () => {
            const template = 'Today is {Date:yyyy-MM-dd}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Date',
                formatSpecifier: 'yyyy-MM-dd'
            });
        });

        it('should parse numeric format specifier', () => {
            const template = 'Total: {Amount:0.00}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Amount',
                formatSpecifier: '0.00'
            });
        });

        it('should parse alignment specifier', () => {
            const template = 'Name: {Name,15}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Name',
                alignment: '15'
            });
        });

        it('should parse alignment with format', () => {
            const template = 'Price: {Price,10:C2}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Price',
                alignment: '10',
                formatSpecifier: 'C2'
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle escaped braces', () => {
            const template = 'Literal {{braces}} here';
            const result = parseTemplate(template);

            expect(result).toHaveLength(0); // Escaped braces are not properties
        });

        it('should handle empty template', () => {
            const template = '';
            const result = parseTemplate(template);

            expect(result).toHaveLength(0);
        });

        it('should handle template with no properties', () => {
            const template = 'Just plain text';
            const result = parseTemplate(template);

            expect(result).toHaveLength(0);
        });

        it('should handle unclosed brace', () => {
            const template = 'Unclosed {property';
            const result = parseTemplate(template);

            expect(result).toHaveLength(0); // Invalid property
        });

        it('should handle nested braces in format', () => {
            const template = 'Time: {Time:HH:mm:ss}';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Time',
                formatSpecifier: 'HH:mm:ss'
            });
        });

        it('should handle property with underscore', () => {
            const template = 'User {User_Id} found';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'User_Id'
            });
        });

        it('should handle property with numbers', () => {
            const template = 'Item {Item123} processed';
            const result = parseTemplate(template);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'standard',
                name: 'Item123'
            });
        });
    });

    describe('Complex Templates', () => {
        it('should parse complex log template', () => {
            const template = 'User {@User} performed {Action} on {Timestamp:yyyy-MM-dd HH:mm:ss} with result {Result,10}';
            const result = parseTemplate(template);

            // Find each type
            const destructured = result.find((r: TemplateProperty) => r.type === 'destructured');
            const withFormat = result.find((r: TemplateProperty) => r.formatSpecifier !== undefined);
            const withAlignment = result.find((r: TemplateProperty) => r.alignment !== undefined);
            const standard = result.filter((r: TemplateProperty) => r.type === 'standard');

            expect(destructured).toBeDefined();
            expect(withFormat).toBeDefined();
            expect(withAlignment).toBeDefined();
            expect(standard.length).toBeGreaterThan(0);
        });

        it('should parse template with all features', () => {
            const template = 'Processing {$Data} for {@User} at {Time:HH:mm} - {Count,5:D} items';
            const result = parseTemplate(template);

            const types = result.map((r: TemplateProperty) => r.type);
            const hasFormatSpec = result.some((r: TemplateProperty) => r.formatSpecifier !== undefined);
            const hasAlignment = result.some((r: TemplateProperty) => r.alignment !== undefined);

            expect(types).toContain('stringified');
            expect(types).toContain('destructured');
            expect(hasFormatSpec).toBe(true);
            expect(hasAlignment).toBe(true);
            expect(types).toContain('standard');
        });
    });
});