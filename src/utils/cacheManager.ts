/**
 * LRU Cache implementation for storing parsed templates and expressions
 * Improves performance by avoiding re-parsing of the same templates
 */
export class CacheManager<T> {
    private cache: Map<string, { value: T; timestamp: number; accessCount: number }>;
    private readonly maxSize: number;
    private readonly maxAge: number;

    constructor(maxSize: number = 100, maxAge: number = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.maxAge = maxAge;
    }

    /**
     * Get a value from the cache
     * Returns undefined if not found or expired
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return undefined;
        }

        // Update access count for LRU
        entry.accessCount++;

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set a value in the cache
     * Evicts least recently used items if cache is full
     */
    set(key: string, value: T): void {
        // Don't store anything if maxSize is 0 or negative
        if (this.maxSize <= 0) {
            return;
        }

        // If updating existing key, preserve its access count
        const existing = this.cache.get(key);
        const accessCount = existing ? existing.accessCount : 0;

        // If cache is full, remove least recently used item
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const lruKey = this.findLRU();
            if (lruKey) {
                this.cache.delete(lruKey);
            }
        }

        // Delete and re-add to move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            accessCount
        });
    }

    /**
     * Find the least recently used key
     */
    private findLRU(): string | undefined {
        let lruKey: string | undefined;
        let minAccessCount = Infinity;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            // First priority: access count
            if (entry.accessCount < minAccessCount ||
                (entry.accessCount === minAccessCount && entry.timestamp < oldestTime)) {
                lruKey = key;
                minAccessCount = entry.accessCount;
                oldestTime = entry.timestamp;
            }
        }

        return lruKey;
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get the current size of the cache
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Check if a key exists in the cache (without updating access)
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        // Check if expired
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Remove expired entries from cache
     */
    pruneExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}