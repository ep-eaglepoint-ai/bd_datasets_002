/**
 * Redis pub/sub for worker -> API process.
 * Worker (separate process) publishes progress/error/completed; API subscribes and broadcasts to WebSocket clients.
 */
import Redis from 'ioredis';
import { config } from './index';

const CHANNEL = 'job:events';

export function createJobEventsPublisher(): Redis {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
}

export function createJobEventsSubscriber(): Redis {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
}

export interface JobEventPayload {
  jobId: string;
  message: Record<string, unknown>;
}

export function publishJobEvent(publisher: Redis, jobId: string, message: Record<string, unknown>): Promise<number> {
  return publisher.publish(CHANNEL, JSON.stringify({ jobId, message }));
}

export function subscribeToJobEvents(subscriber: Redis, onEvent: (payload: JobEventPayload) => void): void {
  subscriber.subscribe(CHANNEL);
  subscriber.on('message', (channel, data) => {
    if (channel === CHANNEL) {
      try {
        const payload = JSON.parse(data) as JobEventPayload;
        onEvent(payload);
      } catch (e) {
        console.error('job:events parse error', e);
      }
    }
  });
}

export { CHANNEL };
