import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 4: Half-Open Failure path', () => {
    it('should transition back to OPEN on failure in HALF_OPEN state', async () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'HALF_OPEN';
        const failTime = 1000;
        breaker.lastFailureTime = failTime;

        try {
            await breaker.execute(() => Promise.reject(new Error('Half-open failure')));
        } catch (error) {
            assert.strictEqual(error.message, 'Half-open failure');
        }
        assert.strictEqual(breaker.state, 'OPEN');
    });

    it('should transition back to OPEN on async failure in HALF_OPEN', async () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'HALF_OPEN';
        try {
            await breaker.execute(() => new Promise((_, reject) => setTimeout(() => reject(new Error('async-fail')), 10)));
        } catch (err) {
            assert.strictEqual(err.message, 'async-fail');
        }
        assert.strictEqual(breaker.state, 'OPEN');
    });
});
