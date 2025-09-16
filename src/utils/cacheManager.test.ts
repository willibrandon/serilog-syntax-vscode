import { CacheManager } from './cacheManager';

describe('CacheManager', () => {
    let cache: CacheManager<string>;

    beforeEach(() => {
        cache = new CacheManager<string>(3, 1000); // max 3 items, 1 second TTL
    });

    describe('Basic Operations', () => {
        it('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return undefined for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
        });

        it('should update existing values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');

            cache.set('key1', 'value2');
            expect(cache.get('key1')).toBe('value2');
        });

        it('should clear all values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            cache.clear();

            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(false);
            expect(cache.size()).toBe(0);
        });

        it('should report correct size', () => {
            expect(cache.size()).toBe(0);

            cache.set('key1', 'value1');
            expect(cache.size()).toBe(1);

            cache.set('key2', 'value2');
            expect(cache.size()).toBe(2);

            cache.clear();
            expect(cache.size()).toBe(0);
        });
    });

    describe('LRU Eviction', () => {
        it('should evict least recently used item when max size exceeded', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.set('key4', 'value4'); // Should evict key1

            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should update LRU order on get', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access key1 to make it most recently used
            cache.get('key1');

            cache.set('key4', 'value4'); // Should evict key2 (least recently used)

            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should update LRU order on set for existing key', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Update key1 to make it most recently used
            cache.set('key1', 'newValue1');

            cache.set('key4', 'value4'); // Should evict key2

            expect(cache.get('key1')).toBe('newValue1');
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('TTL Expiration', () => {
        it('should expire items after TTL', (done) => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');

            setTimeout(() => {
                expect(cache.get('key1')).toBeUndefined();
                expect(cache.has('key1')).toBe(false);
                done();
            }, 1100); // Wait for TTL to expire
        });

        it('should not expire items before TTL', (done) => {
            cache.set('key1', 'value1');

            setTimeout(() => {
                expect(cache.get('key1')).toBe('value1');
                expect(cache.has('key1')).toBe(true);
                done();
            }, 500); // Half of TTL
        });

        it('should reset TTL on set', (done) => {
            cache.set('key1', 'value1');

            setTimeout(() => {
                cache.set('key1', 'value2'); // Reset TTL
            }, 500);

            setTimeout(() => {
                expect(cache.get('key1')).toBe('value2'); // Should still exist
                done();
            }, 900); // Original would have expired, but TTL was reset
        });

        it('should prune expired entries', (done) => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            setTimeout(() => {
                cache.pruneExpired();
                expect(cache.has('key1')).toBe(false);
                expect(cache.has('key2')).toBe(false);
                expect(cache.size()).toBe(0);
                done();
            }, 1100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero max size', () => {
            const emptyCache = new CacheManager<string>(0, 1000);
            emptyCache.set('key1', 'value1');
            // With max size 0, the cache should not store anything
            expect(emptyCache.size()).toBe(0);
        });

        it('should handle negative max size as zero', () => {
            const negativeCache = new CacheManager<string>(-1, 1000);
            negativeCache.set('key1', 'value1');
            // Negative max size should be treated as 0
            expect(negativeCache.size()).toBe(0);
        });

        it('should handle complex objects as values', () => {
            const objectCache = new CacheManager<any>(3, 1000);
            const complexObject = {
                id: 1,
                nested: { data: 'test' },
                array: [1, 2, 3]
            };

            objectCache.set('complex', complexObject);
            expect(objectCache.get('complex')).toEqual(complexObject);
        });

        it('should handle special characters in keys', () => {
            const specialKey = 'key:with:special@chars#123';
            cache.set(specialKey, 'value');
            expect(cache.get(specialKey)).toBe('value');
        });

        it('should handle empty string as key', () => {
            cache.set('', 'emptyKey');
            expect(cache.get('')).toBe('emptyKey');
        });

        it('should handle null and undefined values', () => {
            const nullCache = new CacheManager<any>(3, 1000);
            nullCache.set('null', null);
            nullCache.set('undefined', undefined);

            expect(nullCache.get('null')).toBeNull();
            expect(nullCache.get('undefined')).toBeUndefined();
            expect(nullCache.has('undefined')).toBe(true); // Key exists even with undefined value
        });
    });

    describe('Performance', () => {
        it('should handle many items efficiently', () => {
            const largeCache = new CacheManager<string>(1000, 10000);
            const startTime = Date.now();

            // Add 1000 items
            for (let i = 0; i < 1000; i++) {
                largeCache.set(`key${i}`, `value${i}`);
            }

            // Access all items
            for (let i = 0; i < 1000; i++) {
                largeCache.get(`key${i}`);
            }

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100); // Should complete in less than 100ms
        });

        it('should maintain correct size after many operations', () => {
            const maxSize = 100;
            const testCache = new CacheManager<string>(maxSize, 10000);

            // Add more items than max size
            for (let i = 0; i < 200; i++) {
                testCache.set(`key${i}`, `value${i}`);
            }

            // Should not exceed max size
            expect(testCache.size()).toBeLessThanOrEqual(maxSize);

            // Count actual items in cache
            let count = 0;
            for (let i = 0; i < 200; i++) {
                if (testCache.has(`key${i}`)) {
                    count++;
                }
            }

            expect(count).toBeLessThanOrEqual(maxSize);
        });

        it('should handle rapid set/get operations', () => {
            const iterations = 1000;
            const start = Date.now();

            for (let i = 0; i < iterations; i++) {
                cache.set(`key${i % 3}`, `value${i}`); // Cycle through 3 keys
                cache.get(`key${i % 3}`);
            }

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50); // Should be very fast
        });
    });

    describe('Access Count Behavior', () => {
        it('should track access count correctly', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access key2 multiple times
            cache.get('key2');
            cache.get('key2');
            cache.get('key2');

            // Access key3 once
            cache.get('key3');

            // Key1 has 0 access count, should be evicted first
            cache.set('key4', 'value4');

            expect(cache.has('key1')).toBe(false); // Evicted (0 accesses)
            expect(cache.has('key2')).toBe(true);  // Kept (3 accesses)
            expect(cache.has('key3')).toBe(true);  // Kept (1 access)
            expect(cache.has('key4')).toBe(true);  // Just added
        });
    });
});