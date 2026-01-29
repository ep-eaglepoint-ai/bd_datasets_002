import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 3: Half-Open Recovery path', () => {
    it('should reset to CLOSED on successful action in HALF_OPEN state', async () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'HALF_OPEN';
        breaker.failures = 3;
        breaker.lastFailureTime = Date.now();

        const result = await breaker.execute(() => Promise.resolve('success'));

        assert.strictEqual(result, 'success');
        assert.strictEqual(breaker.state, 'CLOSED');
        assert.strictEqual(breaker.failures, 0);
        assert.strictEqual(breaker.lastFailureTime, null);
    });

    it('should handle successful async action in HALF_OPEN state', async () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'HALF_OPEN';
        const result = await breaker.execute(() => new Promise(resolve => setTimeout(() => resolve('async-ok'), 10)));
        assert.strictEqual(result, 'async-ok');
        assert.strictEqual(breaker.state, 'CLOSED');
    });
});
