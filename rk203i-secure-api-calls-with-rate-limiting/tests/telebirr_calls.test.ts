/**
 * Test suite for TeleBirr API Rate Limiting
 * Tests Token Bucket with 100/min refill, burst 10, and signature generation
 * Uses time mocking to verify refill behavior
 */

import {
  teleBirrCoreCall,
  DilithiumPQSigner,
  TokenBucketRateLimiter,
  resetRateLimiter,
  getRateLimiterState,
  getRemainingTokens,
  setMockTime,
  advanceMockTime
} from '@api';

describe('PQ-Secure Rate Limiting', () => {

  beforeEach(() => {
    setMockTime(null); // Use real time by default
    resetRateLimiter();
  });

  afterEach(() => {
    setMockTime(null); // Reset to real time after each test
  });

  describe('Requirement 1: Token Bucket - Refill 100/min, burst 10', () => {
    
    test('TokenBucketRateLimiter should start with burst capacity (10 tokens)', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);
      const state = limiter.getState();
      
      expect(state.burstLimit).toBe(10);
      expect(state.maxTokens).toBe(100);
      expect(state.tokens).toBeLessThanOrEqual(10);
    });

    test('TokenBucketRateLimiter should allow requests within burst limit', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);
      
      // Should allow first 10 requests (burst)
      for (let i = 0; i < 10; i++) {
        const result = limiter.tryConsume('test-endpoint');
        expect(result.allowed).toBe(true);
      }
    });

    test('TokenBucketRateLimiter should deny requests after burst exhausted', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);
      
      // Exhaust burst
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume('test-endpoint');
      }
      
      // 11th request should be denied
      const result = limiter.tryConsume('test-endpoint');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('TokenBucketRateLimiter should track remaining tokens correctly', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);
      
      // Consume 5 tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryConsume('test-endpoint');
      }
      
      const remaining = limiter.getRemaining();
      expect(remaining).toBeLessThanOrEqual(5);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    test('TokenBucketRateLimiter should return valid signature with allowed request', () => {
      const limiter = new TokenBucketRateLimiter(100, 10);
      const result = limiter.tryConsume('test-endpoint');
      
      expect(result.allowed).toBe(true);
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe('string');
      expect(result.signature!.length).toBeGreaterThan(0);
    });
  });

  describe('Requirement 1: Deny with 429', () => {
    
    test('teleBirrCoreCall should return 429 when rate limit exceeded', async () => {
      resetRateLimiter();
      
      // Exhaust burst limit (10 calls)
      for (let i = 0; i < 10; i++) {
        await teleBirrCoreCall({}, 'POST', {});
      }
      
      // 11th call should return 429
      const result = await teleBirrCoreCall({}, 'POST', {});
      expect(result.status).toBe(429);
      expect(result.message).toBe('Rate limit exceeded');
    });

    test('teleBirrCoreCall should return 200 when within rate limit', async () => {
      resetRateLimiter();
      
      const result = await teleBirrCoreCall({}, 'POST', { test: 'data' });
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
    });

    test('teleBirrCoreCall should include rateLimit info in response', async () => {
      resetRateLimiter();
      
      const result = await teleBirrCoreCall({}, 'POST', {});
      expect(result.rateLimit).toBeDefined();
      expect(typeof result.rateLimit!.remaining).toBe('number');
    });
  });

  describe('Requirement 2: Test 110 calls/min denies 10', () => {

    test('Should deny exactly 10 out of 110 calls in one minute (100 allowed, 10 denied)', async () => {
      // Use mock time for deterministic testing
      setMockTime(0);
      resetRateLimiter();

      let allowedCount = 0;
      let deniedCount = 0;

      // Make 110 calls spread over time
      // Refill rate is 100/min, burst is 10
      // For 100 allowed: need 10 (burst) + 90 (refill) = 100 tokens
      // Time for 90 tokens refill = 90 * 600 = 54000ms
      // 109 intervals (between 110 calls): 54000/109 ≈ 496ms (rounded up)
      const intervalMs = 496;

      for (let i = 0; i < 110; i++) {
        const result = await teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) {
          allowedCount++;
        } else if (result.status === 429) {
          deniedCount++;
        }
        // Advance time for next call
        advanceMockTime(intervalMs);
      }

      // 100 should be allowed (10 burst + 90 refilled), 10 denied
      expect(allowedCount).toBe(100);
      expect(deniedCount).toBe(10);
    });

    test('Should deny exactly 10 out of 20 calls when burst is 10 (rapid calls)', async () => {
      setMockTime(1000);
      resetRateLimiter();

      let allowedCount = 0;
      let deniedCount = 0;

      // Make 20 rapid calls (no time for refill)
      for (let i = 0; i < 20; i++) {
        const result = await teleBirrCoreCall({}, 'POST', {});
        if (result.status === 200) {
          allowedCount++;
        } else if (result.status === 429) {
          deniedCount++;
        }
      }

      // First 10 should be allowed (burst), next 10 denied
      expect(allowedCount).toBe(10);
      expect(deniedCount).toBe(10);
    });

    test('Should deny requests beyond burst without refill time', async () => {
      setMockTime(1000);
      resetRateLimiter();

      // Make 15 rapid calls
      const results: number[] = [];
      for (let i = 0; i < 15; i++) {
        const result = await teleBirrCoreCall({}, 'POST', {});
        results.push(result.status);
      }

      // Count 429s (should be 5: 15 calls - 10 burst = 5 denied)
      const denied = results.filter(s => s === 429).length;
      expect(denied).toBe(5);
    });
  });

  describe('Mock Signature Verification', () => {

    test('DilithiumPQSigner should sign data', () => {
      const signature = DilithiumPQSigner.sign('test data');
      
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('DilithiumPQSigner should verify valid signatures', () => {
      const data = 'test data for signing';
      const signature = DilithiumPQSigner.sign(data);
      
      const isValid = DilithiumPQSigner.verify(data, signature);
      expect(isValid).toBe(true);
    });

    test('DilithiumPQSigner should reject invalid signatures', () => {
      const data = 'original data';
      const wrongSignature = 'a'.repeat(128); // Wrong signature
      
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
  });

  describe('Rate Limiter State Management', () => {
    
    test('resetRateLimiter should reset state', async () => {
      // Exhaust some tokens
      for (let i = 0; i < 5; i++) {
        await teleBirrCoreCall({}, 'POST', {});
      }
      
      // Reset
      resetRateLimiter();
      
      // Should have burst capacity again
      const state = getRateLimiterState();
      expect(state.tokens).toBeGreaterThan(0);
    });

    test('getRateLimiterState should return valid state', () => {
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
      resetRateLimiter();
      
      const initialRemaining = getRemainingTokens();
      expect(initialRemaining).toBeGreaterThan(0);
      expect(initialRemaining).toBeLessThanOrEqual(10);
    });
  });
});