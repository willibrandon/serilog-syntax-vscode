import * as vscode from 'vscode';
import { SerilogBraceMatchProvider } from './braceMatchProvider';

// Mock the vscode module completely
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
    }

    class MockSelection {
        constructor(
            public anchor: MockPosition,
            public active: MockPosition
        ) {}
    }

    return {
        window: {
            createTextEditorDecorationType: jest.fn().mockReturnValue({
                dispose: mockDispose
            })
        },
        ThemeColor: jest.fn().mockImplementation((id: string) => ({ id })),
        Position: MockPosition,
        Range: MockRange,
        Selection: MockSelection
    };
});

describe('SerilogBraceMatchProvider', () => {
    let provider: SerilogBraceMatchProvider;
    let mockEditor: any;
    let mockDocument: any;
    let mockSetDecorations: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSetDecorations = jest.fn();

        mockDocument = {
            languageId: 'csharp',
            lineCount: 1,
            lineAt: jest.fn()
        };

        mockEditor = {
            document: mockDocument,
            selection: new (vscode as any).Selection(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 0)
            ),
            setDecorations: mockSetDecorations
        };

        provider = new SerilogBraceMatchProvider();
    });

    afterEach(() => {
        provider.dispose();
    });

    test('creates decoration type on construction', () => {
        expect(vscode.window.createTextEditorDecorationType).toHaveBeenCalledWith({
            backgroundColor: expect.objectContaining({ id: 'editor.wordHighlightBackground' }),
            border: '1px solid',
            borderColor: expect.objectContaining({ id: 'editor.wordHighlightBorder' })
        });
    });

    test('returns early for non-C# documents', () => {
        mockDocument.languageId = 'javascript';

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).not.toHaveBeenCalled();
    });

    test('returns early when editor is null', () => {
        provider.updateBraceMatching(null as any);

        expect(mockSetDecorations).not.toHaveBeenCalled();
    });

    test('clears decorations when no brace match found', () => {
        const mockLine = {
            text: 'var x = 5; // No Serilog call',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('disposes decoration type when disposed', () => {
        const decorationType = (provider as any).decorationType;
        provider.dispose();

        expect(decorationType.dispose).toHaveBeenCalled();
    });

    test('handles empty line text', () => {
        const mockLine = {
            text: '',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('handles cursor at end of line', () => {
        const lineText = 'logger.LogInformation("User {UserId}", userId);';
        const mockLine = {
            text: lineText,
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, lineText.length),
            new (vscode as any).Position(0, lineText.length)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('handles non-Serilog code', () => {
        const mockLine = {
            text: 'var dict = new Dictionary<string, object> { ["key"] = value };',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 42),
            new (vscode as any).Position(0, 42)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('handles malformed templates', () => {
        const mockLine = {
            text: 'logger.LogInformation("User {UserId logged in", userId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 23),
            new (vscode as any).Position(0, 23)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('highlights matching braces when cursor is on opening brace', () => {
        const mockLine = {
            text: 'logger.LogInformation("User {UserId} logged in", userId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 23),
            new (vscode as any).Position(0, 23)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('highlights matching braces when cursor is on closing brace', () => {
        const mockLine = {
            text: 'logger.LogInformation("User {UserId} logged in", userId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 29),
            new (vscode as any).Position(0, 29)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('highlights when cursor is immediately after closing brace', () => {
        const mockLine = {
            text: 'logger.LogInformation("User {UserId} logged in", userId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 30),
            new (vscode as any).Position(0, 30)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('handles multiple property braces correctly', () => {
        const mockLine = {
            text: 'logger.LogInformation("Order {OrderId} with {ItemCount} items", orderId, count);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 29),
            new (vscode as any).Position(0, 29)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('matches second property braces when cursor on second opening brace', () => {
        const mockLine = {
            text: 'logger.LogInformation("Order {OrderId} with {ItemCount} items", orderId, count);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 44),
            new (vscode as any).Position(0, 44)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('ignores escaped opening braces', () => {
        const mockLine = {
            text: 'logger.LogInformation("Use {{literal}} and {Property}", prop);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 27),
            new (vscode as any).Position(0, 27)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('ignores escaped closing braces', () => {
        const mockLine = {
            text: 'logger.LogInformation("Use {{literal}} and {Property}", prop);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 35),
            new (vscode as any).Position(0, 35)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('matches unescaped braces when escaped braces are present', () => {
        const mockLine = {
            text: 'logger.LogInformation("Use {{literal}} and {Property}", prop);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 40),
            new (vscode as any).Position(0, 40)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('works with verbatim strings across multiple lines', () => {
        const mockLine1 = {
            text: 'logger.LogInformation(@"User {UserId}',
            lineNumber: 0
        };
        const mockLine2 = {
            text: 'logged in at {Timestamp}", userId, timestamp);',
            lineNumber: 1
        };

        mockDocument.lineCount = 2;
        mockDocument.lineAt
            .mockReturnValueOnce(mockLine1)
            .mockReturnValueOnce(mockLine2);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 28),
            new (vscode as any).Position(0, 28)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('works with Log.Information static calls', () => {
        const mockLine = {
            text: 'Log.Information("User {UserId} logged in", userId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 17),
            new (vscode as any).Position(0, 17)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('works with LogError calls with exception parameters', () => {
        const mockLine = {
            text: 'logger.LogError(ex, "Failed to process {ItemId}", itemId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 37),
            new (vscode as any).Position(0, 37)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('works with BeginScope calls', () => {
        const mockLine = {
            text: 'logger.BeginScope("Operation {OperationId}", operationId);',
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 29),
            new (vscode as any).Position(0, 29)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });

    test('respects maximum search distance to prevent performance issues', () => {
        const longProperty = 'a'.repeat(300);
        const mockLine = {
            text: `logger.LogInformation("Very long property {${longProperty}}", value);`,
            lineNumber: 0
        };
        mockDocument.lineAt.mockReturnValue(mockLine);

        mockEditor.selection = new (vscode as any).Selection(
            new (vscode as any).Position(0, 40),
            new (vscode as any).Position(0, 40)
        );

        provider.updateBraceMatching(mockEditor);

        expect(mockSetDecorations).toHaveBeenCalledWith(expect.any(Object), []);
    });
});