import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('Requirement 1: 100% Branch Coverage - Basic functionality', () => {
    it('should start in CLOSED state', () => {
        const breaker = new CircuitBreaker();
        assert.strictEqual(breaker.state, 'CLOSED');
        assert.strictEqual(breaker.failures, 0);
        assert.strictEqual(breaker.lastFailureTime, null);
    });

    it('should have default configuration', () => {
        const breaker = new CircuitBreaker();
        assert.strictEqual(breaker.failureThreshold, 3);
        assert.strictEqual(breaker.resetTimeout, 5000);
    });

    it('should accept custom configuration', () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 5,
            resetTimeout: 10000
        });
        assert.strictEqual(breaker.failureThreshold, 5);
        assert.strictEqual(breaker.resetTimeout, 10000);
    });



    it('should not transition from CLOSED to HALF_OPEN in updateState', () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'CLOSED';
        breaker.lastFailureTime = Date.now();
        breaker.updateState();
        assert.strictEqual(breaker.state, 'CLOSED');
    });

    it('should not transition from HALF_OPEN in updateState', () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'HALF_OPEN';
        breaker.lastFailureTime = Date.now() - 10000;
        breaker.updateState();
        assert.strictEqual(breaker.state, 'HALF_OPEN');
    });
});
