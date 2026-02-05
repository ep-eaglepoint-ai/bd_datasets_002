// telebirr_calls.ts
// Original faulty implementation - no proper rate limiting, vulnerable to quantum attacks

// Stub DilithiumPQSigner - not properly implemented
class DilithiumPQSigner {
  static sign(data: string): string {
    return ''; // Not implemented - returns empty string
  }
  static verify(data: string, signature: string): boolean {
    return false; // Not implemented - always returns false
  }
}

// Stub TokenBucketRateLimiter - not properly implemented
class TokenBucketRateLimiter {
  tryConsume(endpoint: string): { allowed: boolean; token?: string; remaining: number; signature?: string } {
    return { allowed: true, remaining: 0 }; // Faulty: always allows, no actual limiting
  }
  getRemaining(): number {
    return 0; // Not implemented
  }
  reset(): void {}
  getState(): { tokens: number; maxTokens: number; burstLimit: number; operationCount: number } {
    return { tokens: 0, maxTokens: 0, burstLimit: 0, operationCount: 0 };
  }
}

// Mock axios for compatibility
const mockAxios = {
  post: async (url: string, body: any, config: any): Promise<{ data: any }> => {
    return { data: { success: true, url, body } };
  }
};

// Original faulty implementation - no rate limiting
export async function teleBirrCoreCall(
  reqheaders: any, 
  reqmethod: string, 
  reqbody: any
): Promise<{ status: number; data?: any; message?: string; rateLimit?: { remaining: number; signature?: string } }> {
  try {
    const response = await mockAxios.post(
      'https://api.example.com/telebirr', 
      reqbody, 
      { headers: reqheaders }
    );
    return { 
      status: 200, 
      data: response.data,
      rateLimit: { remaining: 0 } // Faulty: no actual rate limiting
    };
  } catch (error: any) {
    return { status: 500, message: error.message };
  }
}

// Stub exports
export function resetRateLimiter(): void {}

export function getRateLimiterState(): { tokens: number; maxTokens: number; burstLimit: number; operationCount: number } {
  return { tokens: 0, maxTokens: 0, burstLimit: 0, operationCount: 0 };
}

export function getRemainingTokens(): number {
  return 0;
}

// Time mocking stubs (not implemented in before)
export function setMockTime(time: number | null): void {}
export function advanceMockTime(ms: number): void {}

export { DilithiumPQSigner, TokenBucketRateLimiter };