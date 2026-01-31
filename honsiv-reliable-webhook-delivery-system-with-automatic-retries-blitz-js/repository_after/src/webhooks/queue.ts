import { Queue, Worker } from "bullmq"
import Redis from "ioredis"

let connection: Redis | null = null
let queue: Queue | null = null

export function getRedisConnection() {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function getQueue(queueName: string) {
  if (!queue || queue.name !== queueName) {
    queue = new Queue(queueName, {
      connection: getRedisConnection(),
    })
  }
  return queue
}

export function createWorker(queueName: string, processor: any, options: any = {}) {
  return new Worker(queueName, processor, {
    connection: getRedisConnection(),
    ...options,
  })
}
