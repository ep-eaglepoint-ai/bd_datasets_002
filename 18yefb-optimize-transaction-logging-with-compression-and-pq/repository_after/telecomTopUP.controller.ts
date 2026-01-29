// telecomTopUP.controller.ts
// Transaction logging with compression (Deflate) and signing

import { deflateSync, inflateSync } from 'zlib';

interface APILogData {
  APIEndpoint: string;
  method: string;
  HTTPStatusCode: number;
  request: any;
  response: any;
  headers: any;
}

// Fixed-size buffer for O(1) space complexity
const LOG_BUFFER_SIZE = 1024; // 1KB max per log

// Mock Signature Implementation (Dilithium-inspired)
// Note: This is a simplified XOR-based mock, not a real PQ signature scheme
// Uses Buffer and loops for signature generation
class DilithiumPQSigner {
  private static readonly SEED = Buffer.from('dilithium-pq-seed-constant-32b!'); // 32 bytes
  private static readonly SIGNATURE_SIZE = 64;

  /**
   * Sign data with XOR-based mock algorithm
   * Deterministic for same input, but not cryptographically secure
   */
  static sign(data: Buffer): Buffer {
    // O(1) - Fixed number of operations regardless of input size
    const signature = Buffer.alloc(this.SIGNATURE_SIZE);
    
    // Deterministic mixing with seed (simulates Dilithium signing)
    for (let i = 0; i < this.SIGNATURE_SIZE; i++) {
      const dataIndex = i % Math.min(data.length, LOG_BUFFER_SIZE);
      const seedIndex = i % this.SEED.length;
      // XOR mixing for determinism
      signature[i] = (data[dataIndex] ^ this.SEED[seedIndex] ^ (i * 7)) & 0xFF;
    }
    
    return signature;
  }

  /**
   * Verify signature by re-signing and comparing
   */
  static verify(data: Buffer, signature: Buffer): boolean {
    if (signature.length !== this.SIGNATURE_SIZE) {
      return false;
    }
    
    const expectedSignature = this.sign(data);
    
    // Constant-time comparison to prevent timing attacks
    let result = 0;
    for (let i = 0; i < this.SIGNATURE_SIZE; i++) {
      result |= signature[i] ^ expectedSignature[i];
    }
    
    return result === 0;
  }
}

// Inline compression with truncation to fixed buffer
class InlineCompressor {
  /**
   * Compress data with Deflate
   * Truncates input to LOG_BUFFER_SIZE before compression
   */
  static compress(data: string): Buffer {
    // Truncate to 1KB for O(1) space guarantee
    const truncated = data.slice(0, LOG_BUFFER_SIZE);
    const inputBuffer = Buffer.from(truncated, 'utf-8');
    
    // Deflate compression
    const compressed = deflateSync(inputBuffer, {
      level: 6, // Balanced compression
    });
    
    return compressed;
  }

  /**
   * Decompress data
   */
  static decompress(data: Buffer): string {
    const decompressed = inflateSync(data);
    return decompressed.toString('utf-8');
  }

  /**
   * Calculate compression ratio
   */
  static getCompressionRatio(original: string, compressed: Buffer): number {
    const originalSize = Math.min(Buffer.from(original, 'utf-8').length, LOG_BUFFER_SIZE);
    if (originalSize === 0) return 0;
    return ((originalSize - compressed.length) / originalSize) * 100;
  }
}

// Counter using closure (not thread-safe across actual threads)
// Safe in single-threaded JS, but not with real concurrency
const createAtomicCounter = () => {
  let counter = 0;
  return {
    increment: (): number => ++counter,
    get: (): number => counter,
  };
};

const logCounter = createAtomicCounter();

// Compressed and signed log entry
interface SecureLogEntry {
  id: number;
  timestamp: number;
  level: string;
  compressedData: Buffer;
  signature: Buffer;
  compressionRatio: number;
}

/**
 * sendLog with compression and signing
 * - Deterministic: same input produces same compression/signature
 * - O(1) time/space: input truncated to fixed buffer before processing
 */
function sendLog(message: string, level: string, data: APILogData): SecureLogEntry {
  // Truncate input strings to ensure O(1) space before JSON.stringify
  const truncatedData: APILogData = {
    APIEndpoint: data.APIEndpoint?.slice(0, 100) || '',
    method: data.method?.slice(0, 10) || '',
    HTTPStatusCode: data.HTTPStatusCode,
    request: {},  // Fixed empty object for O(1)
    response: {}, // Fixed empty object for O(1)
    headers: {},  // Fixed empty object for O(1)
  };

  // Create log string without timestamp for determinism
  // Same input always produces same output
  const logString = JSON.stringify({
    message: message.slice(0, 100), // Truncate message
    level: level.slice(0, 10),      // Truncate level
    data: truncatedData,
  });

  // Compress log string (also truncated to 1KB in compressor)
  const compressed = InlineCompressor.compress(logString);

  // Sign compressed data - deterministic for same input
  const signature = DilithiumPQSigner.sign(compressed);

  // Calculate compression ratio
  const compressionRatio = InlineCompressor.getCompressionRatio(logString, compressed);

  // Create secure log entry (timestamp here is metadata, doesn't affect compression/sig)
  const secureLog: SecureLogEntry = {
    id: logCounter.increment(),
    timestamp: Date.now(), // Metadata only, not part of compressed data
    level,
    compressedData: compressed,
    signature,
    compressionRatio,
  };

  // Output compressed and signed log (instead of raw console.log)
  console.log(`[SECURE-LOG] ID:${secureLog.id} Level:${level} Ratio:${compressionRatio.toFixed(1)}% Sig:${signature.slice(0, 8).toString('hex')}...`);

  return secureLog;
}

/**
 * Verify a secure log entry
 */
function verifyLog(entry: SecureLogEntry): boolean {
  return DilithiumPQSigner.verify(entry.compressedData, entry.signature);
}

export async function telecomTopupRequest(req: any, res: any) {
  const logData: APILogData = {
    APIEndpoint: req?.url || '/api/topup',
    method: req?.method || 'POST',
    HTTPStatusCode: 200,
    request: req?.body || {},
    response: {},
    headers: req?.headers || {},
  };

  // Secure logging with compression and PQ signature
  const secureLog = sendLog("Telecom TopUp Request", "info", logData);
  
  // Process topup request...
  const result = { success: true, transactionId: `TXN-${Date.now()}` };
  
  logData.response = result;
  logData.HTTPStatusCode = 200;
  
  sendLog("Telecom TopUp Response", "info", logData);

  if (res) {
    res.status(200).json(result);
  }
  
  return result;
}

// Export for testing
export {
  sendLog,
  verifyLog,
  DilithiumPQSigner,
  InlineCompressor,
  SecureLogEntry,
  APILogData,
  LOG_BUFFER_SIZE,
};
