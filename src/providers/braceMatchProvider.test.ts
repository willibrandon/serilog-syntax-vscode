import { SerilogBraceMatchProvider } from './braceMatchProvider';
import * as vscode from 'vscode';
import { isSerilogCall } from '../utils/serilogDetector';
import { StringLiteralParser } from '../utils/stringLiteralParser';

jest.mock('vscode');
jest.mock('../utils/serilogDetector');
jest.mock('../utils/stringLiteralParser');

describe('SerilogBraceMatchProvider - REAL FAILING CASE', () => {
    test('should match braces on the exact failing line', () => {
        // This is the EXACT code that's failing in real usage
        const lines = [
            '        var templateConfig = new LoggerConfiguration()',
            '            .WriteTo.Console(new ExpressionTemplate(',
            '                "[{@t:HH:mm:ss} {@l:u3}] {#if SourceContext is not null}[{Substring(SourceContext, LastIndexOf(SourceContext, \'.\') + 1)}]{#end} {@m}\\n{@x}"))',
            '            .WriteTo.File(new ExpressionTemplate('
        ];

        // Mock vscode ThemeColor
        (vscode as any).ThemeColor = jest.fn().mockImplementation((id: string) => ({ id }));

        // Mock vscode Position and Range
        (vscode as any).Position = jest.fn().mockImplementation((line: number, character: number) => ({
            line,
            character
        }));

        (vscode as any).Range = jest.fn().mockImplementation((start: any, end: any) => ({
            start,
            end
        }));

        // Mock string parser BEFORE creating provider
        const mockFindAllStringLiterals = jest.fn();
        StringLiteralParser.prototype.findAllStringLiterals = mockFindAllStringLiterals;

        // Return the string literal when found
        mockFindAllStringLiterals.mockImplementation((text: string) => {
            // Find string literals more accurately
            const regex = /"([^"\\]|\\.)*"/g;
            const literals = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                const contentStart = match.index + 1; // After opening quote
                const content = match[0].slice(1, -1); // Remove quotes
                const contentEnd = contentStart + content.length;
                literals.push({
                    type: 'regular',
                    content: content,
                    contentStart: contentStart,
                    contentEnd: contentEnd
                });
            }
            return literals;
        });

        const provider = new SerilogBraceMatchProvider();
        const mockEditor: any = {};
        const mockDocument: any = {};
        const mockSetDecorations = jest.fn();

        // Mock document
        mockDocument.languageId = 'csharp';
        mockDocument.lineAt = jest.fn((line: number) => ({
            text: lines[line] || ''
        }));
        mockDocument.lineCount = lines.length;
        mockDocument.getText = jest.fn(() => lines.join('\n'));

        // Position on the opening { of {@t} on line 2
        // Line 2: '                "[{@t:HH:mm:ss} {@l:u3}] ...'
        // Count:   0123456789012345678901234567890
        // The quote is at position 17, [ at 18, { at position 19
        const position = new (vscode as any).Position(2, 19);

        mockDocument.offsetAt = jest.fn((pos: any) => {
            let offset = 0;
            for (let i = 0; i < pos.line; i++) {
                offset += lines[i].length + 1; // +1 for newline
            }
            return offset + pos.character;
        });

        mockDocument.positionAt = jest.fn((offset: number) => {
            let line = 0;
            let remaining = offset;
            while (line < lines.length && remaining > lines[line].length) {
                remaining -= lines[line].length + 1;
                line++;
            }
            return new (vscode as any).Position(line, remaining);
        });

        // Mock editor
        mockEditor.document = mockDocument;
        mockEditor.selection = { active: position };
        mockEditor.setDecorations = mockSetDecorations;

        // Mock isSerilogCall
        const mockIsSerilogCall = isSerilogCall as jest.MockedFunction<typeof isSerilogCall>;
        mockIsSerilogCall.mockImplementation((line: string) => {
            return line.includes('ExpressionTemplate') ||
                   line.includes('LogInformation') ||
                   line.includes('LogWarning') ||
                   line.includes('LogError') ||
                   line.includes('LogDebug') ||
                   line.includes('WriteTo');
        });


        // Mock vscode APIs
        const mockDecorationType = { dispose: jest.fn() };
        (vscode.window.createTextEditorDecorationType as jest.Mock).mockReturnValue(mockDecorationType);
        (vscode.window as any).activeTextEditor = mockEditor;

        // Act
        provider.updateBraceMatching(mockEditor);

        // Assert - should have called setDecorations twice (once to clear, once to set)
        expect(mockSetDecorations).toHaveBeenCalledTimes(2);

        // Should have set decorations for the matching braces
        const decorations = mockSetDecorations.mock.calls[1]?.[1];
        expect(decorations).toBeDefined();
        expect(decorations.length).toBe(2); // Opening and closing brace

        provider.dispose();
    });
});

