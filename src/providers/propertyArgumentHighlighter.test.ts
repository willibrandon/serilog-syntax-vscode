import { PropertyArgumentHighlighter } from './propertyArgumentHighlighter';
import * as vscode from 'vscode';
import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

// Mock VS Code API
jest.mock('vscode', () => ({
    window: {
        createTextEditorDecorationType: jest.fn(() => ({
            dispose: jest.fn()
        })),
        onDidChangeTextEditorSelection: jest.fn((callback) => ({
            dispose: jest.fn()
        })),
        onDidChangeActiveTextEditor: jest.fn((callback) => ({
            dispose: jest.fn()
        })),
        get activeTextEditor() {
            return (global as any).mockActiveEditor;
        }
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn().mockReturnValue(true)
        }))
    },
    ThemeColor: class {
        constructor(public id: string) {}
    },
    Range: class {
        constructor(
            public start: { line: number; character: number } | any,
            public end: { line: number; character: number } | any
        ) {}
        contains(position: any): boolean {
            // For single-line ranges, check if position is within character range
            if (this.start.line === this.end.line && position.line === this.start.line) {
                return position.character >= this.start.character &&
                       position.character <= this.end.character;
            }
            return false;
        }
    },
    Position: class {
        constructor(public line: number, public character: number) {}
    },
    Disposable: class {
        static from(...disposables: any[]): any {
            return { dispose: jest.fn() };
        }
    }
}));

jest.mock('../utils/serilogDetector');
jest.mock('../utils/stringLiteralParser');
jest.mock('../parsers/templateParser');

