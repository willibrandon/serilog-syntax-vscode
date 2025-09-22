import { PropertyArgumentHighlighter } from './propertyArgumentHighlighter';
import * as vscode from 'vscode';
import { findSerilogRanges } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';
import { parseTemplate } from '../parsers/templateParser';

jest.mock('vscode');
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
        // Mock vscode ThemeColor
        (vscode as any).ThemeColor = jest.fn().mockImplementation((id: string) => ({ id }));

        // Mock vscode Position and Range
        (vscode as any).Position = jest.fn().mockImplementation((line: number, character: number) => ({
            line,
            character
        }));

        (vscode as any).Range = jest.fn().mockImplementation((start: any, end: any) => ({
            start,
            end,
            contains: jest.fn((pos: any) => {
                // Simple contains check for testing
                return pos.line >= start.line && pos.character >= start.character;
            })
        }));

        // Mock document
        mockDocument = {
            languageId: 'csharp',
            getText: jest.fn(),
            offsetAt: jest.fn(),
            positionAt: jest.fn(),
            lineAt: jest.fn().mockReturnValue({ text: '' })
        };

        // Mock editor
        mockSetDecorations = jest.fn();
        mockEditor = {
            document: mockDocument,
            setDecorations: mockSetDecorations
        };

        // Mock vscode APIs
        const mockDecorationType = {
            dispose: jest.fn()
        };
        (vscode.window.createTextEditorDecorationType as jest.Mock).mockReturnValue(mockDecorationType);
        (vscode.window as any).activeTextEditor = mockEditor;

        // Store the selection change handler
        let selectionChangeHandler: any;
        (vscode.window as any).onDidChangeTextEditorSelection = jest.fn().mockImplementation((handler) => {
            selectionChangeHandler = handler;
            return { dispose: jest.fn() };
        });
        (vscode.window as any).onDidChangeActiveTextEditor = jest.fn().mockReturnValue({ dispose: jest.fn() });

        // Mock workspace configuration
        const mockConfig = {
            get: jest.fn().mockReturnValue(true)
        };
        (vscode.workspace as any).getConfiguration = jest.fn().mockReturnValue(mockConfig);

        // Mock Serilog detector
        mockFindSerilogRanges = findSerilogRanges as jest.MockedFunction<typeof findSerilogRanges>;

        // Mock template parser
        mockParseTemplate = parseTemplate as jest.MockedFunction<typeof parseTemplate>;

        // Mock string parser
        mockFindAllStringLiterals = jest.fn();
        StringLiteralParser.prototype.findAllStringLiterals = mockFindAllStringLiterals;

        highlighter = new PropertyArgumentHighlighter();

        // Store the handler for later use in tests
        (highlighter as any).selectionChangeHandler = selectionChangeHandler;
    });

    afterEach(() => {
        if (highlighter) {
            highlighter.dispose();
        }
    });

    describe('Serilog.Expressions', () => {
        test('should NOT highlight expression directives as property-argument pairs', () => {
            // Arrange
            const text = 'Filter.ByExcluding("{#if Level = \'Error\'} {@m} {#end}")';
            const position = new (vscode as any).Position(0, 21); // On { of {#if

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, text.length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(text);
            mockDocument.lineAt.mockReturnValue({ text: text });
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '{#if Level = \'Error\'} {@m} {#end}',
                contentStart: 20,
                contentEnd: 54
            }]);

            // Parse template should recognize these as expression directives, not properties
            mockParseTemplate.mockReturnValue([]);

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act - simulate selection change
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert - should NOT apply any decorations
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });

        test('should NOT highlight {@m} as a property-argument pair', () => {
            // Arrange
            const text = 'new ExpressionTemplate("{@m}: {Level}")';
            const position = new (vscode as any).Position(0, 24); // On { of {@m}

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, text.length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(text);
            mockDocument.lineAt.mockReturnValue({ text: text });
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '{@m}: {Level}',
                contentStart: 24,
                contentEnd: 37
            }]);

            // Parse template should not return expression directives as properties
            mockParseTemplate.mockReturnValue([]);

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });

        test('should NOT highlight expression functions as properties', () => {
            // Arrange
            const text = '.Filter.ByIncludingOnly("StartsWith(RequestPath, \'/api\')")';
            const position = new (vscode as any).Position(0, 25); // On StartsWith

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, text.length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(text);
            mockDocument.lineAt.mockReturnValue({ text: text });
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'StartsWith(RequestPath, \'/api\')',
                contentStart: 25,
                contentEnd: 57
            }]);

            // Expression functions are not properties
            mockParseTemplate.mockReturnValue([]);

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });
    });

    describe('Message Templates', () => {
        test('should highlight property-argument pairs in message templates', () => {
            // Arrange
            const text = 'logger.LogInformation("User {UserId} logged in", userId)';
            const position = new (vscode as any).Position(0, 30); // On UserId property

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, text.length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(text);
            mockDocument.lineAt.mockReturnValue({ text: text });
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

            // Parse template should return the UserId property
            mockParseTemplate.mockReturnValue([{
                startIndex: 5,  // Position of { in content
                endIndex: 13,   // Position of } in content (inclusive)
                name: 'UserId',
                type: 'standard'
            }]);

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert - should apply decorations for property and argument (including braces)
            expect(mockSetDecorations).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.objectContaining({
                        range: expect.objectContaining({
                            start: expect.objectContaining({ character: 28 }), // Property start (including {)
                            end: expect.objectContaining({ character: 36 })    // Property end (including })
                        })
                    })
                ])
            );
        });
    });

    describe('ESC Handler', () => {
        test('should clear decorations when clearDecorations is called', () => {
            // Arrange
            highlighter = new PropertyArgumentHighlighter();

            // Mock active editor
            (vscode.window as any).activeTextEditor = mockEditor;

            // Act - Clear decorations
            highlighter.clearDecorations();

            // Assert - Decorations are cleared
            expect(mockSetDecorations).toHaveBeenCalledWith(
                expect.anything(),
                []
            );
        });
    });

    describe('LogError with Exception parameter', () => {
        test('should highlight property-argument pairs when Exception is first parameter (single-line)', () => {
            // Arrange
            const text = 'logger.LogError(new Exception("Database connection failed"), "Error processing {UserId} with {ErrorCode} and {Message}", userId, errorCode, errorMessage);';
            const position = new (vscode as any).Position(0, 85); // On UserId property

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(0, text.length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(text);
            mockDocument.lineAt.mockReturnValue({ text: text });
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            // Mock string parser to find both string literals
            mockFindAllStringLiterals.mockReturnValue([
                {
                    type: 'regular',
                    content: 'Database connection failed',
                    contentStart: 30,  // After opening quote of exception message
                    contentEnd: 56     // Before closing quote
                },
                {
                    type: 'regular',
                    content: 'Error processing {UserId} with {ErrorCode} and {Message}',
                    contentStart: 62,  // After opening quote of template
                    contentEnd: 119    // Before closing quote
                }
            ]);

            // Parse template should return the properties from the template string
            mockParseTemplate.mockImplementation((template: string) => {
                if (template.includes('{UserId}')) {
                    return [
                        { startIndex: 17, endIndex: 25, name: 'UserId', type: 'standard' },
                        { startIndex: 31, endIndex: 42, name: 'ErrorCode', type: 'standard' },
                        { startIndex: 47, endIndex: 56, name: 'Message', type: 'standard' }
                    ];
                }
                return [];
            });

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act - simulate selection change
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert - should apply decorations for property and arguments
            expect(mockSetDecorations).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.objectContaining({
                        range: expect.objectContaining({
                            start: expect.objectContaining({ character: 79 }), // {UserId} in template
                            end: expect.objectContaining({ character: 87 })
                        })
                    }),
                    expect.objectContaining({
                        range: expect.objectContaining({
                            start: expect.objectContaining({ character: 121 }), // userId argument (after space)
                            end: expect.objectContaining({ character: 127 })
                        })
                    })
                ])
            );
        });

        test('should highlight property-argument pairs when Exception is first parameter (multi-line)', () => {
            // Arrange
            const lines = [
                'logger.LogError(new Exception("Connection timeout"),',
                '    "Processing failed for {UserId} with {ErrorCode}",',
                '    userId,',
                '    errorCode);'
            ];

            const fullText = lines.join('\n');
            const position = new (vscode as any).Position(1, 32); // On UserId property in line 1

            const range = new (vscode as any).Range(
                new (vscode as any).Position(0, 0),
                new (vscode as any).Position(3, lines[3].length)
            );

            mockFindSerilogRanges.mockReturnValue([range]);
            mockDocument.getText.mockReturnValue(fullText);
            mockDocument.lineAt.mockImplementation((line: number) => ({
                text: lines[line] || ''
            }));

            // Calculate positions in the full text
            const line1Start = lines[0].length + 1; // After first line + newline
            const line2Start = line1Start + lines[1].length + 1;
            const line3Start = line2Start + lines[2].length + 1;

            mockDocument.offsetAt.mockImplementation((pos: any) => {
                let offset = 0;
                for (let i = 0; i < pos.line; i++) {
                    offset += lines[i].length + 1;
                }
                return offset + pos.character;
            });

            mockDocument.positionAt.mockImplementation((offset: number) => {
                let line = 0;
                let remaining = offset;
                while (line < lines.length && remaining > lines[line].length) {
                    remaining -= lines[line].length + 1;
                    line++;
                }
                return new (vscode as any).Position(line, remaining);
            });

            // Mock string parser to find both string literals
            mockFindAllStringLiterals.mockReturnValue([
                {
                    type: 'regular',
                    content: 'Connection timeout',
                    contentStart: 31,  // Exception message
                    contentEnd: 49
                },
                {
                    type: 'regular',
                    content: 'Processing failed for {UserId} with {ErrorCode}',
                    contentStart: line1Start + 5,  // Template string on line 1
                    contentEnd: line1Start + 53
                }
            ]);

            // Parse template should return the properties
            mockParseTemplate.mockImplementation((template: string) => {
                if (template.includes('{UserId}')) {
                    return [
                        { startIndex: 22, endIndex: 30, name: 'UserId', type: 'standard' },
                        { startIndex: 36, endIndex: 46, name: 'ErrorCode', type: 'standard' }
                    ];
                }
                return [];
            });

            // Create a mock selection event
            const mockEvent = {
                textEditor: mockEditor,
                selections: [{
                    isEmpty: true,
                    active: position
                }]
            };

            // Act - simulate selection change
            const onSelectionChangeHandler = (highlighter as any).selectionChangeHandler;
            onSelectionChangeHandler.call(highlighter, mockEvent);

            // Assert - should apply decorations for property and arguments
            expect(mockSetDecorations).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.objectContaining({
                        range: expect.objectContaining({
                            start: expect.objectContaining({ line: 1, character: 27 }), // {UserId} in template
                            end: expect.objectContaining({ line: 1, character: 35 })
                        })
                    }),
                    expect.objectContaining({
                        range: expect.objectContaining({
                            start: expect.objectContaining({ line: 2, character: 4 }), // userId argument
                            end: expect.objectContaining({ line: 2, character: 10 })
                        })
                    })
                ])
            );
        });
    });
});