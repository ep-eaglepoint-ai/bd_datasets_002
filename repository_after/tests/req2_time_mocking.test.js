import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('Requirement 2: Time-sensitive tests with mocking', () => {
    let currentTime = 0;
    const originalDateNow = Date.now;

    beforeEach(() => {
        currentTime = 0;
        Date.now = () => currentTime;
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    it('should transition to HALF_OPEN after resetTimeout', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
        try {
            await breaker.execute(() => Promise.reject(new Error('Fail')));
        } catch { }
        assert.strictEqual(breaker.state, 'OPEN');
        assert.strictEqual(breaker.lastFailureTime, 0);

        currentTime = 1001;
        breaker.updateState();
        assert.strictEqual(breaker.state, 'HALF_OPEN');
    });

    it('should not transition to HALF_OPEN before resetTimeout', async () => {
        const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });
        try {
            await breaker.execute(() => Promise.reject(new Error('Fail')));
        } catch { }
        assert.strictEqual(breaker.state, 'OPEN');

        currentTime = 5000;
        breaker.updateState();
        assert.strictEqual(breaker.state, 'OPEN');

        currentTime = 5001;
        breaker.updateState();
        assert.strictEqual(breaker.state, 'HALF_OPEN');
    });

    it('should handle negative clock drift (time jumping backwards)', () => {
        const breaker = new CircuitBreaker({ resetTimeout: 1000 });
        breaker.state = 'OPEN';
        breaker.lastFailureTime = 2000;
        currentTime = 1500;
        breaker.updateState();
        assert.strictEqual(breaker.state, 'OPEN');
    });
});
