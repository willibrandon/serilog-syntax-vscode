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

    // First remove escaped braces from consideration
    const cleanedTemplate = template.replace(/\{\{|\}\}/g, '  ');

    const regex = /\{([@$#])?([A-Za-z_][A-Za-z0-9_]*|\d+)(,([+-]?\d+))?(:[^}]+)?\}/g;
    let match;

    while ((match = regex.exec(cleanedTemplate)) !== null) {
        const prefix = match[1];
        const name = match[2];

        // Skip expression directives (start with #)
        if (prefix === '#') {
            continue;
        }

        // Skip expression built-ins (@t, @m, @l, @x, @i, @p)
        // BUT ONLY for property-argument highlighting purposes
        // Brace matching should still work on these!
        if (prefix === '@' && ['t', 'm', 'l', 'x', 'i', 'p'].includes(name)) {
            continue;
        }

        // Skip expression variables ($x, $y, etc. - single letter)
        if (prefix === '$' && name.length === 1) {
            continue;
        }

        const property: TemplateProperty = {
            name: name,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            type: 'standard'
        };

        if (prefix === '@') property.type = 'destructured';
        else if (prefix === '$') property.type = 'stringified';
        else if (/^\d+$/.test(name)) property.type = 'positional';

        if (match[4]) property.alignment = match[4];
        if (match[5]) property.formatSpecifier = match[5].substring(1);

        properties.push(property);
    }

    return properties;
}