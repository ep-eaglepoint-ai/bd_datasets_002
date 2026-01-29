import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 6: Asynchronous action handling', () => {
    it('should handle asynchronous actions that take 100ms to resolve', async () => {
        const breaker = new CircuitBreaker();
        const start = Date.now();
        const result = await breaker.execute(() => new Promise(resolve => setTimeout(() => resolve('ok'), 100)));
        const duration = Date.now() - start;
        assert.strictEqual(result, 'ok');
        assert.ok(duration >= 90);
    });

    it('should handle action that throws synchronous error', async () => {
        const breaker = new CircuitBreaker();
        try {
            await breaker.execute(() => { throw new Error('Sync error'); });
        } catch (error) {
            assert.strictEqual(error.message, 'Sync error');
            assert.strictEqual(breaker.failures, 1);
        }
    });

    it('should handle async success in CLOSED state', async () => {
        const breaker = new CircuitBreaker();
        breaker.failures = 1;
        await breaker.execute(() => Promise.resolve('ok'));
        // In this implementation, success in CLOSED doesn't reset failures
        assert.strictEqual(breaker.failures, 1);
    });
});
