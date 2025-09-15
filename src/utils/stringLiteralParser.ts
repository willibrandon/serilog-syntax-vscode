export interface StringLiteral {
    start: number;      // Absolute position in text where string starts (including quotes)
    end: number;        // Absolute position in text where string ends (including quotes)
    contentStart: number; // Absolute position where content starts (after opening quotes)
    contentEnd: number;   // Absolute position where content ends (before closing quotes)
    content: string;    // The actual string content (without quotes)
    type: 'regular' | 'verbatim' | 'raw' | 'interpolated';
}

/**
 * Parses C# string literals, handling regular, verbatim (@""), and raw (""") strings.
 * Returns absolute positions in the text for proper range mapping.
 */
export class StringLiteralParser {
    /**
     * Attempts to parse any type of string literal starting at the given position.
     */
    tryParseStringLiteral(text: string, startIndex: number): StringLiteral | null {
        // Check for verbatim string @"..." FIRST
        if (startIndex < text.length - 1 && text[startIndex] === '@' && text[startIndex + 1] === '"') {
            return this.tryParseVerbatimString(text, startIndex);
        }

        // Check for interpolated string $"..." (skip for Serilog)
        if (startIndex < text.length - 1 && text[startIndex] === '$' && text[startIndex + 1] === '"') {
            // Serilog doesn't use interpolated strings, but handle them to avoid false positives
            return this.tryParseInterpolatedString(text, startIndex);
        }

        // Check for quotes (could be regular or raw string)
        if (startIndex < text.length && text[startIndex] === '"') {
            // Count quotes to determine if it's raw string (3+) or regular (1)
            let quoteCount = 0;
            let pos = startIndex;
            while (pos < text.length && text[pos] === '"') {
                quoteCount++;
                pos++;
            }

            if (quoteCount >= 3) {
                // Raw string literal
                return this.tryParseRawString(text, startIndex);
            } else {
                // Regular string literal
                return this.tryParseRegularString(text, startIndex);
            }
        }

        return null;
    }

    /**
     * Parses a regular string literal "..."
     */
    private tryParseRegularString(text: string, startIndex: number): StringLiteral | null {
        const contentStart = startIndex + 1; // Skip opening "
        let current = contentStart;
        let escaped = false;
        const contentParts: string[] = [];

        while (current < text.length) {
            const char = text[current];

            if (escaped) {
                contentParts.push(char);
                escaped = false;
                current++;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                current++;
                continue;
            }

            if (char === '"') {
                // Found the end
                return {
                    start: startIndex,
                    end: current,  // Position of closing quote
                    contentStart: contentStart,
                    contentEnd: current,  // Position just before closing quote
                    content: text.substring(contentStart, current),
                    type: 'regular'
                };
            }

            contentParts.push(char);
            current++;
        }

        // Incomplete string - return what we have
        if (current > contentStart) {
            return {
                start: startIndex,
                end: current - 1,
                contentStart: contentStart,
                contentEnd: current,
                content: text.substring(contentStart, current),
                type: 'regular'
            };
        }

        return null;
    }

    /**
     * Parses a verbatim string literal @"..."
     */
    private tryParseVerbatimString(text: string, startIndex: number): StringLiteral | null {
        const contentStart = startIndex + 2; // Skip @"
        let current = contentStart;

        while (current < text.length) {
            if (text[current] === '"') {
                // Check for escaped quote ""
                if (current + 1 < text.length && text[current + 1] === '"') {
                    current += 2;
                    continue;
                }

                // Found the end
                return {
                    start: startIndex,
                    end: current,
                    contentStart: contentStart,
                    contentEnd: current,
                    content: text.substring(contentStart, current), // Keep content as-is, don't replace ""
                    type: 'verbatim'
                };
            }

            current++;
        }

        // Incomplete string - return what we have
        if (current > contentStart) {
            return {
                start: startIndex,
                end: current - 1,
                contentStart: contentStart,
                contentEnd: current,
                content: text.substring(contentStart, current), // Keep content as-is
                type: 'verbatim'
            };
        }

        return null;
    }

    /**
     * Parses a raw string literal """..."""
     */
    private tryParseRawString(text: string, startIndex: number): StringLiteral | null {
        // Count opening quotes
        let quoteCount = 0;
        let pos = startIndex;
        while (pos < text.length && text[pos] === '"') {
            quoteCount++;
            pos++;
        }

        if (quoteCount < 3) {
            return null; // Not a raw string
        }

        const contentStart = pos;
        let searchPos = pos;

        // Find matching closing quotes
        while (searchPos < text.length) {
            if (text[searchPos] === '"') {
                // Count consecutive quotes
                let closeCount = 0;
                let closePos = searchPos;
                while (closePos < text.length && text[closePos] === '"') {
                    closeCount++;
                    closePos++;
                }

                if (closeCount >= quoteCount) {
                    // Found matching closing quotes
                    return {
                        start: startIndex,
                        end: searchPos + quoteCount - 1,
                        contentStart: contentStart,
                        contentEnd: searchPos,
                        content: text.substring(contentStart, searchPos),
                        type: 'raw'
                    };
                }

                // Skip these quotes and continue
                searchPos = closePos;
            } else {
                searchPos++;
            }
        }

        // Incomplete raw string - return what we have
        return {
            start: startIndex,
            end: text.length - 1,
            contentStart: contentStart,
            contentEnd: text.length,
            content: text.substring(contentStart),
            type: 'raw'
        };
    }

    /**
     * Parses an interpolated string $"..." (not used by Serilog but handled to avoid false positives)
     */
    private tryParseInterpolatedString(text: string, startIndex: number): StringLiteral | null {
        const contentStart = startIndex + 2; // Skip $"
        let current = contentStart;
        let escaped = false;
        let braceDepth = 0;

        while (current < text.length) {
            const char = text[current];

            if (escaped) {
                escaped = false;
                current++;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                current++;
                continue;
            }

            if (char === '{') {
                if (current + 1 < text.length && text[current + 1] === '{') {
                    // Escaped brace
                    current += 2;
                    continue;
                }
                braceDepth++;
                current++;
                continue;
            }

            if (char === '}') {
                if (braceDepth > 0) {
                    braceDepth--;
                } else if (current + 1 < text.length && text[current + 1] === '}') {
                    // Escaped brace
                    current += 2;
                    continue;
                }
                current++;
                continue;
            }

            if (char === '"' && braceDepth === 0) {
                // Found the end
                return {
                    start: startIndex,
                    end: current,
                    contentStart: contentStart,
                    contentEnd: current,
                    content: text.substring(contentStart, current),
                    type: 'interpolated'
                };
            }

            current++;
        }

        return null;
    }

    /**
     * Finds all string literals in the given text
     */
    findAllStringLiterals(text: string): StringLiteral[] {
        const literals: StringLiteral[] = [];
        let pos = 0;

        while (pos < text.length) {
            const char = text[pos];

            // Check for potential string start
            if (char === '"' || char === '@' || char === '$') {
                const literal = this.tryParseStringLiteral(text, pos);
                if (literal) {
                    literals.push(literal);
                    pos = literal.end + 1; // Move past this string
                    continue;
                }
            }

            pos++;
        }

        return literals;
    }
}