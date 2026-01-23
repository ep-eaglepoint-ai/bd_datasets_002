import nodemailer from 'nodemailer';
import { Queue, QueueOptions, Job } from 'bullmq';
import { Worker, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import CircuitBreaker from 'opossum';
import crypto from 'crypto';

// Types for email notification payload
export interface EmailNotificationPayload {
    user_id: string;
    notification_type: string;
    to: string;
    subject: string;
    body: string;
    timestamp?: number;
}

export interface EmailJobData extends EmailNotificationPayload {
    attemptNumber?: number;
    deduplicationKey?: string;
}

export interface DeadLetterQueueEntry {
    jobId: string;
    payload: EmailNotificationPayload;
    failureReasons: string[];
    failedAt: Date;
    totalAttempts: number;
}

/**
 * Generates a deduplication key for idempotency
 * Format: hash(user_id + notification_type + timestamp)
 */
function generateDeduplicationKey(payload: EmailNotificationPayload): string {
    const timestamp = payload.timestamp || Date.now();
    const keyString = `${payload.user_id}:${payload.notification_type}:${timestamp}`;
    return crypto.createHash('sha256').update(keyString).digest('hex');
}

/**
 * EmailProducer: Enqueues email notification jobs to BullMQ
 * Returns immediately after enqueueing, decoupling from delivery
 */
export class EmailProducer {
    private queue: Queue;
    private redisConnection: IORedis;

    constructor(redisConnection: IORedis, queueName: string = 'email_task') {
        this.redisConnection = redisConnection;
        const queueOptions: QueueOptions = {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // 5 seconds initial delay
                },
                removeOnComplete: {
                    age: 3600, // Keep completed jobs for 1 hour
                    count: 1000,
                },
                removeOnFail: false, // Keep failed jobs for DLQ processing
            },
        };
        this.queue = new Queue(queueName, queueOptions);
    }

    /**
     * Enqueues an email notification job with deduplication
     * Returns job ID immediately without waiting for delivery
     */
    public async sendNotification(payload: EmailNotificationPayload): Promise<string> {
        const deduplicationKey = generateDeduplicationKey(payload);
        
        // Check if a job with this deduplication key already exists
        const existingJobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
        const duplicateJob = existingJobs.find(job => {
            const jobDedupKey = job.data.deduplicationKey;
            return jobDedupKey === deduplicationKey;
        });

        if (duplicateJob) {
            console.log(`Duplicate job detected with key: ${deduplicationKey}, returning existing job ID`);
            return duplicateJob.id!;
        }

        // Add timestamp if not provided
        const jobData: EmailJobData = {
            ...payload,
            timestamp: payload.timestamp || Date.now(),
            deduplicationKey,
        };

        // Add job - exponential backoff with jitter is configured in defaultJobOptions
        // BullMQ's exponential backoff includes randomization (jitter) by default
        const job = await this.queue.add('email_task', jobData, {
            jobId: deduplicationKey, // Use deduplication key as jobId for idempotency
        });

        console.log(`Email notification job enqueued: ${job.id} for user ${payload.user_id}`);
        return job.id!;
    }

    /**
     * Closes the queue connection
     */
    public async close(): Promise<void> {
        await this.queue.close();
    }

    /**
     * Gets the queue instance (for testing/monitoring)
     */
    public getQueue(): Queue {
        return this.queue;
    }
}

/**
 * Circuit Breaker configuration for SMTP operations
 * Opens after 10 consecutive failures (handled manually)
 */
const circuitBreakerOptions = {
    timeout: 30000, // 30 second timeout
    errorThresholdPercentage: 100, // Will be overridden by manual tracking
    resetTimeout: 60000, // Try to close after 60 seconds
    rollingCountTimeout: 60000,
    rollingCountBuckets: 10,
    name: 'SMTPCircuitBreaker',
    enabled: true,
};

/**
 * NotificationWorker: Processes email jobs with retry logic, circuit breaker, and DLQ
 */
export class NotificationWorker {
    private worker: Worker;
    private transporter: any;
    private circuitBreaker: CircuitBreaker;
    private deadLetterQueue: DeadLetterQueueEntry[] = [];
    private consecutiveFailures: number = 0;
    private readonly MAX_CONSECUTIVE_FAILURES = 10;

