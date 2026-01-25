import nodemailer from 'nodemailer'
import { Queue, Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { EmailNotificationPayload, DeadLetterQueueEntry } from './types'
import { backoffWithJitter } from './helpers'

export class NotificationWorker {
  private worker: Worker
  private transporter: any
  private dlq: Queue
  private redisMain: Redis
  private redisDLQ: Redis
  private redisWorker: Redis

  private consecutiveFailures = 0
  private circuitOpen = false
  private readonly MAX_FAILURES = 10

  constructor(
    redis: Redis,
    smtpConfig: any,
    queueName = 'email_task',
    dlqName = 'email_dlq',
    injectedTransporter?: any
  ) {
    this.transporter =
      injectedTransporter || nodemailer.createTransport(smtpConfig)

    const redisOpts = { ...redis.options, maxRetriesPerRequest: null }
    
    this.redisMain = new Redis(redisOpts)
    this.redisDLQ = new Redis(redisOpts)
    this.redisWorker = new Redis(redisOpts)

    this.dlq = new Queue(dlqName, { connection: this.redisDLQ })

    this.worker = new Worker(
      queueName,
      this.process.bind(this),
      {
        connection: this.redisWorker,
        settings: {
          backoffStrategy: backoffWithJitter,
        },
        concurrency: 1, // Deterministic for tests
      }
    )
  }

  private async process(job: Job<EmailNotificationPayload>) {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker OPEN')
    }

    try {
      await this.transporter.sendMail({
        from: 'noreply@enterprise.com',
        to: job.data.to,
        subject: job.data.subject,
        text: job.data.body,
      })

      this.consecutiveFailures = 0
    } catch (err: any) {
      this.consecutiveFailures++

      if (this.consecutiveFailures >= this.MAX_FAILURES) {
        this.circuitOpen = true
      }

      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await this.sendToDLQ(job, err.message)
      }

      throw err
    }
  }

  private async sendToDLQ(job: Job, reason: string) {
    const entry: DeadLetterQueueEntry = {
      jobId: job.id!,
      payload: job.data,
      failureReasons: [reason],
      failedAt: new Date(),
      totalAttempts: job.attemptsMade + 1,
    }

    await this.dlq.add('dlq', entry, {
      jobId: `dlq-${job.id}`,
    })
  }

  getCircuitBreakerState() {
    return {
      opened: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
    }
  }

  // Expose worker for monitoring attempt-level events

  getWorker() {
    return this.worker
  }

  async getDeadLetterQueue(): Promise<DeadLetterQueueEntry[]> {
    const jobs = await this.dlq.getJobs(['waiting', 'completed', 'failed'])
    return jobs.map(j => j.data)
  }

  async close() {
    await this.worker.close()
    await this.dlq.close()
    await Promise.all([
        this.redisMain.quit(),
        this.redisDLQ.quit(),
        this.redisWorker.quit()
    ])
  }
}
