import { CircuitBreaker } from './CircuitBreaker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Requirement 8: CIRCUIT_OPEN error', () => {
    it('should throw CIRCUIT_OPEN error immediately in OPEN state', async () => {
        const breaker = new CircuitBreaker();
        breaker.state = 'OPEN';
        breaker.lastFailureTime = Date.now();

        let called = false;
        try {
            await breaker.execute(() => { called = true; return Promise.resolve(); });
        } catch (error) {
            assert.strictEqual(error.message, 'CIRCUIT_OPEN');
        }
        assert.strictEqual(called, false);
    });
});
