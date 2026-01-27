const { cache } = require('../src/cache_manager');

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

describe('Async Cache Update', () => {
    it('should eventually update the cache after the event', async () => {
        console.log("\n=== Bug Scenario 016: Async Sleep Test ===");

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