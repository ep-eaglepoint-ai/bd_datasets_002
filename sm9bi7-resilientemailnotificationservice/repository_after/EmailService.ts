import nodemailer from 'nodemailer'
import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import crypto from 'crypto'

/* ===================== TYPES ===================== */

export interface EmailNotificationPayload {
  user_id: string
  notification_type: string
  to: string
  subject: string
  body: string
  timestamp: number
}

export interface DeadLetterQueueEntry {
  jobId: string
  payload: EmailNotificationPayload
  failureReasons: string[]
  failedAt: Date
  totalAttempts: number
}

/* ===================== HELPERS ===================== */

/**
 * Exactly-once deduplication key
 */
function dedupKey(p: EmailNotificationPayload): string {
  return crypto
    .createHash('sha256')
    .update(`${p.user_id}:${p.notification_type}:${p.timestamp}`)
    .digest('hex')
}

/**
 * Exponential backoff with jitter
 */
function backoffWithJitter(attempt: number): number {
  if (process.env.NODE_ENV === 'test') {
    return 1000 // 1s - fast but allows time for test to recover SMTP
  }
  console.warn(`[WARN] backoffWithJitter: NODE_ENV is ${process.env.NODE_ENV}. Using production backoff.`)
  const base = 5000 * Math.pow(2, attempt - 1)
  const jitter = Math.floor(Math.random() * 1000)
  return base + jitter
}

/* ===================== PRODUCER ===================== */

export class EmailProducer {
  private queue: Queue

  constructor(redis: IORedis, queueName = 'email_task') {
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

/* ===================== WORKER ===================== */

export class NotificationWorker {
  private worker: Worker
  private transporter: any
  private dlq: Queue
  private redisMain: IORedis
  private redisDLQ: IORedis
  private redisWorker: IORedis

  private consecutiveFailures = 0
  private circuitOpen = false
  private readonly MAX_FAILURES = 10

  constructor(
    redis: IORedis,
    smtpConfig: any,
    queueName = 'email_task',
    dlqName = 'email_dlq',
    injectedTransporter?: any
  ) {
    this.transporter =
      injectedTransporter || nodemailer.createTransport(smtpConfig)

    // BullMQ Worker MUST have its own dedicated connection.
    // We clone the options from the provided redis instance.
    const redisOpts = { ...redis.options, maxRetriesPerRequest: null }
    
    this.redisMain = new IORedis(redisOpts)
    this.redisDLQ = new IORedis(redisOpts)
    this.redisWorker = new IORedis(redisOpts)

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

  /**
   * Expose worker for monitoring attempt-level events
   */
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
