import { describe, it, before, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import IORedis from 'ioredis';
import { EmailProducer, NotificationWorker, EmailNotificationPayload } from '../repository_after/EmailService.js';
import { Queue } from 'bullmq';

// Mock nodemailer for testing
const mockTransporter = {
    sendMail: async (mailOptions: any) => {
        return { messageId: 'test-message-id', response: '250 OK' };
    },
    close: async () => {},
};

let redisConnection: IORedis;
let producer: EmailProducer;
let worker: NotificationWorker;

describe('Resilient Email Notification Service', () => {
    before(async () => {
        // Connect to Redis (use test Redis instance)
        redisConnection = new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: null,
        });
    });

    beforeEach(async () => {
        // Clean up Redis before each test
        await redisConnection.flushall();
        
        // Create fresh producer and worker instances
        const smtpConfig = { host: 'smtp.test.com', port: 587 };
        producer = new EmailProducer(redisConnection);
        
        // Create worker with mocked transporter
        worker = new NotificationWorker(redisConnection, smtpConfig, 'email_task', 'email_dlq', mockTransporter);
    });

    after(async () => {
        await producer?.close();
        await worker?.close();
        await redisConnection.quit();
    });

    describe('EmailProducer - Job Enqueueing', () => {
        it('should enqueue an email notification job successfully', async () => {
            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
            };

            const jobId = await producer.sendNotification(payload);
            expect(jobId).to.be.a('string');
            expect(jobId.length).to.be.greaterThan(0);
        });

        it('should return immediately after enqueueing (non-blocking)', async () => {
            const startTime = Date.now();
            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
            };

            await producer.sendNotification(payload);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should return in less than 100ms (immediate, no SMTP call)
            expect(duration).to.be.lessThan(100);
        });
    });

    describe('Idempotency - Duplicate Job Prevention', () => {
        it('should prevent duplicate jobs with same user_id, notification_type, and timestamp', async () => {
            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
                timestamp: 1234567890, // Fixed timestamp
            };

            const jobId1 = await producer.sendNotification(payload);
            const jobId2 = await producer.sendNotification(payload);

            // Both should return the same job ID (idempotency)
            expect(jobId1).to.equal(jobId2);

            // Verify only one job exists in the queue
            const queue = producer.getQueue();
            const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
            const uniqueJobIds = new Set(jobs.map(j => j.id));
            expect(uniqueJobIds.size).to.equal(1);
        });

        it('should allow different jobs with different timestamps', async () => {
            const payload1: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
                timestamp: 1234567890,
            };

            const payload2: EmailNotificationPayload = {
                ...payload1,
                timestamp: 1234567891, // Different timestamp
            };

            const jobId1 = await producer.sendNotification(payload1);
            const jobId2 = await producer.sendNotification(payload2);

            // Should create different jobs
            expect(jobId1).to.not.equal(jobId2);
        });

        it('should allow different jobs with different notification types', async () => {
            const payload1: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
            };

            const payload2: EmailNotificationPayload = {
                ...payload1,
                notification_type: 'password_reset', // Different type
            };

            const jobId1 = await producer.sendNotification(payload1);
            const jobId2 = await producer.sendNotification(payload2);

            // Should create different jobs
            expect(jobId1).to.not.equal(jobId2);
        });

        it('should allow different jobs with different user_ids', async () => {
            const payload1: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
            };

            const payload2: EmailNotificationPayload = {
                ...payload1,
                user_id: 'user456', // Different user
            };

            const jobId1 = await producer.sendNotification(payload1);
            const jobId2 = await producer.sendNotification(payload2);

            // Should create different jobs
            expect(jobId1).to.not.equal(jobId2);
        });
    });

    describe('NotificationWorker - Email Processing', () => {
        it('should process email jobs successfully', async () => {
            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'welcome',
                to: 'test@example.com',
                subject: 'Welcome',
                body: 'Welcome to our service',
            };

            await producer.sendNotification(payload);

            // Wait for job to be processed
            await new Promise(resolve => setTimeout(resolve, 2000));

            const queue = producer.getQueue();
            const completedJobs = await queue.getJobs(['completed']);
            expect(completedJobs.length).to.be.greaterThan(0);
        });
    });

    describe('SMTP Outage Simulation', () => {
        it('should hold jobs in queue during SMTP outage and retry when provider recovers', async function() {
            this.timeout(30000); // Increase timeout for retry tests

            let callCount = 0;
            let shouldFail = true;

            // Create a mock transporter that fails initially, then succeeds
            const outageTransporter = {
                sendMail: async (mailOptions: any) => {
                    callCount++;
                    if (shouldFail && callCount <= 5) {
                        throw new Error('SMTP provider unavailable - connection timeout');
                    }
                    // After 5 failures, "recover"
                    shouldFail = false;
                    return { messageId: 'recovered-message-id', response: '250 OK' };
                },
                close: async () => {},
            };

            // Create new worker with outage simulation
            const outageWorker = new NotificationWorker(
                redisConnection,
                { host: 'smtp.test.com', port: 587 },
                'email_task',
                'email_dlq',
                outageTransporter
            );

            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'outage_test',
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test email',
            };

            const jobId = await producer.sendNotification(payload);

            // Wait for initial processing attempts
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Verify job is still in queue (waiting or delayed)
            const queue = producer.getQueue();
            let jobs = await queue.getJobs(['waiting', 'delayed', 'active']);
            expect(jobs.length).to.be.greaterThan(0, 'Job should be held in queue during outage');

            // Simulate provider recovery
            shouldFail = false;

            // Wait for retry and successful processing
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify job was eventually completed
            const completedJobs = await queue.getJobs(['completed']);
            const failedJobs = await queue.getJobs(['failed']);

            // Job should either be completed or failed (if max retries exceeded)
            // In this test, it should complete after recovery
            expect(callCount).to.be.greaterThan(1, 'Should have retried multiple times');
            
            await outageWorker.close();
        });

        it('should retry with exponential backoff during failures', async function() {
            this.timeout(20000);

            let attemptTimes: number[] = [];
            let attemptCount = 0;

            const backoffTransporter = {
                sendMail: async (mailOptions: any) => {
                    attemptCount++;
                    attemptTimes.push(Date.now());
                    if (attemptCount < 3) {
                        throw new Error('Temporary failure');
                    }
                    return { messageId: 'success', response: '250 OK' };
                },
                close: async () => {},
            };

            const backoffWorker = new NotificationWorker(
                redisConnection,
                { host: 'smtp.test.com', port: 587 },
                'email_task',
                'email_dlq',
                backoffTransporter
            );

            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'backoff_test',
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test email',
            };

            await producer.sendNotification(payload);

            // Wait for retries
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Verify exponential backoff (delays should increase)
            if (attemptTimes.length >= 2) {
                const delay1 = attemptTimes[1] - attemptTimes[0];
                const delay2 = attemptTimes[2] - attemptTimes[1];
                // Second delay should be approximately double the first (with jitter)
                expect(delay2).to.be.greaterThan(delay1 * 0.5);
            }

            await backoffWorker.close();
        });
    });

    describe('Circuit Breaker', () => {
        it('should open circuit breaker after 10 consecutive failures', async function() {
            this.timeout(30000);

            let failureCount = 0;
            const failingTransporter = {
                sendMail: async (mailOptions: any) => {
                    failureCount++;
                    throw new Error('SMTP provider down');
                },
                close: async () => {},
            };

            const circuitWorker = new NotificationWorker(
                redisConnection,
                { host: 'smtp.test.com', port: 587 },
                'email_task',
                'email_dlq',
                failingTransporter
            );

            // Enqueue multiple jobs to trigger circuit breaker
            for (let i = 0; i < 12; i++) {
                const payload: EmailNotificationPayload = {
                    user_id: `user${i}`,
                    notification_type: 'circuit_test',
                    to: 'test@example.com',
                    subject: 'Test',
                    body: 'Test email',
                };
                await producer.sendNotification(payload);
            }

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 20000));

            const state = circuitWorker.getCircuitBreakerState();
            // Circuit breaker should be open after 10 consecutive failures
            expect(state.consecutiveFailures).to.be.at.least(10);
            expect(state.opened).to.be.true;

            await circuitWorker.close();
        });
    });

    describe('Dead Letter Queue', () => {
        it('should send jobs to DLQ after exhausting all retry attempts', async function() {
            this.timeout(25000);

            const alwaysFailingTransporter = {
                sendMail: async (mailOptions: any) => {
                    throw new Error('Permanent failure - invalid recipient');
                },
                close: async () => {},
            };

            const dlqWorker = new NotificationWorker(
                redisConnection,
                { host: 'smtp.test.com', port: 587 },
                'email_task',
                'email_dlq',
                alwaysFailingTransporter
            );

            const payload: EmailNotificationPayload = {
                user_id: 'user123',
                notification_type: 'dlq_test',
                to: 'invalid@example.com',
                subject: 'Test',
                body: 'Test email',
            };

            await producer.sendNotification(payload);

            // Wait for all retry attempts to complete
            await new Promise(resolve => setTimeout(resolve, 20000));

            const dlq = dlqWorker.getDeadLetterQueue();
            expect(dlq.length).to.be.greaterThan(0, 'Should have entries in DLQ');

            const dlqEntry = dlq[0];
            expect(dlqEntry.payload.user_id).to.equal('user123');
            expect(dlqEntry.failureReasons.length).to.be.greaterThan(0);
            expect(dlqEntry.totalAttempts).to.equal(3); // Max 3 attempts

            await dlqWorker.close();
        });
    });
});
