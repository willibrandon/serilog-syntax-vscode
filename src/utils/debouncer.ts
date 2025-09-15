/**
 * Debouncer utility to prevent excessive updates during rapid typing
 */
export class Debouncer {
    private timeout: NodeJS.Timeout | undefined;
    private readonly delay: number;

    constructor(delay: number = 100) {
        this.delay = delay;
    }

    /**
     * Schedule a function to run after the delay
     * Cancels any previously scheduled execution
     */
    debounce(fn: () => void): void {
        this.cancel();
        this.timeout = setTimeout(fn, this.delay);
    }

    /**
     * Cancel any pending execution
     */
    cancel(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    /**
     * Dispose of the debouncer
     */
    dispose(): void {
        this.cancel();
    }
}