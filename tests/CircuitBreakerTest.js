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

    describe('Basic functionality', () => {
        it('should handle no options passed', () => {
            const breaker = new CircuitBreaker();
            assert.strictEqual(breaker.failureThreshold, 3);
            assert.strictEqual(breaker.resetTimeout, 5000);
        });

        it('should default to 5000 when resetTimeout is 0 (Potentially unexpected behavior)', () => {
            const breaker = new CircuitBreaker({ resetTimeout: 0 });
            assert.strictEqual(breaker.resetTimeout, 5000);
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

    describe('Requirement 5: Failure threshold boundary', () => {
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

        it('should transition immediately with threshold 1', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1 });
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }
            assert.strictEqual(breaker.state, 'OPEN');
        });

        it('should handle high threshold correctly', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 100 });
            for (let i = 0; i < 99; i++) {
                try { await breaker.execute(() => Promise.reject(new Error('Fail'))); } catch { }
            }
            assert.strictEqual(breaker.state, 'CLOSED');
            try { await breaker.execute(() => Promise.reject(new Error('Fail'))); } catch { }
            assert.strictEqual(breaker.state, 'OPEN');
        });
    });

    describe('Requirement 2: Time-sensitive tests with mocking', () => {
        it('should transition to HALF_OPEN after resetTimeout', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });

            // Trigger OPEN state with a failure
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }

            assert.strictEqual(breaker.state, 'OPEN');
            assert.strictEqual(breaker.lastFailureTime, 0);

            // Advance time past timeout
            advanceTime(1001);

            // updateState should transition to HALF_OPEN
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');
        });

        it('should not transition to HALF_OPEN before resetTimeout', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });

            // Trigger OPEN state with a failure
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }

            assert.strictEqual(breaker.state, 'OPEN');
            assert.strictEqual(breaker.lastFailureTime, 0);

            // Advance time just before timeout (5000ms exactly should NOT transition)
            advanceTime(5000);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'OPEN');

            // Advance 1ms past timeout
            advanceTime(1);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');
        });

        it('should handle NaN comparison when lastFailureTime is null', () => {
            const breaker = new CircuitBreaker();
            // This tests an edge case: if lastFailureTime is null in OPEN state
            // (which shouldn't happen in practice), the comparison should not crash
            breaker.state = 'OPEN';
            breaker.lastFailureTime = null;

            // This should not crash and should not transition
            breaker.updateState();
            assert.strictEqual(breaker.state, 'OPEN');
        });

        it('should handle negative clock drift (time jumping backwards)', () => {
            const breaker = new CircuitBreaker({ resetTimeout: 1000 });
            breaker.state = 'OPEN';
            breaker.lastFailureTime = 2000;

            // Time jumps back to 1500
            mockTime(1500);
            breaker.updateState();

            // Difference is -500, which is not > 1000
            assert.strictEqual(breaker.state, 'OPEN');
        });

        it('should handle multiple concurrent calls exactly at the moment the resetTimeout expires (Adversarial test)', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });

            mockTime(0);
            try { await breaker.execute(() => Promise.reject(new Error('Initial fail'))); } catch { }
            assert.strictEqual(breaker.state, 'OPEN');

            // Advance time to EXACTLY resetTimeout
            mockTime(1000);

            // Multiple concurrent calls exactly at the moment it expires
            const results = await Promise.all([
                breaker.execute(() => Promise.resolve('A')).catch(err => err.message),
                breaker.execute(() => Promise.resolve('B')).catch(err => err.message),
                breaker.execute(() => Promise.resolve('C')).catch(err => err.message)
            ]);

            // Since (1000 - 0 > 1000) is FALSE, state remains OPEN, all calls should fail with CIRCUIT_OPEN
            assert.deepStrictEqual(results, ['CIRCUIT_OPEN', 'CIRCUIT_OPEN', 'CIRCUIT_OPEN']);
            assert.strictEqual(breaker.state, 'OPEN');

            // 1ms later, it should transition
            mockTime(1001);
            const result = await breaker.execute(() => Promise.resolve('Success'));
            assert.strictEqual(result, 'Success');
            assert.strictEqual(breaker.state, 'CLOSED');
        });
    });

    describe('Requirement 3: Half-Open Recovery path', () => {
        it('should reset to CLOSED on successful action in HALF_OPEN state', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1 });

            // Get to HALF_OPEN state properly
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }

            advanceTime(5001);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');

            const action = () => Promise.resolve('success');
            const result = await breaker.execute(action);

            assert.strictEqual(result, 'success');
            assert.strictEqual(breaker.state, 'CLOSED');
            assert.strictEqual(breaker.failures, 0);
            assert.strictEqual(breaker.lastFailureTime, null);
        });
    });

    describe('Requirement 4: Half-Open Failure path', () => {
        it('should transition back to OPEN on failure in HALF_OPEN state', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1 });

            // Get to HALF_OPEN state properly
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }

            advanceTime(5001);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');

            try {
                await breaker.execute(() => Promise.reject(new Error('Half-open failure')));
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error.message, 'Half-open failure');
                assert.strictEqual(breaker.state, 'OPEN');
                assert.strictEqual(breaker.lastFailureTime, 5001);
            }
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
    });

    describe('Requirement 6: Asynchronous action handling', () => {
        it('should handle asynchronous actions that take 100ms to resolve', async () => {
            const breaker = new CircuitBreaker();

            // Don't use mocked time for this test
            Date.now = originalDateNow;

            const slowAction = () => new Promise(resolve => {
                setTimeout(() => resolve('delayed success'), 100);
            });

            const startTime = Date.now();
            const result = await breaker.execute(slowAction);
            const endTime = Date.now();

            assert.strictEqual(result, 'delayed success');
            assert.strictEqual(breaker.state, 'CLOSED');
            assert.ok(endTime - startTime >= 90, `Expected at least 90ms, got ${endTime - startTime}ms`);
        });

        it('should handle async failures', async () => {
            const breaker = new CircuitBreaker();

            Date.now = originalDateNow;

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
            assert.strictEqual(breaker.lastFailureTime, 0);

            // Advance time to JUST AFTER resetTimeout
            advanceTime(101); // 101ms > 100ms resetTimeout

            // Now all calls should see HALF_OPEN state
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    breaker.execute(() => Promise.resolve(`success-${i}`))
                        .then(result => ({ success: true, result }))
                        .catch(error => ({ success: false, error: error.message }))
                );
            }

            const results = await Promise.all(promises);

            const successfulCalls = results.filter(r => r.success);
            const failedCalls = results.filter(r => !r.success);

            // All should succeed
            assert.strictEqual(successfulCalls.length, 5);
            assert.strictEqual(failedCalls.length, 0);
            assert.strictEqual(breaker.state, 'CLOSED');
        });

        it('should handle mixed success and failure during concurrent HALF_OPEN probes (Logic Flaw Exposure)', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 100 });

            // Trigger OPEN state
            mockTime(0);
            try {
                await breaker.execute(() => Promise.reject(new Error('Initial Fail')));
            } catch { }
            breaker.state = 'OPEN'; // Force state if needed, but handleFailure should have set it if threshold was 1
            // Let's set it properly
            breaker.state = 'OPEN';
            breaker.lastFailureTime = 0;

            // Advance to HALF_OPEN
            advanceTime(101);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');

            // Start two concurrent calls
            // Call 1 will succeed, Call 2 will fail
            let resolveCall1;
            const p1 = breaker.execute(() => new Promise(resolve => { resolveCall1 = resolve; }));

            let rejectCall2;
            const p2 = breaker.execute(() => new Promise((_, reject) => { rejectCall2 = reject; }));

            // Resolve Call 1 first - this transitions state to CLOSED and resets failures to 0
            resolveCall1('success');
            await p1;
            assert.strictEqual(breaker.state, 'CLOSED');
            assert.strictEqual(breaker.failures, 0);

            // Now reject Call 2 - this will call handleFailure in CLOSED state
            rejectCall2(new Error('late failure'));
            try {
                await p2;
            } catch (err) {
                assert.strictEqual(err.message, 'late failure');
            }

            // EXPOSURE: The circuit remains CLOSED because failures=1 < threshold=3
            // even though a probe failed!
            assert.strictEqual(breaker.state, 'CLOSED');
            assert.strictEqual(breaker.failures, 1);
        });

        it('should transition to CLOSED on async success in HALF_OPEN', async () => {
            const breaker = new CircuitBreaker();
            breaker.state = 'HALF_OPEN';

            const result = await breaker.execute(() => new Promise(resolve => setTimeout(() => resolve('async-ok'), 10)));
            assert.strictEqual(result, 'async-ok');
            assert.strictEqual(breaker.state, 'CLOSED');
        });

        it('should transition back to OPEN on async failure in HALF_OPEN', async () => {
            const breaker = new CircuitBreaker();
            breaker.state = 'HALF_OPEN';
            mockTime(500);

            try {
                await breaker.execute(() => new Promise((_, reject) => setTimeout(() => reject(new Error('async-fail')), 10)));
            } catch (err) {
                assert.strictEqual(err.message, 'async-fail');
            }
            assert.strictEqual(breaker.state, 'OPEN');
            assert.strictEqual(breaker.lastFailureTime, 500);
        });

        it('should refresh lastFailureTime even when already OPEN (Late failure effect)', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1 });

            mockTime(0);
            breaker.state = 'OPEN';
            breaker.lastFailureTime = 0;

            // A call that was in flight fails now
            mockTime(100);
            breaker.handleFailure();

            // Failures increment and lastFailureTime updates to 100
            assert.strictEqual(breaker.failures, 1);
            assert.strictEqual(breaker.lastFailureTime, 100);
            assert.strictEqual(breaker.state, 'OPEN');
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

            assert.strictEqual(breaker.state, 'OPEN');
            assert.strictEqual(breaker.failures, 10);
        });
    });

    describe('Additional branch coverage tests', () => {
        it('should not transition from CLOSED to HALF_OPEN in updateState', () => {
            const breaker = new CircuitBreaker();
            breaker.state = 'CLOSED';
            breaker.lastFailureTime = 1000;

            advanceTime(2000);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'CLOSED');
        });

        it('should not transition from HALF_OPEN in updateState', () => {
            const breaker = new CircuitBreaker();
            breaker.state = 'HALF_OPEN';
            breaker.lastFailureTime = 1000;

            advanceTime(2000);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');
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

        it('should not reset on successful action in CLOSED state', async () => {
            const breaker = new CircuitBreaker();

            try {
                await breaker.execute(() => Promise.reject(new Error('Fail')));
            } catch { }
            assert.strictEqual(breaker.failures, 1);

            await breaker.execute(() => Promise.resolve('success'));
            assert.strictEqual(breaker.failures, 1);
        });

        it('should handle multiple state transitions', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 100 });

            // CLOSED -> OPEN
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail 1')));
            } catch { }
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail 2')));
            } catch { }
            assert.strictEqual(breaker.state, 'OPEN');

            // OPEN -> HALF_OPEN (after timeout)
            advanceTime(101);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');

            // HALF_OPEN -> OPEN (on failure)
            try {
                await breaker.execute(() => Promise.reject(new Error('Fail 3')));
            } catch { }
            assert.strictEqual(breaker.state, 'OPEN');

            // OPEN -> HALF_OPEN again
            advanceTime(101);
            breaker.updateState();
            assert.strictEqual(breaker.state, 'HALF_OPEN');

            // HALF_OPEN -> CLOSED (on success)
            await breaker.execute(() => Promise.resolve('success'));
            assert.strictEqual(breaker.state, 'CLOSED');
            assert.strictEqual(breaker.failures, 0);
        });
    });
});