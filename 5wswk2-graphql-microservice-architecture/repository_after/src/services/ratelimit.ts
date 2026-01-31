import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { GraphQLError } from 'graphql';

export interface RateLimitConfig {
  points: number;       // Maximum points per duration
  duration: number;     // Duration in seconds
  blockDuration?: number; // Block duration after exceeding limit
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  consumedPoints: number;
  retryAfterMs: number;
}

export class RateLimitService {
  private limiter: RateLimiterRedis;
  private config: RateLimitConfig;

  constructor(redisClient: Redis, config: Partial<RateLimitConfig> = {}) {
    this.config = {
      points: config.points ?? 10,
      duration: config.duration ?? 1,
      blockDuration: config.blockDuration ?? 0,
      keyPrefix: config.keyPrefix ?? 'middleware',
    };

    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: this.config.keyPrefix,
      points: this.config.points,
      duration: this.config.duration,
      blockDuration: this.config.blockDuration,
    });
  }

  /**
   * Check rate limit and consume points based on query complexity.
   * @param key The identifier for rate limiting (user ID, IP, etc.)
   * @param points Number of points to consume (e.g., query complexity score)
   * @returns RateLimitResult with allowed status and retry info
   */
  async checkRateLimit(key: string, points: number = 1): Promise<RateLimitResult> {
    try {
      const res = await this.limiter.consume(key, points);
      return {
        allowed: true,
        remainingPoints: res.remainingPoints,
        consumedPoints: points,
        retryAfterMs: 0,
      };
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        const retryAfterMs = rejRes.msBeforeNext;
        throw new GraphQLError(`Too Many Requests. Retry after ${Math.ceil(retryAfterMs / 1000)}s`, {
          extensions: {
            code: 'TOO_MANY_REQUESTS',
            retryAfter: Math.ceil(retryAfterMs / 1000),
            http: { 
              status: 429,
              headers: new Map([['Retry-After', String(Math.ceil(retryAfterMs / 1000))]])
            }
          }
        });
      }
      throw rejRes;
    }
  }

  /**
   * Get current rate limit status for a key without consuming points.
   */
  async getStatus(key: string): Promise<{ remainingPoints: number; msBeforeNext: number }> {
    try {
      const res = await this.limiter.get(key);
      if (!res) {
        return { remainingPoints: this.config.points, msBeforeNext: 0 };
      }
      return {
        remainingPoints: res.remainingPoints,
        msBeforeNext: res.msBeforeNext,
      };
    } catch {
      return { remainingPoints: this.config.points, msBeforeNext: 0 };
    }
  }

  /**
   * Reset rate limit for a specific key.
   */
  async reset(key: string): Promise<void> {
    await this.limiter.delete(key);
  }

  /**
   * Get the configured rate limit
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating operation-specific rate limiters.
 * Allows different limits for queries, mutations, subscriptions.
 */
export function createOperationLimiters(redisClient: Redis): {
  query: RateLimitService;
  mutation: RateLimitService;
  subscription: RateLimitService;
} {
  return {
    query: new RateLimitService(redisClient, { points: 100, duration: 60, keyPrefix: 'rl:query' }),
    mutation: new RateLimitService(redisClient, { points: 20, duration: 60, keyPrefix: 'rl:mutation' }),
    subscription: new RateLimitService(redisClient, { points: 5, duration: 60, keyPrefix: 'rl:sub' }),
  };
}
