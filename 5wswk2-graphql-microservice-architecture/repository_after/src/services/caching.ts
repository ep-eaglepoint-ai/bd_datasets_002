import Redis from 'ioredis';
import { KeyValueCache } from '@apollo/utils.keyvaluecache';
import { createHash } from 'crypto';

/**
 * LRU Cache Entry
 */
interface CacheEntry {
  value: string;
  expiry: number | null;
}

/**
 * In-Memory LRU Cache Layer
 * Provides fast local caching with Redis as fallback/source of truth.
 */
class LRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Multi-layer cache: LRU (L1) + Redis (L2)
 */
export class MultiLayerCache implements KeyValueCache {
  private l1: LRUCache;
  private l2: Redis;
  private hits: number = 0;
  private misses: number = 0;

  constructor(redisClient: Redis, lruSize: number = 1000) {
    this.l1 = new LRUCache(lruSize);
    this.l2 = redisClient;
  }

  async get(key: string): Promise<string | undefined> {
    // Try L1 first
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      this.hits++;
      return l1Value;
    }

    // Fall back to L2
    const l2Value = await this.l2.get(key);
    if (l2Value) {
      this.hits++;
      // Populate L1
      this.l1.set(key, l2Value);
      return l2Value;
    }

    this.misses++;
    return undefined;
  }

  async set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const ttl = options?.ttl;

    // Set in both layers
    this.l1.set(key, value, ttl);

    if (ttl) {
      await this.l2.set(key, value, 'EX', ttl);
    } else {
      await this.l2.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
  }

  /**
   * Invalidate by pattern (for webhooks)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.l2.keys(pattern);
    if (keys.length > 0) {
      await this.l2.del(...keys);
      keys.forEach(k => this.l1.delete(k));
    }
    return keys.length;
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /**
   * Get cache stats
   */
  getStats(): { hits: number; misses: number; hitRate: number; l1Size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      l1Size: this.l1.size(),
    };
  }
}

/**
 * Generate normalized cache key from GraphQL query
 */
export function normalizeQueryCacheKey(query: string, variables: any = {}): string {
  // Remove whitespace and normalize
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();
  const sortedVariables = JSON.stringify(variables, Object.keys(variables).sort());
  
  const hash = createHash('sha256')
    .update(normalizedQuery + sortedVariables)
    .digest('hex')
    .substring(0, 16);

  return `gql:${hash}`;
}

// Keep backward compatibility
export class RedisCache implements KeyValueCache {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async get(key: string): Promise<string | undefined> {
    const res = await this.client.get(key);
    return res || undefined;
  }

  async set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const ttl = options?.ttl;
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