describe('PropertyArgumentHighlighter', () => {
    let highlighter: PropertyArgumentHighlighter;
    let mockEditor: any;
    let mockDocument: any;
    let mockSetDecorations: jest.Mock;
    let mockFindSerilogRanges: jest.MockedFunction<typeof findSerilogRanges>;
    let mockParseTemplate: jest.MockedFunction<typeof parseTemplate>;
    let mockFindAllStringLiterals: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up mocks
        mockSetDecorations = jest.fn();
        mockFindAllStringLiterals = jest.fn().mockReturnValue([]);
        (StringLiteralParser as any).mockImplementation(() => ({
            findAllStringLiterals: mockFindAllStringLiterals
        }));

        mockDocument = {
            languageId: 'csharp',
            getText: jest.fn(),
            offsetAt: jest.fn(),
            positionAt: jest.fn()
        };

        mockEditor = {
            document: mockDocument,
            setDecorations: mockSetDecorations,
            selection: {
                active: new (vscode as any).Position(0, 30)
            }
        };

        mockFindSerilogRanges = findSerilogRanges as jest.MockedFunction<typeof findSerilogRanges>;
        mockParseTemplate = parseTemplate as jest.MockedFunction<typeof parseTemplate>;

        // Set the active editor globally for clearDecorations to work
        (global as any).mockActiveEditor = mockEditor;

        // Create highlighter instance AFTER all mocks are set up
        highlighter = new PropertyArgumentHighlighter();

        // Get the registered callback and bind it to the highlighter
        const registeredCallback = (vscode.window.onDidChangeTextEditorSelection as jest.Mock).mock.calls[0][0];

        // Store original callback bound to highlighter for testing
        (highlighter as any).testCallback = registeredCallback.bind(highlighter);
    });

    afterEach(() => {
        highlighter.dispose();
    });

    describe('onSelectionChange', () => {
        test('highlights property and argument when cursor on property', () => {
            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30) // Cursor on {UserId}
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 58)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("User {UserId} logged in", userId);'
            );
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
                startIndex: 5,  // Position of {UserId} in template
                endIndex: 13
            }]);

            // Act - trigger selection change
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];

            expect(decorations).toHaveLength(2);

            // Should highlight {UserId} in template
            expect(decorations[0].range.start.character).toBe(28); // 23 + 5
            expect(decorations[0].range.end.character).toBe(36); // 23 + 13

            // Should highlight userId argument (with quotes if string)
            // The argument starts after ", "
            expect(decorations[1].range.start.character).toBeGreaterThan(47);
        });

        test('highlights property and argument when cursor on argument', () => {
            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 52) // Cursor on userId argument
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 58)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("User {UserId} logged in", userId);'
            );
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

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];
            expect(decorations).toHaveLength(2);
        });

        test('includes quotes when highlighting string arguments', () => {
            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30)
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 60)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("User {UserId} logged in", "alice");'
            );
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

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];

            // The second decoration should include the quotes around "alice"
            // Template ends at 47, then ", " takes us to 50, but our fixed code finds it at 49
            expect(decorations[1].range.start.character).toBe(49); // Opening quote (fixed position)
            expect(decorations[1].range.end.character).toBe(56); // Closing quote (56 not 57)
        });

        test('does not highlight template content when it matches argument name', () => {
            // This tests the bug fix where "user" in template was incorrectly highlighted
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 42) // Cursor on {@User} (23 + 16 + a few chars into it)
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 55)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("Processing user {@User}", user);'
            );
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'Processing user {@User}',
                contentStart: 23,
                contentEnd: 47
            }]);

            mockParseTemplate.mockReturnValue([{
                type: 'destructured',
                name: 'User',
                startIndex: 16,  // Position of {@User} in template
                endIndex: 23
            }]);

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];

            expect(decorations).toBeDefined();
            expect(decorations).toHaveLength(2);

            // Should highlight {@User} in template
            expect(decorations[0].range.start.character).toBe(39); // 23 + 16
            expect(decorations[0].range.end.character).toBe(46); // 23 + 23

            // Should highlight the argument "user" after the comma, not "user" in template
            expect(decorations[1].range.start.character).toBeGreaterThan(47); // After template ends
        });

        test('clears decorations when feature is disabled', () => {
            // Arrange
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue(false) // Feature disabled
            });

            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30)
                }]
            };

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });

        test('clears decorations for non-C# documents', () => {
            // Arrange
            mockDocument.languageId = 'javascript';

            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30)
                }]
            };

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });

        test('clears decorations when selection is not empty', () => {
            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: false, // User has selected text
                    active: new (vscode as any).Position(0, 30)
                }]
            };

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });

        test('handles multiple properties correctly', () => {
            // Reset configuration mock to enabled (in case previous test changed it)
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue(true)
            });

            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 50) // Cursor on {Action} (23 + 24 + a few chars)
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 90)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("User {UserId} performed {Action} at {Time}", userId, action, time);'
            );
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'User {UserId} performed {Action} at {Time}',
                contentStart: 23,
                contentEnd: 67
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
                    startIndex: 24,
                    endIndex: 32
                },
                {
                    type: 'standard',
                    name: 'Time',
                    startIndex: 37,
                    endIndex: 43
                }
            ]);

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];

            expect(decorations).toHaveLength(2);

            // Should highlight {Action} and its corresponding argument
            expect(decorations[0].range.start.character).toBe(47); // 23 + 24
            expect(decorations[0].range.end.character).toBe(55); // 23 + 32
        });

        test('handles positional parameters', () => {
            // Reset configuration mock to enabled (in case previous test changed it)
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue(true)
            });

            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30) // Cursor on {0}
                }]
            };

            const serilogRange = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, 60)
            );

            mockFindSerilogRanges.mockReturnValue([serilogRange]);
            mockDocument.getText.mockImplementation(() =>
                'logger.LogInformation("Error {0} occurred in {1}", code, method);'
            );
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'Error {0} occurred in {1}',
                contentStart: 23,
                contentEnd: 49
            }]);

            mockParseTemplate.mockReturnValue([
                {
                    type: 'positional',
                    name: '0',
                    startIndex: 6,
                    endIndex: 9
                },
                {
                    type: 'positional',
                    name: '1',
                    startIndex: 22,
                    endIndex: 25
                }
            ]);

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[mockSetDecorations.mock.calls.length - 1][1];

            expect(decorations).toHaveLength(2);

            // Should highlight {0} and its corresponding argument
            expect(decorations[0].range.start.character).toBe(29); // 23 + 6
            expect(decorations[0].range.end.character).toBe(32); // 23 + 9
        });

        test('clears decorations when not in Serilog call', () => {
            // Arrange
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: new (vscode as any).Position(0, 30)
                }]
            };

            mockFindSerilogRanges.mockReturnValue([]); // No Serilog calls found

            // Act
            (highlighter as any).testCallback(mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });
    });
});