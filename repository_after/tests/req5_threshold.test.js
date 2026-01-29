import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 5: Failure threshold boundary', () => {
    it('should handle failure threshold boundary (2nd failure keeps CLOSED, 3rd triggers OPEN)', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 3 });

        // 1st
        try { await breaker.execute(() => Promise.reject(new Error('F1'))); } catch { }
        assert.strictEqual(breaker.state, 'CLOSED');
        assert.strictEqual(breaker.failures, 1);

        // 2nd
        try { await breaker.execute(() => Promise.reject(new Error('F2'))); } catch { }
        assert.strictEqual(breaker.state, 'CLOSED');
        assert.strictEqual(breaker.failures, 2);

        // 3rd
        try { await breaker.execute(() => Promise.reject(new Error('F3'))); } catch { }
        assert.strictEqual(breaker.state, 'OPEN');
        assert.strictEqual(breaker.failures, 3);
    });

    it('should transition immediately with threshold 1', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1 });
        try { await breaker.execute(() => Promise.reject(new Error('Fail'))); } catch { }
        assert.strictEqual(breaker.state, 'OPEN');
    });
});
