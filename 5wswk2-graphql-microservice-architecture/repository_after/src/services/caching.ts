import Redis from 'ioredis';
import { KeyValueCache } from '@apollo/utils.keyvaluecache';

// Implement KeyValueCache for Apollo
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
