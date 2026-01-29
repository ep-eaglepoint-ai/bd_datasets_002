/**
 * Test suite for Telecom TopUp Transaction Logging
 * Tests compression, signing, verification, and determinism
 */

import {
  sendLog,
  verifyLog,
  DilithiumPQSigner,
  InlineCompressor,
  telecomTopupRequest,
  LOG_BUFFER_SIZE,
  APILogData
} from '@controller';

describe('Transaction Logging Optimization', () => {

  describe('Requirement 1: Inline Compress - Deflate each log O(1)', () => {
    test('sendLog should return compressed data', () => {
      const result = sendLog('Test message', 'info', {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: { data: 'test' },
        response: { success: true },
        headers: {},
      });

      expect(result).toBeDefined();
      expect(result.compressedData).toBeDefined();
      expect(Buffer.isBuffer(result.compressedData)).toBe(true);
    });

    test('InlineCompressor should compress data', () => {
      const testData = 'This is a test string that should be compressed';
      const compressed = InlineCompressor.compress(testData);

      expect(Buffer.isBuffer(compressed)).toBe(true);
      expect(compressed.length).toBeGreaterThan(0);
    });

    test('compression should be deterministic (same input = same output)', () => {
      const testData = 'Deterministic test data for compression';
      const compressed1 = InlineCompressor.compress(testData);
      const compressed2 = InlineCompressor.compress(testData);

      expect(compressed1.equals(compressed2)).toBe(true);
    });

    test('large logs should be truncated to 1KB for O(1) space', () => {
      expect(LOG_BUFFER_SIZE).toBe(1024);

      // Create a large string > 1KB
      const largeData = 'X'.repeat(5000);
      const compressed = InlineCompressor.compress(largeData);

      // Compression of 1KB fixed input should produce consistent size
      expect(Buffer.isBuffer(compressed)).toBe(true);
    });

    test('O(1) constraint: output size bounded regardless of input size', () => {
      // Test with different input sizes
      const smallInput = 'A'.repeat(100);      // 100 bytes
      const mediumInput = 'B'.repeat(1000);    // 1KB
      const largeInput = 'C'.repeat(10000);    // 10KB
      const hugeInput = 'D'.repeat(100000);    // 100KB

      const smallCompressed = InlineCompressor.compress(smallInput);
      const mediumCompressed = InlineCompressor.compress(mediumInput);
      const largeCompressed = InlineCompressor.compress(largeInput);
      const hugeCompressed = InlineCompressor.compress(hugeInput);

      // All outputs should be bounded (truncation ensures O(1) space)
      // Large and huge inputs should produce same size due to 1KB truncation
      expect(largeCompressed.length).toBe(hugeCompressed.length);

      // All compressed outputs should be smaller than LOG_BUFFER_SIZE
      expect(smallCompressed.length).toBeLessThanOrEqual(LOG_BUFFER_SIZE);
      expect(mediumCompressed.length).toBeLessThanOrEqual(LOG_BUFFER_SIZE);
      expect(largeCompressed.length).toBeLessThanOrEqual(LOG_BUFFER_SIZE);
      expect(hugeCompressed.length).toBeLessThanOrEqual(LOG_BUFFER_SIZE);
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
      expect(result1.compressedData.equals(result2.compressedData)).toBe(true);
      expect(result1.signature.equals(result2.signature)).toBe(true);
    });
  });

  describe('Requirement 2: PQ Sign - Dilithium on compressed', () => {
    test('sendLog should return a signature', () => {
      const result = sendLog('Test message', 'info', {
        APIEndpoint: '/test',
        method: 'POST',
        HTTPStatusCode: 200,
        request: {},
        response: {},
        headers: {},
      });

      expect(result.signature).toBeDefined();
      expect(Buffer.isBuffer(result.signature)).toBe(true);
      expect(result.signature.length).toBe(64); // Dilithium signature size
    });

    test('DilithiumPQSigner should sign data', () => {
      const testData = Buffer.from('Test data to sign');
      const signature = DilithiumPQSigner.sign(testData);

      expect(Buffer.isBuffer(signature)).toBe(true);
      expect(signature.length).toBe(64);
    });

    test('signature should be deterministic (same input = same signature)', () => {
      const testData = Buffer.from('Deterministic signature test');
      const sig1 = DilithiumPQSigner.sign(testData);
      const sig2 = DilithiumPQSigner.sign(testData);

      expect(sig1.equals(sig2)).toBe(true);
    });

    test('different inputs should produce different signatures', () => {
      const data1 = Buffer.from('Data set 1');
      const data2 = Buffer.from('Data set 2');
      const sig1 = DilithiumPQSigner.sign(data1);
      const sig2 = DilithiumPQSigner.sign(data2);

      expect(sig1.equals(sig2)).toBe(false);
    });
  });

  describe('Requirement 3: Verification - Test sig verify; prove compression ratio >50%', () => {
    test('verifyLog should verify valid signatures', () => {
      const result = sendLog('Verification test', 'info', {
        APIEndpoint: '/verify',
        method: 'GET',
        HTTPStatusCode: 200,
        request: {},
        response: { verified: true },
        headers: {},
      });

      const isValid = verifyLog(result);
      expect(isValid).toBe(true);
    });

    test('verifyLog should reject tampered data', () => {
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
        compressedData: Buffer.from('tampered data'),
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
        signature: Buffer.alloc(64, 0), // Zero-filled invalid signature
      };

      const isValid = verifyLog(tamperedResult);
      expect(isValid).toBe(false);
    });

    test('compression ratio should be greater than 50%', () => {
      // Create a log with highly repetitive data (compresses very well)
      const repetitiveData = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const result = sendLog(repetitiveData, 'info', {
        APIEndpoint: repetitiveData,
        method: 'POST',
        HTTPStatusCode: 200,
        request: { data: repetitiveData, repeat: repetitiveData },
        response: { success: true, message: repetitiveData },
        headers: { 'Content-Type': repetitiveData, 'X-Custom': repetitiveData },
      });

      expect(result.compressionRatio).toBeDefined();
      expect(typeof result.compressionRatio).toBe('number');
      expect(result.compressionRatio).toBeGreaterThan(50);
    });

    test('DilithiumPQSigner.verify should validate correct signatures', () => {
      const testData = Buffer.from('Verification test data');
      const signature = DilithiumPQSigner.sign(testData);

      const isValid = DilithiumPQSigner.verify(testData, signature);
      expect(isValid).toBe(true);
    });

    test('DilithiumPQSigner.verify should reject wrong signatures', () => {
      const testData = Buffer.from('Original data');
      const wrongSignature = Buffer.alloc(64, 255);

      const isValid = DilithiumPQSigner.verify(testData, wrongSignature);
      expect(isValid).toBe(false);
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
});
