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