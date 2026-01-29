// telebirr_calls.ts
// Token Bucket rate limiting with signature generation

/**
 * Mock Signature Implementation (Dilithium-inspired)
 * Note: This is a simplified XOR-based mock, not a real PQ signature scheme
 * Uses Buffer and loops for signature generation
 */
class DilithiumPQSigner {
  private static readonly SEED = Buffer.from('dilithium-pq-seed-32bytes!!!!!'); // 32 bytes fixed seed
  private static readonly SIGNATURE_SIZE = 64;

  /**
   * Sign data with XOR-based mock algorithm
   * Deterministic for same input, but not cryptographically secure
   */
  static sign(data: string): string {
    const dataBuffer = Buffer.from(data);
    const signature = Buffer.alloc(this.SIGNATURE_SIZE);
    
    // O(1) - Fixed 64 iterations regardless of input
    for (let i = 0; i < this.SIGNATURE_SIZE; i++) {
      const dataIndex = i % Math.min(dataBuffer.length, 32);
      const seedIndex = i % this.SEED.length;
      signature[i] = (dataBuffer[dataIndex] ^ this.SEED[seedIndex] ^ (i * 7)) & 0xFF;
    }
    
    return signature.toString('hex');
  }

  /**
   * Verify signature by re-signing and comparing
   */
  static verify(data: string, signature: string): boolean {
    if (signature.length !== this.SIGNATURE_SIZE * 2) { // hex is 2x size
      return false;
    }
    
    const expectedSignature = this.sign(data);
    
    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return result === 0;
  }
}

/**
 * Token Bucket Rate Limiter
 * - Refill rate: 100 tokens per minute
 * - Burst capacity: 10 tokens max at any time
 * - Uses Date.now() for time tracking (not deterministic for call sequences)
 * - No atomic operations (not thread-safe under concurrent access)
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private readonly burstLimit: number;
  
  // Operation counter (not atomic, just a regular number)
  private operationCounter: number = 0;

  constructor(
    maxTokensPerMinute: number = 100,
    burstLimit: number = 10
  ) {
    this.maxTokens = maxTokensPerMinute;
    this.burstLimit = burstLimit;
    this.refillRate = maxTokensPerMinute / 60000; // tokens per ms
    this.tokens = burstLimit; // Start with burst capacity
    this.lastRefillTime = Date.now();
  }

  /**
   * Generate signed rate token using mock signer
   */
  private generateToken(endpoint: string, timestamp: number): string {
    const tokenData = `${endpoint}:${timestamp}:${this.operationCounter}`;
    return DilithiumPQSigner.sign(tokenData);
  }

  /**
   * Verify rate token (currently unused)
   */
  private verifyToken(endpoint: string, timestamp: number, token: string): boolean {
    const tokenData = `${endpoint}:${timestamp}:${this.operationCounter}`;
    return DilithiumPQSigner.verify(tokenData, token);
  }

  /**
   * Refill tokens based on elapsed time
   * Uses Date.now() - time-dependent behavior
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    
    // Calculate tokens to add
    const tokensToAdd = elapsed * this.refillRate;

    // Update tokens, capped at burst limit
    this.tokens = Math.min(this.burstLimit, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to consume a token
   * Returns: { allowed: boolean, token?: string, remaining: number }
   */
  tryConsume(endpoint: string): { allowed: boolean; token?: string; remaining: number; signature?: string } {
    this.operationCounter++;
    
    // Refill based on time elapsed
    this.refill();

    // Check if tokens available
    if (this.tokens < 1) {
      return { 
        allowed: false, 
        remaining: 0 
      };
    }
    
    // Consume token
    this.tokens -= 1;

    // Generate signed token for this request
    const timestamp = Date.now();
    const signature = this.generateToken(endpoint, timestamp);
    
    return {
      allowed: true,
      token: `${endpoint}:${timestamp}`,
      signature,
      remaining: Math.floor(this.tokens)
    };
  }

  /**
   * Check remaining tokens without consuming
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset(): void {
    this.tokens = this.burstLimit;
    this.lastRefillTime = Date.now();
    this.operationCounter = 0;
  }

  /**
   * Get current state (for testing/monitoring)
   */
  getState(): { tokens: number; maxTokens: number; burstLimit: number; operationCount: number } {
    return {
      tokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      burstLimit: this.burstLimit,
      operationCount: this.operationCounter
    };
  }
}

// Global rate limiter instance
const rateLimiter = new TokenBucketRateLimiter(100, 10);

// Mock axios for testing (no external deps)
const mockAxios = {
  post: async (url: string, body: any, config: any): Promise<{ data: any }> => {
    return { data: { success: true, url, body } };
  }
};

/**
 * TeleBirr Core Call with rate limiting
 * - Token Bucket: 100/min refill rate, burst capacity 10
 * - Returns 429 when rate limit exceeded
 */
export async function teleBirrCoreCall(
  reqheaders: any, 
  reqmethod: string, 
  reqbody: any
): Promise<{ status: number; data?: any; message?: string; rateLimit?: { remaining: number; signature?: string } }> {
  
  // Try to consume a rate token
  const rateResult = rateLimiter.tryConsume('telebirr');
  
  // Rate limit exceeded - return 429
  if (!rateResult.allowed) {
    return { 
      status: 429, 
      message: 'Rate limit exceeded',
      rateLimit: { remaining: 0 }
    };
  }
  
  try {
    // Make API call (using mock for testing)
    const response = await mockAxios.post(
      'https://api.example.com/telebirr', 
      reqbody, 
      { headers: reqheaders }
    );
    
    return { 
      status: 200, 
      data: response.data,
      rateLimit: {
        remaining: rateResult.remaining,
        signature: rateResult.signature
      }
    };
  } catch (error: any) {
    return { 
      status: 500, 
      message: error.message,
      rateLimit: {
        remaining: rateResult.remaining,
        signature: rateResult.signature
      }
    };
  }
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiter.reset();
}

/**
 * Get rate limiter state (for testing/monitoring)
 */
export function getRateLimiterState(): { tokens: number; maxTokens: number; burstLimit: number; operationCount: number } {
  return rateLimiter.getState();
}

/**
 * Get remaining rate limit tokens
 */
export function getRemainingTokens(): number {
  return rateLimiter.getRemaining();
}

// Export classes for testing
export { DilithiumPQSigner, TokenBucketRateLimiter };