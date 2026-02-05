/**
 * Request Coalescer Tests
 * 
 * Requirement 4: The system must handle a 'thundering herd' scenario where 
 * 100 clients refresh the page and request historical data simultaneously.
 */

const { RequestCoalescer } = require('../../repository_after/server/src/thunderingHerd/RequestCoalescer');

describe('RequestCoalescer', () => {
  let coalescer;

  beforeEach(() => {
    coalescer = new RequestCoalescer({
      cacheTTLMs: 1000,
      maxConcurrent: 5
    });
  });

  afterEach(() => {
    coalescer.clear();
  });

  describe('Basic Operations', () => {
    test('should execute fetcher and return result', async () => {
      const result = await coalescer.execute('key-1', async () => {
        return { data: 'test' };
      });
      
      expect(result).toEqual({ data: 'test' });
    });

    test('should generate consistent keys', () => {
      const key1 = coalescer.generateKey('sensor-001', 1000, 2000);
      const key2 = coalescer.generateKey('sensor-001', 1000, 2000);
      
      expect(key1).toBe(key2);
    });

    test('should round timestamps for better cache hits', () => {
      const key1 = coalescer.generateKey('sensor-001', 1001, 2001);
      const key2 = coalescer.generateKey('sensor-001', 1999, 2999);
      
      // Both should round to same second
      expect(key1).toBe(key2);
    });
  });

  describe('Caching', () => {
    test('should cache results', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { data: 'cached' };
      };
      
      await coalescer.execute('key-1', fetcher);
      await coalescer.execute('key-1', fetcher);
      
      expect(callCount).toBe(1);
      expect(coalescer.getStats().cacheHits).toBe(1);
    });

    test('should expire cache after TTL', async () => {
      const shortCoalescer = new RequestCoalescer({ cacheTTLMs: 50 });
      let callCount = 0;
      
      await shortCoalescer.execute('key-1', async () => {
        callCount++;
        return { call: callCount };
      });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await shortCoalescer.execute('key-1', async () => {
        callCount++;
        return { call: callCount };
      });
      
      expect(callCount).toBe(2);
    });
  });

  describe('Request Coalescing', () => {
    test('should coalesce concurrent identical requests', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'result' };
      };
      
      // Fire 10 concurrent requests with same key
      const promises = Array(10).fill(null).map(() => 
        coalescer.execute('key-1', fetcher)
      );
      
      const results = await Promise.all(promises);
      
      // Should only have called fetcher once
      expect(callCount).toBe(1);
      expect(coalescer.getStats().coalesced).toBe(9);
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual({ data: 'result' });
      });
    });

    test('should not coalesce requests with different keys', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 20));
        return { call: callCount };
      };
      
      const promises = [
        coalescer.execute('key-1', fetcher),
        coalescer.execute('key-2', fetcher),
        coalescer.execute('key-3', fetcher)
      ];
      
      await Promise.all(promises);
      
      expect(callCount).toBe(3);
    });
  });

  describe('Thundering Herd Protection - Requirement 4', () => {
    test('should handle 100 concurrent identical requests', async () => {
      let callCount = 0;
      const heavyOperation = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { data: Array(100).fill('x') };
      };
      
      // Simulate 100 clients requesting same data
      const promises = Array(100).fill(null).map(() => 
        coalescer.execute('historical-data', heavyOperation)
      );
      
      const results = await Promise.all(promises);
      
      // Should coalesce most requests
      expect(callCount).toBeLessThanOrEqual(5); // May need a few due to timing
      expect(results).toHaveLength(100);
      
      const stats = coalescer.getStats();
      expect(stats.coalesced).toBeGreaterThan(90);
    });

    test('should limit concurrent operations with semaphore', async () => {
      const limitedCoalescer = new RequestCoalescer({
        cacheTTLMs: 0, // No caching
        maxConcurrent: 2
      });
      
      let concurrent = 0;
      let maxConcurrent = 0;
      
      const heavyOperation = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return { done: true };
      };
      
      // Different keys so no coalescing
      const promises = Array(10).fill(null).map((_, i) => 
        limitedCoalescer.execute(`key-${i}`, heavyOperation)
      );
      
      await Promise.all(promises);
      
      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(limitedCoalescer.getStats().queued).toBeGreaterThan(0);
    });

    test('should handle concurrent requests for different sensors', async () => {
      const callsByKey = {};
      const fetcher = (key) => async () => {
        callsByKey[key] = (callsByKey[key] || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { sensor: key };
      };
      
      // 20 requests each for 5 different sensors
      const promises = [];
      for (let s = 0; s < 5; s++) {
        for (let r = 0; r < 20; r++) {
          const key = `sensor-${s}`;
          promises.push(coalescer.execute(key, fetcher(key)));
        }
      }
      
      await Promise.all(promises);
      
      // Each sensor should have minimal actual fetches
      const totalFetches = Object.values(callsByKey).reduce((a, b) => a + b, 0);
      expect(totalFetches).toBeLessThanOrEqual(10);
    });
  });

  describe('Statistics', () => {
    test('should track accurate statistics', async () => {
      // Cache miss + fetch
      await coalescer.execute('key-1', async () => 'data1');
      
      // Cache hit
      await coalescer.execute('key-1', async () => 'data1');
      
      const stats = coalescer.getStats();
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should reset statistics', async () => {
      await coalescer.execute('key-1', async () => 'data');
      coalescer.resetStats();
      
      const stats = coalescer.getStats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle fetcher errors gracefully', async () => {
      const failingFetcher = async () => {
        throw new Error('Fetch failed');
      };
      
      await expect(coalescer.execute('key-1', failingFetcher))
        .rejects.toThrow('Fetch failed');
      
      // Should not cache failed results
      expect(coalescer.getStats().cacheSize).toBe(0);
    });

    test('should cleanup expired cache entries', async () => {
      const shortCoalescer = new RequestCoalescer({ cacheTTLMs: 50 });
      
      await shortCoalescer.execute('key-1', async () => 'data');
      expect(shortCoalescer.getStats().cacheSize).toBe(1);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      shortCoalescer.cleanupCache();
      
      expect(shortCoalescer.getStats().cacheSize).toBe(0);
    });
  });
});
