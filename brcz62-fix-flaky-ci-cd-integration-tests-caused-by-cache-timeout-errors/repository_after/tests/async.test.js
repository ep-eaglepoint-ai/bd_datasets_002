const { cache } = require('../src/cache_manager');

describe('Async Cache Update', () => {
    it('should eventually update the cache after the event', async () => {
        console.log("\n=== Bug Scenario 016: Async Event-Listener Test ===");

        const key = 'user_set';
        const val = 'active';
        cache.update(key, val);

        console.log("Waiting for cache update (event-listener with 5s timeout)...");

        // Use event-listener approach with 5-second timeout
        // This eliminates setTimeout polling and uses native event system
        await cache.waitForKey(key);

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