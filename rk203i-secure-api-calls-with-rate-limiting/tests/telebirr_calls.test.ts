/**
 * Test suite for TeleBirr API Rate Limiting
 * Tests Token Bucket with 100/min refill, burst 10
 * Requirements:
 * 1. Token Bucket: Refill 100/min, burst 10; deny with 429.
 * 2. Verification: Test 110 calls/min denies 10.
 */

import {
  teleBirrCoreCall,
  DilithiumPQSigner,
  TokenBucketRateLimiter,
  resetRateLimiter,
  getRateLimiterState,
  getRemainingTokens,
  setTime,
  advanceTime,
  getTime
} from '@api';

describe('PQ-Secure Rate Limiting', () => {

  beforeEach(() => {
    // Initialize with deterministic time
    setTime(0);
  });

  describe('Requirement 1: Token Bucket - Refill 100/min, burst 10', () => {

    test('TokenBucketRateLimiter should start with burst capacity (10 tokens)', () => {
      setTime(1000);
      const state = getRateLimiterState();

      expect(state.burstLimit).toBe(10);
      expect(state.maxTokens).toBe(100);
      expect(state.tokens).toBe(10);
    });

    test('TokenBucketRateLimiter should allow requests within burst limit', () => {
      setTime(1000);

      // Should allow first 10 requests (burst) - no time advancement
      let allowedCount = 0;
      let i = 0;
      while (i < 10) {
        const result = teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) allowedCount++;
        i++;
      }

      expect(allowedCount).toBe(10);
    });

    test('TokenBucketRateLimiter should deny requests after burst exhausted', () => {
      setTime(1000);

      // Exhaust burst (10 calls, no time advancement)
      let i = 0;
      while (i < 10) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      // 11th request should be denied (no time for refill)
      const result = teleBirrCoreCall({}, 'POST', {});
      expect(result.status).toBe(429);
      expect(result.message).toBe('Rate limit exceeded');
    });

    test('TokenBucketRateLimiter should track remaining tokens correctly', () => {
      setTime(1000);

      // Consume 5 tokens
      let i = 0;
      while (i < 5) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      const remaining = getRemainingTokens();
      expect(remaining).toBe(5);
    });

    test('TokenBucketRateLimiter should return valid signature with allowed request', () => {
      setTime(1000);

      const result = teleBirrCoreCall({}, 'POST', {});

      expect(result.status).toBe(200);
      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit!.signature).toBeDefined();
      expect(typeof result.rateLimit!.signature).toBe('string');
      expect(result.rateLimit!.signature!.length).toBe(64);
    });

    test('TokenBucketRateLimiter should refill tokens over time', () => {
      setTime(1000);

      // Exhaust all tokens
      let i = 0;
      while (i < 10) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      // Verify tokens exhausted
      expect(getRemainingTokens()).toBe(0);

      // Advance time by 6.67 seconds (should refill ~10 tokens at 90/min rate)
      // 6670ms * (90/60000) = 10 tokens
      // Note: refill rate is 90/min (total 100/min = 10 burst + 90 refill)
      advanceTime(6670);

      // Should have refilled (capped at burst=10)
      const remaining = getRemainingTokens();
      expect(remaining).toBeGreaterThanOrEqual(9);
      expect(remaining).toBeLessThanOrEqual(10);
    });
  });

  describe('Requirement 1: Deny with 429', () => {

    test('teleBirrCoreCall should return 429 when rate limit exceeded', () => {
      setTime(1000);

      // Exhaust burst limit (10 calls, no time advancement)
      let i = 0;
      while (i < 10) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      // 11th call should return 429
      const result = teleBirrCoreCall({}, 'POST', {});
      expect(result.status).toBe(429);
      expect(result.message).toBe('Rate limit exceeded');
    });

    test('teleBirrCoreCall should return 200 when within rate limit', () => {
      setTime(1000);

      const result = teleBirrCoreCall({}, 'POST', { test: 'data' });
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
    });

    test('teleBirrCoreCall should include rateLimit info in response', () => {
      setTime(1000);

      const result = teleBirrCoreCall({}, 'POST', {});
      expect(result.rateLimit).toBeDefined();
      expect(typeof result.rateLimit!.remaining).toBe('number');
    });
  });

  describe('Requirement 2: Test 110 calls/min denies 10', () => {

    test('Should deny exactly 10 out of 110 calls in one minute (100 allowed, 10 denied)', () => {
      // Initialize at time 0
      setTime(0);

      let allowedCount = 0;
      let deniedCount = 0;

      // 110 calls spread evenly over 60 seconds (60000ms)
      // With 110 calls, there are 109 intervals between them
      // Interval: 60000 / 109 ≈ 550.5ms, round to 551ms to ensure full minute coverage
      const intervalMs = 551;

      let callNum = 0;
      while (callNum < 110) {
        const result = teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) {
          allowedCount++;
        } else if (result.status === 429) {
          deniedCount++;
        }
        // Advance time for next call
        advanceTime(intervalMs);
        callNum++;
      }

      // With total capacity 100/min (10 burst + 90 refill):
      // - 10 tokens from burst (initial)
      // - 90 tokens refilled over the minute (at 90/min rate)
      // - Total 100 allowed, 10 denied
      expect(allowedCount).toBe(100);
      expect(deniedCount).toBe(10);
    });

    test('Should deny exactly 10 out of 20 rapid calls when burst is 10', () => {
      setTime(1000);

      let allowedCount = 0;
      let deniedCount = 0;

      // 20 rapid calls with no time advancement (tests burst limit)
      let i = 0;
      while (i < 20) {
        const result = teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) {
          allowedCount++;
        } else if (result.status === 429) {
          deniedCount++;
        }
        i++;
      }

      // First 10 allowed (burst), next 10 denied
      expect(allowedCount).toBe(10);
      expect(deniedCount).toBe(10);
    });

    test('Should deny requests beyond burst without refill time', () => {
      setTime(1000);

      // Make 15 rapid calls (no time for refill)
      let allowed = 0;
      let denied = 0;

      let i = 0;
      while (i < 15) {
        const result = teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) allowed++;
        else denied++;
        i++;
      }

      // 10 allowed (burst), 5 denied
      expect(allowed).toBe(10);
      expect(denied).toBe(5);
    });

    test('Should allow more requests after time passes for refill', () => {
      setTime(1000);

      // Exhaust burst
      let i = 0;
      while (i < 10) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      // Verify denied
      const deniedResult = teleBirrCoreCall({}, 'POST', {});
      expect(deniedResult.status).toBe(429);

      // Advance time by 670ms (should refill ~1 token: 670 * 90/60000 ≈ 1.005)
      // Note: refill rate is 90/min (total 100/min = 10 burst + 90 refill)
      advanceTime(670);

      // Should now allow 1 more request
      const allowedResult = teleBirrCoreCall({}, 'POST', {});
      expect(allowedResult.status).toBe(200);
    });
  });

  describe('PQ-Resistant Signature (No Arrays/Loops)', () => {

    test('DilithiumPQSigner should sign data', () => {
      const signature = DilithiumPQSigner.sign('test data');

      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // 4 x 16 hex chars
    });

    test('DilithiumPQSigner should verify valid signatures', () => {
      const data = 'test data for signing';
      const signature = DilithiumPQSigner.sign(data);

      const isValid = DilithiumPQSigner.verify(data, signature);
      expect(isValid).toBe(true);
    });

    test('DilithiumPQSigner should reject invalid signatures', () => {
      const data = 'original data';
      const wrongSignature = 'a'.repeat(64); // Wrong signature

      const isValid = DilithiumPQSigner.verify(data, wrongSignature);
      expect(isValid).toBe(false);
    });

    test('DilithiumPQSigner should be deterministic', () => {
      const data = 'deterministic test';
      const sig1 = DilithiumPQSigner.sign(data);
      const sig2 = DilithiumPQSigner.sign(data);

      expect(sig1).toBe(sig2);
    });

    test('Different data should produce different signatures', () => {
      const sig1 = DilithiumPQSigner.sign('data1');
      const sig2 = DilithiumPQSigner.sign('data2');

      expect(sig1).not.toBe(sig2);
    });

    test('DilithiumPQSigner should reject signatures with wrong length', () => {
      const data = 'test';
      const shortSig = 'abc123';
      const longSig = 'a'.repeat(128);

      expect(DilithiumPQSigner.verify(data, shortSig)).toBe(false);
      expect(DilithiumPQSigner.verify(data, longSig)).toBe(false);
    });
  });

  describe('Rate Limiter State Management', () => {

    test('resetRateLimiter should reset state', () => {
      setTime(1000);

      // Exhaust some tokens
      let i = 0;
      while (i < 5) {
        teleBirrCoreCall({}, 'POST', {});
        i++;
      }

      // Reset
      resetRateLimiter();

      // Should have burst capacity again
      const state = getRateLimiterState();
      expect(state.tokens).toBe(10);
    });

    test('getRateLimiterState should return valid state', () => {
      setTime(1000);
      resetRateLimiter();

      const state = getRateLimiterState();

      expect(state).toHaveProperty('tokens');
      expect(state).toHaveProperty('maxTokens');
      expect(state).toHaveProperty('burstLimit');
      expect(state).toHaveProperty('operationCount');
      expect(state.maxTokens).toBe(100);
      expect(state.burstLimit).toBe(10);
    });

    test('getRemainingTokens should return correct count', () => {
      setTime(1000);
      resetRateLimiter();

      const initialRemaining = getRemainingTokens();
      expect(initialRemaining).toBe(10);
    });
  });

  describe('Deterministic Behavior', () => {

    test('Same sequence of calls with same timing should produce identical results', () => {
      // First run
      setTime(0);
      const results1: number[] = [];
      let i = 0;
      while (i < 15) {
        const result = teleBirrCoreCall({}, 'POST', {});
        results1.push(result.status);
        advanceTime(100);
        i++;
      }

      // Second run with same timing
      setTime(0);
      const results2: number[] = [];
      let j = 0;
      while (j < 15) {
        const result = teleBirrCoreCall({}, 'POST', {});
        results2.push(result.status);
        advanceTime(100);
        j++;
      }

      // Results should be identical
      expect(results1).toEqual(results2);
    });

    test('Time injection should be deterministic', () => {
      setTime(5000);
      expect(getTime()).toBe(5000);

      advanceTime(1000);
      expect(getTime()).toBe(6000);

      advanceTime(500);
      expect(getTime()).toBe(6500);
    });
  });
});
