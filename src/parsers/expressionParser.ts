import { ExpressionTokenizer, Token, TokenType } from './expressionTokenizer';

export interface ClassifiedRegion {
    classificationType: string;
    startIndex: number;
    endIndex: number;
}

export class ExpressionParser {
    private tokenizer: ExpressionTokenizer;

    constructor(template: string) {
        this.tokenizer = new ExpressionTokenizer(template);
    }

    parse(): ClassifiedRegion[] {
        const regions: ClassifiedRegion[] = [];
        const tokens = this.tokenizer.tokenize();

        for (const token of tokens) {
            const classificationType = this.getClassificationType(token);
            if (classificationType) {
                regions.push({
                    classificationType,
                    startIndex: token.start,
                    endIndex: token.end
                });
            }
        }

        return regions;
    }

    parseExpressionTemplate(): ClassifiedRegion[] {
        // Same as parse() but for ExpressionTemplate specifically
        return this.parse();
    }

    private getClassificationType(token: Token): string | null {
        switch (token.type) {
            case TokenType.Identifier:
                return 'identifier';
            case TokenType.StringLiteral:
                return 'string';
            case TokenType.NumberLiteral:
                return 'number';
            case TokenType.ComparisonOperator:
            case TokenType.LogicalOperator:
            case TokenType.ArithmeticOperator:
                return 'operator';
            case TokenType.Directive:
                return 'directive';
            case TokenType.BuiltInProperty:
                return 'builtin';
            case TokenType.Function:
                return 'function';
            case TokenType.FormatSpecifier:
                return 'format';
            case TokenType.Punctuation:
                // Special handling for braces - they should get brace classification
                if (token.value === '{' || token.value === '}') {
                    return 'brace';
                }
                return 'punctuation';
            case TokenType.Unknown:
            default:
                return null;
        }
    }
}