describe('SerilogBraceMatchProvider', () => {
    let provider: SerilogBraceMatchProvider;
    let mockEditor: any;
    let mockDocument: any;
    let mockSetDecorations: jest.Mock;
    let mockIsSerilogCall: jest.MockedFunction<typeof isSerilogCall>;
    let mockFindAllStringLiterals: jest.Mock;

    beforeEach(() => {
        // Mock vscode ThemeColor
        (vscode as any).ThemeColor = jest.fn().mockImplementation((id: string) => ({ id }));

        // Mock vscode Position and Range
        (vscode as any).Position = jest.fn().mockImplementation((line: number, character: number) => ({
            line,
            character,
            translate: jest.fn((lineDelta?: number, charDelta?: number) =>
                new (vscode as any).Position(
                    line + (lineDelta || 0),
                    character + (charDelta || 0)
                )
            )
        }));

        (vscode as any).Range = jest.fn().mockImplementation((start: any, end: any) => ({
            start,
            end
        }));

        // Mock document
        mockDocument = {
            languageId: 'csharp',
            lineAt: jest.fn(),
            lineCount: 10,
            getText: jest.fn(),
            offsetAt: jest.fn(),
            positionAt: jest.fn()
        };

        // Mock editor
        mockSetDecorations = jest.fn();
        mockEditor = {
            document: mockDocument,
            selection: {
                active: new (vscode as any).Position(0, 0)
            },
            setDecorations: mockSetDecorations
        };

        // Mock vscode APIs
        const mockDecorationType = {
            dispose: jest.fn()
        };
        (vscode.window.createTextEditorDecorationType as jest.Mock).mockReturnValue(mockDecorationType);
        (vscode.window as any).activeTextEditor = mockEditor;

        // Mock Serilog detector
        mockIsSerilogCall = isSerilogCall as jest.MockedFunction<typeof isSerilogCall>;
        mockIsSerilogCall.mockReturnValue(true);

        // Mock string parser
        mockFindAllStringLiterals = jest.fn();
        StringLiteralParser.prototype.findAllStringLiterals = mockFindAllStringLiterals;

        provider = new SerilogBraceMatchProvider();
    });

    afterEach(() => {
        if (provider) {
            provider.dispose();
        }
    });

    describe('Message Templates', () => {
        test('should match braces in simple property', () => {
            // Arrange
            const lineText = 'logger.LogInformation("User {UserId} logged in", userId);';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 29); // On opening brace of {UserId}

            mockDocument.getText.mockReturnValue(lineText);
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

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledTimes(2); // Clear + set
            const decorations = mockSetDecorations.mock.calls[1][1];
            expect(decorations).toHaveLength(2); // Opening and closing brace
            // The { is at position 5 in the content, which starts at 23, so absolute position is 28
            expect(decorations[0].start.character).toBe(28); // Opening { (23 + 5)
            expect(decorations[1].start.character).toBe(35); // Closing } (23 + 12)
        });

        test('should handle nested properties', () => {
            // This is actually invalid Serilog syntax but tests nested brace handling
            const lineText = 'logger.LogInformation("Data {{nested}} here", data);';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 29); // On first {

            mockDocument.getText.mockReturnValue(lineText);
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'Data {{nested}} here',
                contentStart: 23,
                contentEnd: 43
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
        });
    });

    describe('Output Templates', () => {
        test('should match braces in output template', () => {
            const lineText = '.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}")';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 36); // On { of {Timestamp}

            mockDocument.getText.mockReturnValue(lineText);
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}',
                contentStart: 35,
                contentEnd: 82
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[1][1];
            expect(decorations).toHaveLength(2);
        });
    });

    describe('Serilog.Expressions', () => {
        test('should match braces in if expression', () => {
            const lineText = '.Filter.ByExcluding("{#if Level = \'Error\'} {@m} {#end}")';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 21); // On { of {#if

            mockDocument.getText.mockReturnValue(lineText);
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '{#if Level = \'Error\'} {@m} {#end}',
                contentStart: 21,
                contentEnd: 55
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[1][1];
            expect(decorations).toHaveLength(2);
            // Should match the {#if ... } brace
            expect(decorations[0].start.character).toBe(21); // Opening {
            // Note: The closing } for {#if Level = 'Error'} is actually much further
            // The implementation now correctly finds the immediate closing brace
            expect(decorations[1].start.character).toBe(41); // Closing } of {#if
        });

        test('should match braces for {@m} in expression', () => {
            const lineText = '.Filter.ByExcluding("{#if Level = \'Error\'} {@m} {#end}")';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 43); // On { of {@m}

            mockDocument.getText.mockReturnValue(lineText);
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '{#if Level = \'Error\'} {@m} {#end}',
                contentStart: 21,
                contentEnd: 55
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
            const decorations = mockSetDecorations.mock.calls[1][1];
            expect(decorations).toHaveLength(2);
            expect(decorations[0].start.character).toBe(43); // Opening { of {@m}
            expect(decorations[1].start.character).toBe(46); // Closing } of {@m}
        });

        test('should handle complex nested expressions', () => {
            const lineText = 'new ExpressionTemplate("{#if @l = \'Error\'}{@m}{#else}Normal: {@m}{#end}")';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 24); // On { of {#if

            mockDocument.getText.mockReturnValue(lineText);
            mockDocument.offsetAt.mockImplementation((pos: any) => pos.character);
            mockDocument.positionAt.mockImplementation((offset: number) =>
                new (vscode as any).Position(0, offset)
            );

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: '{#if @l = \'Error\'}{@m}{#else}Normal: {@m}{#end}',
                contentStart: 24,
                contentEnd: 72
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
        });
    });

    describe('ESC Handler', () => {
        test('should clear highlights when clearHighlights is called', () => {
            // Arrange
            const text = 'logger.LogInformation("User {UserId} logged in", userId);';

            // Mock vscode window
            const mockSetDecorations = jest.fn();
            const mockEditor: any = {
                document: {
                    languageId: 'csharp',
                    lineAt: jest.fn(() => ({ text: text })),
                    getText: jest.fn(() => text),
                    offsetAt: jest.fn((pos: any) => pos.character),
                    positionAt: jest.fn((offset: number) => new (vscode as any).Position(0, offset))
                },
                selection: {
                    active: new (vscode as any).Position(0, 29) // On { of {UserId}
                },
                setDecorations: mockSetDecorations
            };

            (vscode.window as any).activeTextEditor = mockEditor;

            // Mock isSerilogCall
            (isSerilogCall as jest.Mock).mockReturnValue(true);

            // Mock string parser
            const mockFindAllStringLiterals = jest.fn();
            StringLiteralParser.prototype.findAllStringLiterals = mockFindAllStringLiterals;
            mockFindAllStringLiterals.mockReturnValue([{
                type: 'regular',
                content: 'User {UserId} logged in',
                contentStart: 23,
                contentEnd: 47
            }]);

            const provider = new SerilogBraceMatchProvider();

            // Act - First update to set highlights
            provider.updateBraceMatching(mockEditor);

            // Assert - Highlights are set
            expect(mockSetDecorations).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.any(Object),
                    expect.any(Object)
                ])
            );

            // Act - Clear highlights
            provider.clearHighlights();

            // Assert - Highlights are cleared
            expect(mockSetDecorations).toHaveBeenLastCalledWith(
                expect.anything(),
                []
            );
        });
    });

    describe('Edge Cases', () => {
        test('should not match when cursor not on brace', () => {
            const lineText = 'logger.LogInformation("User {UserId} logged in", userId);';
            mockDocument.lineAt.mockReturnValue({ text: lineText });
            mockEditor.selection.active = new (vscode as any).Position(0, 31); // On UserId text

            mockDocument.getText.mockReturnValue(lineText);
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

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []); // Should clear
        });

        test('should handle multi-line templates', () => {
            const lines = [
                'logger.LogInformation(@"',
                'User {UserId}',
                'logged in at {Time}",'
            ];

            mockDocument.lineAt.mockImplementation((line: number) => ({ text: lines[line] }));
            mockDocument.lineCount = lines.length;
            mockEditor.selection.active = new (vscode as any).Position(1, 5); // On { of {UserId}

            const fullText = lines.join('\n');
            mockDocument.getText.mockReturnValue(fullText);
            mockDocument.offsetAt.mockImplementation((pos: any) => {
                let offset = 0;
                for (let i = 0; i < pos.line; i++) {
                    offset += lines[i].length + 1; // +1 for newline
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

            mockFindAllStringLiterals.mockReturnValue([{
                type: 'verbatim',
                content: '\nUser {UserId}\nlogged in at {Time}',
                contentStart: 25,
                contentEnd: 60
            }]);

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalled();
        });

        test('should clear decorations for non-C# documents', () => {
            mockDocument.languageId = 'javascript';

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).not.toHaveBeenCalled();
        });

        test('should clear decorations when not in Serilog call', () => {
            mockIsSerilogCall.mockReturnValue(false);
            const lineText = 'var text = "Some {text} here";';
            mockDocument.lineAt.mockReturnValue({ text: lineText });

            // Mock isInMultiLineSerilogCall to also return false
            mockDocument.lineAt.mockImplementation((line: number) => ({
                text: line === 0 ? lineText : ''
            }));

            // Act
            provider.updateBraceMatching(mockEditor);

            // Assert
            expect(mockSetDecorations).toHaveBeenCalledWith(expect.anything(), []);
        });
    });
});