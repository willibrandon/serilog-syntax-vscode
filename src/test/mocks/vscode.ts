// Mock vscode module for testing
export const window = {
    activeTextEditor: undefined,
    createTextEditorDecorationType: jest.fn(() => ({
        dispose: jest.fn()
    }))
};

export const workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn()
    }))
};

export const Uri = {
    file: jest.fn((path: string) => ({ fsPath: path }))
};

export const Range = jest.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar }
}));

export const Position = jest.fn((line: number, char: number) => ({
    line,
    character: char
}));

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export class EventEmitter {
    fire = jest.fn();
    event = jest.fn();
    dispose = jest.fn();
}

export default {
    window,
    workspace,
    Uri,
    Range,
    Position,
    DiagnosticSeverity,
    EventEmitter
};