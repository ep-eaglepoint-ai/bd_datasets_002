import { CircuitBreaker } from '../repository_before/CircuitBreaker.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Mock Date.now() for time-sensitive tests
let currentTime = 0;
const originalDateNow = Date.now;

function mockTime(ms) {
    currentTime = ms;
}

function advanceTime(ms) {
    currentTime += ms;
}

describe('CircuitBreaker', () => {
    beforeEach(() => {
        currentTime = 0;
        Date.now = () => currentTime;
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    describe('Requirement 1: 100% Branch Coverage', () => {
        describe('Basic state transitions', () => {
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
        });

        describe('Requirement 2: Time-sensitive tests with mocking', () => {
            it('should transition to HALF_OPEN after resetTimeout', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });

                // Trigger OPEN state
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail')));
                } catch { }

                assert.strictEqual(breaker.state, 'OPEN');

                // Advance time just before timeout
                advanceTime(999);
                breaker.updateState();
                assert.strictEqual(breaker.state, 'OPEN');

                // Advance past timeout
                advanceTime(1);
                breaker.updateState();
                assert.strictEqual(breaker.state, 'HALF_OPEN');
            });

            it('should not transition to HALF_OPEN before resetTimeout', () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });

                // Trigger OPEN state
                breaker.state = 'OPEN';
                breaker.lastFailureTime = 0;

                // Check after 4999ms
                mockTime(4999);
                breaker.updateState();
                assert.strictEqual(breaker.state, 'OPEN');

                // Check after 5000ms
                mockTime(5000);
                breaker.updateState();
                assert.strictEqual(breaker.state, 'HALF_OPEN');
            });
        });

        describe('Requirement 3: Half-Open Recovery path', () => {
            it('should reset to CLOSED on successful action in HALF_OPEN state', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1 });

                // Get to HALF_OPEN state
                breaker.state = 'HALF_OPEN';
                breaker.failures = 1;
                breaker.lastFailureTime = 0;

                const action = () => Promise.resolve('success');
                const result = await breaker.execute(action);

                assert.strictEqual(result, 'success');
                assert.strictEqual(breaker.state, 'CLOSED');
                assert.strictEqual(breaker.failures, 0);
                assert.strictEqual(breaker.lastFailureTime, null);
            });

            it('should handle successful async action in HALF_OPEN state', async () => {
                const breaker = new CircuitBreaker();
                breaker.state = 'HALF_OPEN';

                const action = () => new Promise(resolve => {
                    setTimeout(() => resolve('async success'), 50);
                });

                const result = await breaker.execute(action);
                assert.strictEqual(result, 'async success');
                assert.strictEqual(breaker.state, 'CLOSED');
            });
        });

        describe('Requirement 4: Half-Open Failure path', () => {
            it('should transition back to OPEN on failure in HALF_OPEN state', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1 });

                // Get to HALF_OPEN state
                breaker.state = 'HALF_OPEN';
                breaker.failures = 1;
                breaker.lastFailureTime = 0;

                try {
                    await breaker.execute(() => Promise.reject(new Error('Half-open failure')));
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.strictEqual(error.message, 'Half-open failure');
                    assert.strictEqual(breaker.state, 'OPEN');
                    assert.strictEqual(breaker.failures, 2);
                    assert.strictEqual(breaker.lastFailureTime, 0);
                }
            });

            it('should update lastFailureTime on failure in HALF_OPEN state', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1 });

                // Get to HALF_OPEN state
                breaker.state = 'HALF_OPEN';
                breaker.failures = 1;
                breaker.lastFailureTime = 1000;

                mockTime(2000);

                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail')));
                } catch { }

                assert.strictEqual(breaker.lastFailureTime, 2000);
            });
        });

        describe('Requirement 5: Failure threshold boundary validation', () => {
            it('should handle failure threshold boundary (2nd failure keeps CLOSED, 3rd triggers OPEN)', async () => {
                const breaker = new CircuitBreaker();

                // First failure
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail 1')));
                } catch { }
                assert.strictEqual(breaker.state, 'CLOSED');
                assert.strictEqual(breaker.failures, 1);

                // Second failure - should remain CLOSED
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail 2')));
                } catch { }
                assert.strictEqual(breaker.state, 'CLOSED');
                assert.strictEqual(breaker.failures, 2);

                // Third failure - should transition to OPEN
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail 3')));
                } catch { }
                assert.strictEqual(breaker.state, 'OPEN');
                assert.strictEqual(breaker.failures, 3);
            });

            it('should work with custom threshold', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 2 });

                // First failure
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail 1')));
                } catch { }
                assert.strictEqual(breaker.state, 'CLOSED');
                assert.strictEqual(breaker.failures, 1);

                // Second failure - should transition to OPEN
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail 2')));
                } catch { }
                assert.strictEqual(breaker.state, 'OPEN');
                assert.strictEqual(breaker.failures, 2);
            });
        });

        describe('Requirement 6: Asynchronous action handling', () => {
            it('should handle asynchronous actions that take 100ms to resolve', async () => {
                const breaker = new CircuitBreaker();
                let actionStarted = false;
                let actionCompleted = false;

                const slowAction = () => new Promise(resolve => {
                    actionStarted = true;
                    setTimeout(() => {
                        actionCompleted = true;
                        resolve('delayed success');
                    }, 100);
                });

                const startTime = Date.now();
                const result = await breaker.execute(slowAction);
                const endTime = Date.now();

                assert.strictEqual(actionStarted, true);
                assert.strictEqual(actionCompleted, true);
                assert.strictEqual(result, 'delayed success');
                assert.strictEqual(breaker.state, 'CLOSED');
                // Action should take at least 100ms (account for timer accuracy)
                assert.ok(endTime - startTime >= 100);
            });

            it('should handle async failures', async () => {
                const breaker = new CircuitBreaker();

                const slowFailAction = () => new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Async failure')), 100);
                });

                try {
                    await breaker.execute(slowFailAction);
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.strictEqual(error.message, 'Async failure');
                    assert.strictEqual(breaker.failures, 1);
                }
            });
        });

        describe('Requirement 7: Concurrent calls at resetTimeout expiration', () => {
            it('should handle multiple concurrent calls at resetTimeout boundary', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 100 });

                // Trigger OPEN state
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail')));
                } catch { }

                assert.strictEqual(breaker.state, 'OPEN');

                // Advance time to exactly resetTimeout
                advanceTime(100);

                // Execute multiple concurrent actions
                const actions = [];
                const results = [];

                for (let i = 0; i < 5; i++) {
                    const action = breaker.execute(() => Promise.resolve(`success-${i}`));
                    actions.push(action);
                }

                // All should either succeed or fail with CIRCUIT_OPEN
                for (const action of actions) {
                    try {
                        const result = await action;
                        results.push({ success: true, result });
                    } catch (error) {
                        results.push({ success: false, error: error.message });
                    }
                }

                // Verify consistent behavior
                const successfulCalls = results.filter(r => r.success);
                const failedCalls = results.filter(r => !r.success && r.error === 'CIRCUIT_OPEN');

                // All results should be consistent
                assert.strictEqual(results.length, 5);
                assert.strictEqual(successfulCalls.length + failedCalls.length, 5);

                // State should be consistent after all executions
                if (successfulCalls.length > 0) {
                    assert.strictEqual(breaker.state, 'CLOSED');
                } else {
                    assert.strictEqual(breaker.state, 'HALF_OPEN');
                }
            });

            it('should handle concurrent failures consistently', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 5 });

                const promises = [];
                for (let i = 0; i < 10; i++) {
                    promises.push(
                        breaker.execute(() => Promise.reject(new Error(`Concurrent fail ${i}`)))
                            .catch(() => { })
                    );
                }

                await Promise.all(promises);

                // Should be OPEN due to reaching threshold
                assert.strictEqual(breaker.state, 'OPEN');
                // All failures should be counted
                assert.strictEqual(breaker.failures, 10);
            });
        });

        describe('Requirement 8: CIRCUIT_OPEN error without calling action', () => {
            it('should throw CIRCUIT_OPEN error immediately in OPEN state', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1 });

                // Trigger OPEN state
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail')));
                } catch { }

                assert.strictEqual(breaker.state, 'OPEN');

                // Should throw immediately without calling action
                let actionCalled = false;
                try {
                    await breaker.execute(() => {
                        actionCalled = true;
                        return Promise.resolve('should not be called');
                    });
                    assert.fail('Should have thrown CIRCUIT_OPEN');
                } catch (error) {
                    assert.strictEqual(error.message, 'CIRCUIT_OPEN');
                    assert.strictEqual(actionCalled, false);
                }
            });

            it('should not call action when circuit is OPEN', async () => {
                const breaker = new CircuitBreaker();
                breaker.state = 'OPEN';
                breaker.lastFailureTime = Date.now();

                let actionCalled = false;
                try {
                    await breaker.execute(() => {
                        actionCalled = true;
                        return Promise.resolve('test');
                    });
                } catch (error) {
                    assert.strictEqual(error.message, 'CIRCUIT_OPEN');
                }

                assert.strictEqual(actionCalled, false);
            });
        });

        describe('Additional coverage for implicit branches', () => {
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

            it('should handle null lastFailureTime in OPEN state', () => {
                const breaker = new CircuitBreaker();
                breaker.state = 'OPEN';
                breaker.lastFailureTime = null;

                // Should not crash
                breaker.updateState();
                assert.strictEqual(breaker.state, 'OPEN');
            });

            it('should not transition OPEN state on additional failures', () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1 });

                // Already in OPEN state
                breaker.state = 'OPEN';
                breaker.failures = 1;
                breaker.lastFailureTime = 0;

                // Simulate another failure
                breaker.handleFailure();

                // Should remain OPEN and update time
                assert.strictEqual(breaker.state, 'OPEN');
                assert.strictEqual(breaker.failures, 2);
                assert.strictEqual(breaker.lastFailureTime, 0);
            });

            it('should handle action that throws synchronous error', async () => {
                const breaker = new CircuitBreaker();

                try {
                    await breaker.execute(() => {
                        throw new Error('Sync error');
                    });
                    assert.fail('Should have thrown an error');
                } catch (error) {
                    assert.strictEqual(error.message, 'Sync error');
                    assert.strictEqual(breaker.failures, 1);
                }
            });

            it('should call updateState before checking OPEN state', async () => {
                const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 100 });

                // Trigger OPEN state
                try {
                    await breaker.execute(() => Promise.reject(new Error('Fail')));
                } catch { }
                assert.strictEqual(breaker.state, 'OPEN');

                // Advance time past resetTimeout
                advanceTime(150);

                // execute() should call updateState() and transition to HALF_OPEN
                // before checking state, so action should execute
                const result = await breaker.execute(() => Promise.resolve('should work'));
                assert.strictEqual(result, 'should work');
                assert.strictEqual(breaker.state, 'CLOSED');
            });
        });
    });
});