const repo = process.env.REPO || 'after';
const cachePath = repo === 'before' ? '../repository_before/src/cache_manager' : '../repository_after/src/cache_manager';
const { cache } = require(cachePath);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForCacheUpdate(key, expectedValue, timeoutMs = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        if (cache.get(key) === expectedValue) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 10)); // poll every 10ms
    }
    throw new Error(`Cache update for key '${key}' did not complete within ${timeoutMs}ms`);
}
console.log(`REPO env: ${repo}`);

if (repo === 'after') {
    describe('Async Cache Update (after)', () => {
        it('should eventually update the cache after the event', async () => {
            console.log("\n=== Testing repository_after ===");

            const key = 'user_set';
            const val = 'active';
            cache.update(key, val);

            console.log("Waiting for cache update (polling)...");

            await waitForCacheUpdate(key, val);

            const result = cache.get(key);

            try {
                expect(result).toBe(val);
                console.log("✅ Test Passed");
            } catch (error) {
                console.log("❌ Test Failed!");
                throw error;
            }
        });
    });
} else if (repo === 'before') {
    describe('Async Cache Update (before)', () => {
        it('should eventually update the cache after the event', async () => {
            console.log("\n=== Testing repository_before ===");

            const key = 'user_set';
            const val = 'active';
            cache.update(key, val);

            console.log("Waiting for 100ms (Hardcoded sleep)...");

            await sleep(100);

            const result = cache.get(key);

            try {
                expect(result).toBe(val);
                console.log("✅ Test Passed (The race was won this time)");
            } catch (error) {
                console.log("❌ Test Failed! The cache wasn't updated in time.");
                throw error;
            }
        });
    });
} else {
    describe('Async Cache Update (default)', () => {
        it('should eventually update the cache after the event', async () => {
            console.log("\n=== Testing default (polling) ===");

            const key = 'user_set';
            const val = 'active';
            cache.update(key, val);

            console.log("Waiting for cache update (polling)...");

            await waitForCacheUpdate(key, val);

            const result = cache.get(key);

            try {
                expect(result).toBe(val);
                console.log("✅ Test Passed");
            } catch (error) {
                console.log("❌ Test Failed!");
                throw error;
            }
        });
    });
}

describe('Cache Functionality', () => {
    it('should set and get a value synchronously', () => {
        const key = 'sync_key';
        const val = 'sync_value';
        cache.store.set(key, val); // direct set to avoid async
        const result = cache.get(key);
        expect(result).toBe(val);
    });
});