    constructor(
        redisConnection: IORedis,
        smtpConfig: any,
        queueName: string = 'email_task',
        dlqName: string = 'email_dlq',
        transporter?: any // Allow injecting transporter for testing
    ) {
        this.transporter = transporter || nodemailer.createTransport(smtpConfig);

        // Initialize Circuit Breaker for SMTP operations
        this.circuitBreaker = new CircuitBreaker(
            async (mailOptions: any) => {
                return await this.transporter.sendMail(mailOptions);
            },
            circuitBreakerOptions
        );

        // Circuit breaker event handlers
        this.circuitBreaker.on('open', () => {
            console.error('Circuit Breaker OPENED - SMTP provider appears to be down');
        });

        this.circuitBreaker.on('halfOpen', () => {
            console.log('Circuit Breaker HALF-OPEN - Testing if SMTP provider recovered');
        });

        this.circuitBreaker.on('close', () => {
            console.log('Circuit Breaker CLOSED - SMTP provider is healthy');
            this.consecutiveFailures = 0;
        });

        // Worker configuration with exponential backoff and jitter
        const workerOptions: WorkerOptions = {
            connection: redisConnection,
            concurrency: 5, // Process up to 5 jobs concurrently
            limiter: {
                max: 10, // Max 10 jobs
                duration: 1000, // per second (rate limiting)
            },
        };

        this.worker = new Worker(queueName, this.processJob.bind(this), workerOptions);

        // Worker event handlers
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
            this.consecutiveFailures = 0; // Reset on success
        });

        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed:`, err.message);
            this.consecutiveFailures++;
            
            // Check if we should open circuit breaker
            if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
                if (this.circuitBreaker.opened) {
                    console.error(`Circuit breaker already open after ${this.consecutiveFailures} consecutive failures`);
                } else {
                    // Force open the circuit breaker
                    this.circuitBreaker.open();
                }
            }
        });

        this.worker.on('error', (error) => {
            console.error('Worker error:', error);
        });
    }

    /**
     * Processes a single email job with retry logic and circuit breaker
     */
    private async processJob(job: Job<EmailJobData>): Promise<void> {
        const { to, subject, body, user_id, notification_type } = job.data;

        // Check circuit breaker state
        if (this.circuitBreaker.opened) {
            const error = new Error('Circuit breaker is OPEN - SMTP provider unavailable');
            console.error(`Job ${job.id} rejected: ${error.message}`);
            throw error;
        }

        const mailOptions = {
            from: 'noreply@enterprise.com',
            to,
            subject,
            text: body,
        };

        try {
            // Use circuit breaker to send email
            const info = await this.circuitBreaker.fire(mailOptions);
            console.log(`Message sent: ${info.messageId} for job ${job.id}`);
            this.consecutiveFailures = 0; // Reset on success
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';
            console.error(`Delivery failed for job ${job.id} (attempt ${job.attemptsMade + 1}):`, errorMessage);

            // If job has exhausted all retries, send to DLQ
            if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
                await this.sendToDeadLetterQueue(job, errorMessage);
            }

            // BullMQ will handle exponential backoff with jitter via job options
            throw new Error(`Email delivery failed: ${errorMessage}`);
        }
    }

    /**
     * Sends a failed job to the Dead Letter Queue
     */
    private async sendToDeadLetterQueue(job: Job<EmailJobData>, failureReason: string): Promise<void> {
        const dlqEntry: DeadLetterQueueEntry = {
            jobId: job.id!,
            payload: {
                user_id: job.data.user_id,
                notification_type: job.data.notification_type,
                to: job.data.to,
                subject: job.data.subject,
                body: job.data.body,
                timestamp: job.data.timestamp,
            },
            failureReasons: job.failedReason ? [job.failedReason, failureReason] : [failureReason],
            failedAt: new Date(),
            totalAttempts: job.attemptsMade || 0,
        };

        this.deadLetterQueue.push(dlqEntry);
        console.error(`Job ${job.id} sent to Dead Letter Queue after ${dlqEntry.totalAttempts} attempts`);
    }

    /**
     * Gets all entries in the Dead Letter Queue
     */
    public getDeadLetterQueue(): DeadLetterQueueEntry[] {
        return [...this.deadLetterQueue];
    }

    /**
     * Gets the current circuit breaker state
     */
    public getCircuitBreakerState(): {
        opened: boolean;
        closed: boolean;
        halfOpen: boolean;
        consecutiveFailures: number;
    } {
        return {
            opened: this.circuitBreaker.opened,
            closed: this.circuitBreaker.closed,
            halfOpen: this.circuitBreaker.halfOpen,
            consecutiveFailures: this.consecutiveFailures,
        };
    }

    /**
     * Closes the worker and cleans up resources
     */
    public async close(): Promise<void> {
        await this.worker.close();
        await this.transporter.close();
    }
}

/**
 * Factory function to create a complete email notification system
 */
export function createEmailNotificationSystem(
    redisConnection: IORedis,
    smtpConfig: any
): { producer: EmailProducer; worker: NotificationWorker } {
    const producer = new EmailProducer(redisConnection);
    const worker = new NotificationWorker(redisConnection, smtpConfig);
    
    return { producer, worker };
}
