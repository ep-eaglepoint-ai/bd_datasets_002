const { cache } = require('../src/cache_manager');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Async Cache Update', () => {
    it('should eventually update the cache after the event', async () => {
        console.log("\n=== Bug Scenario 016: Async Sleep Test ===");
        
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
