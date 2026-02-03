import Redis from 'ioredis';
import { PubSub } from 'graphql-subscriptions';

/**
 * Redis PubSub for scalable subscription fan-out across instances.
 * Uses Redis for message distribution in a multi-instance environment.
 */

export class RedisPubSub {
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions: Map<string, Set<(message: any) => void>> = new Map();

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('message', (channel, message) => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        const parsed = JSON.parse(message);
        handlers.forEach(handler => handler(parsed));
      }
    });
  }

  /**
   * Publish a message to a channel.
   */
  async publish(channel: string, payload: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  /**
   * Subscribe to a channel with filtering support.
   */
  subscribe(channel: string, handler: (message: any) => void, filter?: (message: any) => boolean): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.subscriber.subscribe(channel);
    }

    const wrappedHandler = filter 
      ? (message: any) => { if (filter(message)) handler(message); }
      : handler;

    this.subscriptions.get(channel)!.add(wrappedHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.delete(wrappedHandler);
        if (handlers.size === 0) {
          this.subscriber.unsubscribe(channel);
          this.subscriptions.delete(channel);
        }
      }
    };
  }

  async close(): Promise<void> {
    try {
      await this.publisher.quit();
    } catch (e) {
      // Connection may already be closed
    }
    try {
      await this.subscriber.quit();
    } catch (e) {
      // Connection may already be closed
    }
  }
}

// Simple in-memory PubSub for single-instance mode
export const localPubSub = new PubSub();

// Factory to create the appropriate PubSub based on environment
export function createPubSub(redisUrl?: string): RedisPubSub | PubSub {
  if (redisUrl) {
    return new RedisPubSub(redisUrl);
  }
  return localPubSub;
}

/**
 * Subscription channels for the application
 */
export const SUBSCRIPTION_CHANNELS = {
  REVIEW_ADDED: 'REVIEW_ADDED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  USER_STATUS: 'USER_STATUS',
} as const;
