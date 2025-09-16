import { isSerilogCall } from './serilogDetector';

describe('serilogDetector', () => {
    describe('isSerilogCall', () => {
        it('should detect standard Serilog method calls', () => {
            expect(isSerilogCall('logger.Information("Test")')).toBe(true);
            expect(isSerilogCall('_logger.LogInformation("Test")')).toBe(true);
            expect(isSerilogCall('log.Debug("Test")')).toBe(true);
            expect(isSerilogCall('Log.Warning("Test")')).toBe(true);
        });

        it('should detect BeginScope calls', () => {
            expect(isSerilogCall('logger.BeginScope("Operation={Operation} RequestId={RequestId}", "DataExport", Guid.NewGuid())')).toBe(true);
            expect(isSerilogCall('using (logger.BeginScope("Test"))')).toBe(true);
            expect(isSerilogCall('_logger.BeginScope(new Dictionary<string, object>())')).toBe(true);
        });

        it('should detect ForContext calls', () => {
            expect(isSerilogCall('logger.ForContext("UserId", userId)')).toBe(true);
            expect(isSerilogCall('_logger.ForContext<MyClass>()')).toBe(true);
        });

        it('should detect WriteTo configurations', () => {
            expect(isSerilogCall('.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss}]")')).toBe(true);
            expect(isSerilogCall('.WriteTo.File(outputTemplate: "{Message}")')).toBe(true);
        });

        it('should detect ExpressionTemplate', () => {
            expect(isSerilogCall('new ExpressionTemplate("{@t:HH:mm:ss}")')).toBe(true);
        });

        it('should detect Filter configurations', () => {
            expect(isSerilogCall('.Filter.ByExcluding("@p.ErrorDetails is not null")')).toBe(true);
            expect(isSerilogCall('.Filter.ByIncludingOnly("@l = \'Error\'")')).toBe(true);
        });

        it('should detect Enrich configurations', () => {
            expect(isSerilogCall('.Enrich.When("RequestPath like \'/api/%\'")')).toBe(true);
            expect(isSerilogCall('.Enrich.WithComputed("Duration", "@t - @p.StartTime")')).toBe(true);
        });

        it('should not detect non-Serilog calls', () => {
            expect(isSerilogCall('console.log("Test")')).toBe(false);
            expect(isSerilogCall('var test = "Something"')).toBe(false);
            expect(isSerilogCall('// This is a comment')).toBe(false);
        });

        it('should detect various logger variable names', () => {
            expect(isSerilogCall('myLogger.Information("Test")')).toBe(true);
            expect(isSerilogCall('serviceLog.Debug("Test")')).toBe(true);
            expect(isSerilogCall('audit_logger.Warning("Test")')).toBe(true);
            expect(isSerilogCall('applicationLogger.Error("Test")')).toBe(true);
        });

        it('should detect continuation lines', () => {
            expect(isSerilogCall('    .Information("Test")')).toBe(true);
            expect(isSerilogCall('        .LogDebug("Test")')).toBe(true);
        });
    });
});