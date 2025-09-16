import * as vscode from 'vscode';
import { SerilogNavigationProvider } from './navigationProvider';

// Mock the vscode module
jest.mock('vscode', () => {
    const mockDispose = jest.fn();

    class MockPosition {
        constructor(public line: number, public character: number) {}
        translate(lineDelta: number, charDelta: number) {
            return new MockPosition(this.line + lineDelta, this.character + charDelta);
        }
    }

    class MockRange {
        constructor(
            public start: MockPosition,
            public end: MockPosition
        ) {}
        contains(position: MockPosition): boolean {
            if (position.line < this.start.line || position.line > this.end.line) {
                return false;
            }
            if (position.line === this.start.line && position.character < this.start.character) {
                return false;
            }
            if (position.line === this.end.line && position.character > this.end.character) {
                return false;
            }
            return true;
        }
    }

    class MockSelection extends MockRange {
        constructor(
            public anchor: MockPosition,
            public active: MockPosition
        ) {
            super(anchor, active);
        }
    }

    return {
        window: {
            activeTextEditor: null,
            showTextDocument: jest.fn(),
        },
        Position: MockPosition,
        Range: MockRange,
        Selection: MockSelection,
        CodeActionKind: {
            QuickFix: 'quickfix'
        },
        CodeAction: class {
            constructor(public title: string, public kind: string) {}
            command?: any;
        },
        commands: {
            registerCommand: jest.fn().mockReturnValue({ dispose: mockDispose })
        },
        TextEditorRevealType: {
            InCenter: 'InCenter'
        }
    };
});

// Mock the utils
jest.mock('../utils/serilogDetector', () => ({
    findSerilogRanges: jest.fn()
}));

jest.mock('../utils/stringLiteralParser');
jest.mock('../parsers/templateParser');

import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

