import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { GraphQLError } from 'graphql';

export class RateLimitService {
  private limiter: RateLimiterRedis;

  constructor(redisClient: Redis) {
    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'middleware',
      points: 10, // Lower limit for testing purposes
      duration: 1, 
    });
  }

  async checkRateLimit(key: string, points: number = 1) {
    try {
      await this.limiter.consume(key, points);
    } catch (rejRes) {
      throw new GraphQLError(`Too Many Requests. Requested: ${points}`, {
        extensions: {
          code: 'TOO_MANY_REQUESTS',
          http: { status: 429 }
        }
      });
    }
  }
}
