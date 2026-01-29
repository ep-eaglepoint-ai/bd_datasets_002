import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 7: Concurrent calls', () => {
    it('should handle multiple concurrent calls at resetTimeout boundary', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 100 });

        // Trigger OPEN
        try { await breaker.execute(() => Promise.reject(new Error('Fail'))); } catch { }
        assert.strictEqual(breaker.state, 'OPEN');

        // wait
        await new Promise(r => setTimeout(r, 150));

        // Concurrent
        const results = await Promise.all([
            breaker.execute(() => Promise.resolve('A')),
            breaker.execute(() => Promise.resolve('B')),
            breaker.execute(() => Promise.resolve('C'))
        ]);

        assert.deepStrictEqual(results, ['A', 'B', 'C']);
        assert.strictEqual(breaker.state, 'CLOSED');
    });

    it('should handle concurrent failures consistently', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 5 });
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(breaker.execute(() => Promise.reject(new Error(`F${i}`))).catch(() => { }));
        }
        await Promise.all(promises);
        assert.strictEqual(breaker.state, 'OPEN');
        assert.strictEqual(breaker.failures, 10);
    });
});
