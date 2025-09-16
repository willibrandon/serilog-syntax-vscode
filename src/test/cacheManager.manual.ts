// Test for cache manager performance optimization
import { CacheManager } from '../utils/cacheManager';

function testCacheManager() {
    console.log('=== Cache Manager Test ===\n');

    let failures = 0;

    // Test 1: Basic get/set
    const cache = new CacheManager<string>(3, 60000); // Small cache for testing
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const val1 = cache.get('key1');
    if (val1 === 'value1') {
        console.log('✅ Basic get/set works');
    } else {
        console.log(`❌ Basic get/set failed: expected 'value1', got '${val1}'`);
        failures++;
    }

    // Test 2: Cache miss
    const val3 = cache.get('key3');
    if (val3 === undefined) {
        console.log('✅ Cache miss returns undefined');
    } else {
        console.log(`❌ Cache miss failed: expected undefined, got '${val3}'`);
        failures++;
    }

    // Test 3: LRU eviction
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key2 (least recently used)

    const val2 = cache.get('key2');
    if (val2 === undefined) {
        console.log('✅ LRU eviction works');
    } else {
        console.log(`❌ LRU eviction failed: key2 should have been evicted`);
        failures++;
    }

    // Test 4: Recently accessed items are kept
    const val1Again = cache.get('key1');
    if (val1Again === 'value1') {
        console.log('✅ Recently accessed items are retained');
    } else {
        console.log(`❌ Recently accessed item was evicted`);
        failures++;
    }

    // Test 5: Cache size
    if (cache.size() === 3) {
        console.log('✅ Cache size limit is enforced');
    } else {
        console.log(`❌ Cache size incorrect: expected 3, got ${cache.size()}`);
        failures++;
    }

    // Test 6: Clear cache
    cache.clear();
    if (cache.size() === 0) {
        console.log('✅ Cache clear works');
    } else {
        console.log(`❌ Cache clear failed: size is ${cache.size()}`);
        failures++;
    }

    // Test 7: Expiration (with short timeout)
    const shortCache = new CacheManager<string>(10, 100); // 100ms expiry
    shortCache.set('expire', 'test');

    // Wait 150ms and check if expired
    setTimeout(() => {
        const expired = shortCache.get('expire');
        if (expired === undefined) {
            console.log('✅ Cache expiration works');
        } else {
            console.log(`❌ Cache expiration failed: item should have expired`);
            failures++;
        }

        console.log('\n=== SUMMARY ===');
        if (failures === 0) {
            console.log('✅ All cache manager tests passed!');
            console.log('Phase 8: Performance Optimization - Cache Manager COMPLETE');
        } else {
            throw new Error(`FAILURE: ${failures} cache manager tests failed!`);
        }
    }, 150);
}

// Run the test
testCacheManager();