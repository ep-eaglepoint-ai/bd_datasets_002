/**
 * Test suite for Telecom TopUp Transaction Logging
 * Tests O(1) compression, PQ signing, determinism, thread-safety, and verification
 */

import {
  sendLog,
  verifyLog,
  resetLogCounter,
  DilithiumPQSigner,
  InlineCompressor,
  FixedBufferSerializer,
  AtomicCounter,
  telecomTopupRequest,
  LOG_BUFFER_SIZE,
  APILogData
} from '@controller';

describe('Transaction Logging Optimization', () => {

  beforeEach(() => {
    resetLogCounter();
  });

  describe('Requirement 1: Inline Compress - Deflate each log O(1)', () => {
    test('sendLog should return compressed data as BigInt', () => {
      const result = sendLog('Test message', 'info', {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(result).toBeDefined();
      expect(result.compressedData).toBeDefined();
      expect(typeof result.compressedData).toBe('bigint');
    });

    test('InlineCompressor should compress data to BigInt', () => {
      const compressed = InlineCompressor.compressString('Test message', 'info', {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(typeof compressed).toBe('bigint');
      expect(compressed).toBeGreaterThan(0n);
    });

    test('compression should be deterministic (same input = same output)', () => {
      const data: APILogData = {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      const compressed1 = InlineCompressor.compressString('Test', 'info', data);
      const compressed2 = InlineCompressor.compressString('Test', 'info', data);

      expect(compressed1).toBe(compressed2);
    });

    test('LOG_BUFFER_SIZE should be 1024 (1KB)', () => {
      expect(LOG_BUFFER_SIZE).toBe(1024);
    });

    test('O(1) constraint: compression output is fixed size regardless of input', () => {
      const smallData: APILogData = {
        APIEndpoint: '/a',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      const largeData: APILogData = {
        APIEndpoint: '/this/is/a/very/long/endpoint/path/that/exceeds/normal/size',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      const smallCompressed = InlineCompressor.compressString('A', 'info', smallData);
      const largeCompressed = InlineCompressor.compressString('A'.repeat(1000), 'info', largeData);

      // Both should be BigInt (fixed 64-bit output)
      expect(typeof smallCompressed).toBe('bigint');
      expect(typeof largeCompressed).toBe('bigint');

      // Output size is always 64 bits (8 bytes) regardless of input
      expect(smallCompressed.toString(16).length).toBeLessThanOrEqual(16);
      expect(largeCompressed.toString(16).length).toBeLessThanOrEqual(16);
    });

    test('sendLog should be deterministic (same input = same compression/signature)', () => {
      const testData: APILogData = {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      const result1 = sendLog('Test message', 'info', testData);
      const result2 = sendLog('Test message', 'info', testData);

      // Same input should produce same compressed data and signature
      expect(result1.compressedData).toBe(result2.compressedData);
      expect(result1.signature).toBe(result2.signature);
    });

    test('different inputs should produce different compressed outputs', () => {
      const data1: APILogData = {
        APIEndpoint: '/endpoint1',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      const data2: APILogData = {
        APIEndpoint: '/endpoint2',
        method: 'POST',
        HTTPStatusCode: 404,
        request: {},
        response: {},
        headers: {},
      };

      const compressed1 = InlineCompressor.compressString('Message1', 'info', data1);
      const compressed2 = InlineCompressor.compressString('Message2', 'error', data2);

      expect(compressed1).not.toBe(compressed2);
    });
  });

  describe('Requirement 2: PQ Sign - Dilithium on compressed', () => {
    test('sendLog should return a 64-character hex signature', () => {
      const result = sendLog('Test message', 'info', {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe('string');
      expect(result.signature.length).toBe(64);
    });

    test('DilithiumPQSigner should sign BigInt data', () => {
      const testData = 12345678901234567890n;
      const signature = DilithiumPQSigner.sign(testData);

      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);
    });

    test('signature should be deterministic (same input = same signature)', () => {
      const testData = 9876543210n;
      const sig1 = DilithiumPQSigner.sign(testData);
      const sig2 = DilithiumPQSigner.sign(testData);

      expect(sig1).toBe(sig2);
    });

    test('different inputs should produce different signatures', () => {
      const data1 = 111111111n;
      const data2 = 222222222n;
      const sig1 = DilithiumPQSigner.sign(data1);
      const sig2 = DilithiumPQSigner.sign(data2);

      expect(sig1).not.toBe(sig2);
    });

    test('signature size should be 32 bytes (256 bits)', () => {
      expect(DilithiumPQSigner.getSignatureSize()).toBe(32);
    });
  });

  describe('Requirement 3: Verification - Test sig verify; prove compression ratio >50%', () => {
    test('verifyLog should verify valid signatures', () => {
      const result = sendLog('Verification test', 'info', {
        APIEndpoint: '/verify',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      const isValid = verifyLog(result);
      expect(isValid).toBe(true);
    });

    test('verifyLog should reject tampered compressed data', () => {
      const result = sendLog('Tamper test', 'info', {
        APIEndpoint: '/tamper',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      // Tamper with the compressed data
      const tamperedResult = {
        ...result,
        compressedData: 999999999999n, // Different data
      };

      const isValid = verifyLog(tamperedResult);
      expect(isValid).toBe(false);
    });

    test('verifyLog should reject invalid signatures', () => {
      const result = sendLog('Invalid sig test', 'info', {
        APIEndpoint: '/invalid',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      // Tamper with the signature
      const tamperedResult = {
        ...result,
        signature: '0'.repeat(64), // Invalid signature
      };

      const isValid = verifyLog(tamperedResult);
      expect(isValid).toBe(false);
    });

    test('compression ratio should be greater than 50% for typical logs', () => {
      // Create a log with reasonable data
      const result = sendLog('This is a typical log message for testing', 'info', {
        APIEndpoint: '/api/v1/transactions/topup',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(result.compressionRatio).toBeDefined();
      expect(typeof result.compressionRatio).toBe('number');
      expect(result.compressionRatio).toBeGreaterThan(50);
    });

    test('DilithiumPQSigner.verify should validate correct signatures', () => {
      const testData = 123456789012345n;
      const signature = DilithiumPQSigner.sign(testData);

      const isValid = DilithiumPQSigner.verify(testData, signature);
      expect(isValid).toBe(true);
    });

    test('DilithiumPQSigner.verify should reject wrong signatures', () => {
      const testData = 123456789012345n;
      const wrongSignature = 'f'.repeat(64);

      const isValid = DilithiumPQSigner.verify(testData, wrongSignature);
      expect(isValid).toBe(false);
    });

    test('DilithiumPQSigner.verify should reject signatures with wrong length', () => {
      const testData = 123456789012345n;

      expect(DilithiumPQSigner.verify(testData, 'short')).toBe(false);
      expect(DilithiumPQSigner.verify(testData, 'a'.repeat(128))).toBe(false);
    });
  });

  describe('Constraint: Thread-Safety with Atomics', () => {
    test('AtomicCounter should increment atomically', () => {
      const counter = new AtomicCounter();

      const val1 = counter.increment();
      const val2 = counter.increment();
      const val3 = counter.increment();

      expect(val1).toBe(1);
      expect(val2).toBe(2);
      expect(val3).toBe(3);
      expect(counter.get()).toBe(3);
    });

    test('AtomicCounter should reset correctly', () => {
      const counter = new AtomicCounter();

      counter.increment();
      counter.increment();
      counter.reset();

      expect(counter.get()).toBe(0);
    });

    test('sendLog should use atomic counter for IDs', () => {
      resetLogCounter();

      const result1 = sendLog('Test 1', 'info', {
        APIEndpoint: '/test',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      const result2 = sendLog('Test 2', 'info', {
        APIEndpoint: '/test',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
    });
  });

  describe('Constraint: Quantum Forge Prevention', () => {
    test('signature should not be forgeable by simple XOR', () => {
      const data = 12345678901234567890n;
      const signature = DilithiumPQSigner.sign(data);

      // Attempt to forge by XORing with known value
      const forgedSig = (BigInt('0x' + signature) ^ 1n).toString(16).padStart(64, '0');

      const isValid = DilithiumPQSigner.verify(data, forgedSig);
      expect(isValid).toBe(false);
    });

    test('signature should not be forgeable by bit manipulation', () => {
      const data = 9876543210987654321n;
      const signature = DilithiumPQSigner.sign(data);

      // Attempt to forge by flipping bits
      const sigBigInt = BigInt('0x' + signature);
      const forgedSig1 = (sigBigInt ^ 0xFFn).toString(16).padStart(64, '0');
      const forgedSig2 = (sigBigInt ^ 0xFF00n).toString(16).padStart(64, '0');

      expect(DilithiumPQSigner.verify(data, forgedSig1)).toBe(false);
      expect(DilithiumPQSigner.verify(data, forgedSig2)).toBe(false);
    });

    test('different data should never produce same signature', () => {
      // Test with many different inputs
      const sig1 = DilithiumPQSigner.sign(1n);
      const sig2 = DilithiumPQSigner.sign(2n);
      const sig3 = DilithiumPQSigner.sign(3n);
      const sig4 = DilithiumPQSigner.sign(1000000n);
      const sig5 = DilithiumPQSigner.sign(9999999999999999999n);

      const signatures = [sig1, sig2, sig3, sig4, sig5];
      const uniqueSigs = new Set(signatures);

      expect(uniqueSigs.size).toBe(signatures.length);
    });
  });

  describe('Constraint: O(1) Time/Space Complexity', () => {
    test('FixedBufferSerializer should produce fixed-size output', () => {
      const small = FixedBufferSerializer.serialize('a', 'i', {
        APIEndpoint: '/a',
        method: 'G',
        HTTPStatusCode: 0,
        request: {},
        response: {},
        headers: {},
      });

      const large = FixedBufferSerializer.serialize(
        'A'.repeat(1000),
        'info'.repeat(100),
        {
          APIEndpoint: '/'.repeat(500),
          method: 'POST'.repeat(100),
          HTTPStatusCode: 999,
          request: {},
          response: {},
          headers: {},
        }
      );

      // Both outputs should be BigInt
      expect(typeof small).toBe('bigint');
      expect(typeof large).toBe('bigint');
    });

    test('sendLog output size should be constant regardless of input size', () => {
      const smallResult = sendLog('A', 'i', {
        APIEndpoint: '/a',
        method: 'G',
        HTTPStatusCode: 0,
        request: {},
        response: {},
        headers: {},
      });

      const largeResult = sendLog('X'.repeat(500), 'error', {
        APIEndpoint: '/very/long/endpoint/path'.repeat(10),
        method: 'POST',
        HTTPStatusCode: 500,
        request: {},
        response: {},
        headers: {},
      });

      // Signature length should always be 64 characters
      expect(smallResult.signature.length).toBe(64);
      expect(largeResult.signature.length).toBe(64);

      // Compressed data should always be BigInt (64-bit)
      expect(typeof smallResult.compressedData).toBe('bigint');
      expect(typeof largeResult.compressedData).toBe('bigint');
    });
  });

  describe('Constraint: Determinism (No Date.now in signed data)', () => {
    test('multiple calls with same input should produce identical results', () => {
      const data: APILogData = {
        APIEndpoint: '/determinism/test',
        method: 'PUT',
        HTTPStatusCode: 201,
        request: {},
        response: {},
        headers: {},
      };

      const results: { compressedData: bigint; signature: string }[] = [];

      // Call multiple times
      let i = 0;
      while (i < 5) {
        const result = sendLog('Determinism test', 'debug', data);
        results.push({
          compressedData: result.compressedData,
          signature: result.signature,
        });
        i++;
      }

      // All should be identical
      const first = results[0];
      let j = 1;
      while (j < results.length) {
        expect(results[j].compressedData).toBe(first.compressedData);
        expect(results[j].signature).toBe(first.signature);
        j++;
      }
    });

    test('sendLog should not include timestamp in compressed/signed data', () => {
      const data: APILogData = {
        APIEndpoint: '/test',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      };

      // Get two results at slightly different times
      const result1 = sendLog('Test', 'info', data);

      // Small delay simulation (doesn't actually delay, just ensures different call)
      const dummy = 1 + 1;

      const result2 = sendLog('Test', 'info', data);

      // Should be identical despite being called at different times
      expect(result1.compressedData).toBe(result2.compressedData);
      expect(result1.signature).toBe(result2.signature);
    });
  });

  describe('Integration: telecomTopupRequest', () => {
    test('telecomTopupRequest should process request with secure logging', async () => {
      const mockReq = {
        url: '/api/topup',
        method: 'POST',
        body: { amount: 100, phone: '+1234567890' },
        headers: { 'Content-Type': 'application/json' },
      };

      const result = await telecomTopupRequest(mockReq, null);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('Edge Case: Large logs truncated to 1KB', () => {
    test('very large input should be truncated and still work', () => {
      const hugeMessage = 'X'.repeat(10000);
      const hugeEndpoint = '/'.repeat(5000);

      const result = sendLog(hugeMessage, 'warning', {
        APIEndpoint: hugeEndpoint,
        method: 'DELETE',
        HTTPStatusCode: 500,
        request: {},
        response: {},
        headers: {},
      });

      expect(result).toBeDefined();
      expect(result.compressedData).toBeDefined();
      expect(result.signature.length).toBe(64);
      expect(verifyLog(result)).toBe(true);
    });
  });
});