describe('SerilogNavigationProvider', () => {
    let provider: SerilogNavigationProvider;
    let mockDocument: any;
    let mockFindSerilogRanges: jest.MockedFunction<typeof findSerilogRanges>;
    let mockParseTemplate: jest.MockedFunction<typeof parseTemplate>;
    let mockFindAllStringLiterals: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up the StringLiteralParser mock BEFORE creating the provider
        mockFindAllStringLiterals = jest.fn().mockReturnValue([]);
        (StringLiteralParser as any).mockImplementation(() => ({
            findAllStringLiterals: mockFindAllStringLiterals
        }));

        provider = new SerilogNavigationProvider();

        mockDocument = {
            languageId: 'csharp',
            lineCount: 1,
            lineAt: jest.fn(),
            getText: jest.fn(),
            offsetAt: jest.fn(),
            positionAt: jest.fn()
        };

        mockFindSerilogRanges = findSerilogRanges as jest.MockedFunction<typeof findSerilogRanges>;
        mockParseTemplate = parseTemplate as jest.MockedFunction<typeof parseTemplate>;
    });

    test('returns undefined for non-C# documents', () => {
        mockDocument.languageId = 'javascript';
        const range = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 0)
        );

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeUndefined();
        expect(mockFindSerilogRanges).not.toHaveBeenCalled();
    });

    test('returns undefined when not in Serilog call', () => {
        const position = new (vscode as any).Position(0, 10);
        const range = new (vscode as any).Range(position, position);

        mockFindSerilogRanges.mockReturnValue([]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeUndefined();
    });

    test('returns undefined when cursor not on property', () => {
        const position = new (vscode as any).Position(0, 5);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 50)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        mockDocument.getText.mockReturnValue('logger.LogInformation("Test", value);');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'Test',
            contentStart: 23,
            contentEnd: 27
        }]);

        mockParseTemplate.mockReturnValue([]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeUndefined();
    });

    test('provides navigation action for property', () => {
        const position = new (vscode as any).Position(0, 30);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 58)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        // Make sure getText returns the text for any range
        mockDocument.getText.mockImplementation(() => 'logger.LogInformation("User {UserId} logged in", userId);');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
        mockDocument.positionAt.mockImplementation((offset: number) =>
            new (vscode as any).Position(0, offset)
        );

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'User {UserId} logged in',
            contentStart: 23,
            contentEnd: 47
        }]);

        mockParseTemplate.mockReturnValue([{
            type: 'standard',
            name: 'UserId',
            startIndex: 5,
            endIndex: 13
        }]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result![0].title).toBe("Navigate to 'UserId' argument");
        expect(result![0].command).toBeDefined();
        expect(result![0].command!.command).toBe('serilog.navigateToArgument');
        expect(result![0].command!.arguments).toBeDefined();
        expect(result![0].command!.arguments![0].character).toBe(49);
    });

    test('handles positional parameters correctly', () => {
        const position = new (vscode as any).Position(0, 28);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 58)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        mockDocument.getText.mockReturnValue('logger.LogInformation("Item {0} of {1}", current, total);');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
        mockDocument.positionAt.mockImplementation((offset: number) =>
            new (vscode as any).Position(0, offset)
        );

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'Item {0} of {1}',
            contentStart: 23,
            contentEnd: 38
        }]);

        mockParseTemplate.mockReturnValue([
            {
                type: 'positional',
                name: '0',
                startIndex: 5,
                endIndex: 8
            },
            {
                type: 'positional',
                name: '1',
                startIndex: 12,
                endIndex: 15
            }
        ]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result![0].title).toBe("Navigate to '0' argument");
        expect(result![0].command!.arguments![0].character).toBe(41);
    });

    test('handles destructuring operator', () => {
        const position = new (vscode as any).Position(0, 37);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 53)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        mockDocument.getText.mockReturnValue('logger.LogInformation("Processing {@Order}", order);');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
        mockDocument.positionAt.mockImplementation((offset: number) =>
            new (vscode as any).Position(0, offset)
        );

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'Processing {@Order}',
            contentStart: 23,
            contentEnd: 42
        }]);

        mockParseTemplate.mockReturnValue([{
            type: 'destructured',
            name: 'Order',
            startIndex: 11,
            endIndex: 19
        }]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result![0].title).toBe("Navigate to 'Order' argument");
        expect(result![0].command!.arguments![0].character).toBe(45);
    });

    test('handles multiple properties', () => {
        const position = new (vscode as any).Position(0, 45); // On second property
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 69)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        mockDocument.getText.mockImplementation(() => 'logger.LogInformation("User {UserId} did {Action}", userId, action);');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
        mockDocument.positionAt.mockImplementation((offset: number) =>
            new (vscode as any).Position(0, offset)
        );

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'User {UserId} did {Action}',
            contentStart: 23,
            contentEnd: 50
        }]);

        mockParseTemplate.mockReturnValue([
            {
                type: 'standard',
                name: 'UserId',
                startIndex: 5,
                endIndex: 13
            },
            {
                type: 'standard',
                name: 'Action',
                startIndex: 18,
                endIndex: 26
            }
        ]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result![0].title).toBe("Navigate to 'Action' argument");
        expect(result![0].command!.arguments![0].character).toBe(60);
    });

    test('skips interpolated strings', () => {
        const position = new (vscode as any).Position(0, 30);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 50)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        mockDocument.getText.mockReturnValue('logger.LogInformation($"User {userId}");');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'interpolated',
            content: 'User {userId}',
            contentStart: 24,
            contentEnd: 37
        }]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeUndefined();
    });

    test('returns undefined when no matching argument found', () => {
        const position = new (vscode as any).Position(0, 30);
        const range = new (vscode as any).Range(position, position);

        const serilogRange = new (vscode as any).Range(
            new (vscode as any).Position(0, 0),
            new (vscode as any).Position(0, 50)
        );

        mockFindSerilogRanges.mockReturnValue([serilogRange]);
        // Template with property but no arguments
        mockDocument.getText.mockReturnValue('logger.LogInformation("User {UserId} logged in");');
        mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);

        mockFindAllStringLiterals.mockReturnValue([{
            type: 'regular',
            content: 'User {UserId} logged in',
            contentStart: 23,
            contentEnd: 47
        }]);

        mockParseTemplate.mockReturnValue([{
            type: 'standard',
            name: 'UserId',
            startIndex: 5,
            endIndex: 13
        }]);

        const result = provider.provideCodeActions(mockDocument, range, {} as any, {} as any);

        expect(result).toBeUndefined();
    });
});

describe('registerNavigationCommand', () => {
    test('registers command correctly', () => {
        const { registerNavigationCommand } = require('./navigationProvider');
        const mockEditor = {
            selection: null,
            revealRange: jest.fn()
        };

        (vscode.window as any).activeTextEditor = mockEditor;

        const disposable = registerNavigationCommand();

        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            'serilog.navigateToArgument',
            expect.any(Function)
        );

        // Get the callback and test it
        const callback = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
        const testPosition = new (vscode as any).Position(5, 10);

        callback(testPosition);

        expect(mockEditor.selection).toBeDefined();
        expect(mockEditor.revealRange).toHaveBeenCalled();
    });
});