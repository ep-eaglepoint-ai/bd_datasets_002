import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { EmailNotificationPayload } from './types'
import { dedupKey } from './helpers'

export class EmailProducer {
  private queue: Queue

  constructor(redis: Redis, queueName = 'email_task') {
    this.queue = new Queue(queueName, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'custom' },
        removeOnComplete: false,
        removeOnFail: false,
      },
    })
  }

  /**
   * Non-blocking enqueue only
   */
  async sendNotification(payload: EmailNotificationPayload): Promise<string> {
    const jobId = dedupKey(payload)

    const job = await this.queue.add('email_task', payload, {
      jobId,
      backoff: { type: 'custom' },
    })

    return job.id!
  }

  getQueue() {
    return this.queue
  }

  async close() {
    await this.queue.close()
  }
}
