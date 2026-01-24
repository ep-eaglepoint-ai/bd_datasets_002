import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { EmailNotificationPayload } from '../repository_after/EmailService.js';

// -------------------- Interfaces & Adapters --------------------

// Define the interface expected by the tests
interface TestProducer {
  sendNotification(payload: EmailNotificationPayload): Promise<string>;
  getQueue(): Queue | any; // allow any for mock/adapter
  close(): Promise<void>;
}

interface TestWorker {
  close(): Promise<void>;
  getCircuitBreakerState(): { opened: boolean; consecutiveFailures: number };
}

// Adapter for the "Before" repository (Legacy code)
class LegacyProducerAdapter implements TestProducer {
  private legacyMailer: any;
  private queue: any;
  private jobs: any[] = [];

  constructor(LegacyClass: any, config: any) {
    this.legacyMailer = new LegacyClass(config);
    // Mock queue that records jobs
    this.queue = {
      add: async (_name: string, data: any, opts: any) => {
        const id = opts?.jobId || 'mock-id';
        if (!this.jobs.find(j => j.id === id)) {
          this.jobs.push({ id, data });
        }
        return { id, data };
      },
      getJobs: async () => this.jobs,
      getJob: async (id: string) => this.jobs.find(j => j.id === id) || null,
      close: async () => {},
    };
  }

  async sendNotification(payload: EmailNotificationPayload): Promise<string> {
    try {
      const jobId = 'legacy-job-id';
      await this.queue.add('email_task', payload, { jobId });

      // Use fake SMTP if injected, otherwise real
      if (this.legacyMailer.smtp) {
          await this.legacyMailer.smtp.sendMail();
      } else {
          await this.legacyMailer.sendNotification(payload.to, payload.subject, payload.body);
      }
      return jobId;
    } catch (e) {
      throw e;
    }
  }

  getQueue() {
    return this.queue;
  }

  async close() {
    // No-op for legacy
  }
}

class LegacyWorkerAdapter implements TestWorker {
  async close() {
    // No-op
  }
  
  getCircuitBreakerState() {
    // Legacy has no circuit breaker, so it never opens and has 0 failures tracked
    return { opened: false, consecutiveFailures: 0 };
  }
}

// -------------------- Test Utilities --------------------

class FakeSMTP {
  private down = false;
  private sent = 0;

  outage() {
    this.down = true;
  }

  recover() {
    this.down = false;
  }

  async sendMail() {
    if (this.down) {
      throw new Error('SMTP PROVIDER DOWN');
    }
    this.sent++;
    return { messageId: `msg-${Date.now()}` };
  }

  sentCount() {
    return this.sent;
  }

  close() {
    // Mock close method
  }
}

// -------------------- Test Suite --------------------

describe('Notification Queue System – Requirements Validation', () => {
  let mainRedis: IORedis;
  let producerRedis: IORedis | null = null;
  let workerRedis: IORedis | null = null;
  
  let producer: TestProducer;
  let worker: TestWorker;
  let smtp: FakeSMTP;
  let queueName: string;
  let dlqName: string;

  // Decide which repo to test based on env var
  const REPO_TYPE = process.env.REPO || 'after'; // 'before' or 'after'

  const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 15, // Test-specific DB
    maxRetriesPerRequest: null,
  };

  beforeAll(async () => {
    console.log(`[INFO] REPO_TYPE: ${process.env.REPO}`);
    console.log(`[INFO] NODE_ENV: ${process.env.NODE_ENV}`);
    mainRedis = new IORedis(redisOptions);
  });

  beforeEach(async () => {
    await mainRedis.flushdb();

    // Use unique queue names per test
    const testId = Date.now();
    queueName = `email_task_${testId}`;
    dlqName = `email_dlq_${testId}`;

    smtp = new FakeSMTP();

    // DYNAMIC IMPORT LOGIC
    if (REPO_TYPE === 'before') {
      const mod = await import('../repository_before/EmailService.js');
      const LegacyMailer = mod.LegacyMailer;
      producer = new LegacyProducerAdapter(LegacyMailer, { host: 'smtp.test.com', port: 587 });
      // Inject smtp mock into legacy via the adapter's mailer instance if possible
      (producer as any).legacyMailer.smtp = smtp;
      worker = new LegacyWorkerAdapter();
    } else {
      const mod = await import('../repository_after/EmailService.js');
      const { EmailProducer, NotificationWorker } = mod;
      
      // Store connections to close them later
      producerRedis = new IORedis(redisOptions);
      workerRedis = new IORedis(redisOptions);
      
      producer = new EmailProducer(producerRedis, queueName);
      worker = new NotificationWorker(workerRedis, { host: 'smtp.test.com', port: 587 }, queueName, dlqName, smtp);
    }
  });

  afterEach(async () => {
    if (worker) await worker.close();
    if (producer) await producer.close();
    
    // Explicitly quit leaked connections
    if (producerRedis) {
        await producerRedis.quit();
        producerRedis = null;
    }
    if (workerRedis) {
        await workerRedis.quit();
        workerRedis = null;
    }
  });

  afterAll(async () => {
    await mainRedis.quit();
  });

  // Requirement #7 — Idempotency / Exactly-Once Delivery

  it('enqueues only one job when the same notification is submitted twice', async () => {
    const payload: EmailNotificationPayload = {
      user_id: 'user-123',
      notification_type: 'WELCOME_EMAIL',
      to: 'user@test.com',
      subject: 'Welcome',
      body: 'Hello',
      timestamp: 1700000000,
    };

    const jobId1 = await producer.sendNotification(payload);
    const jobId2 = await producer.sendNotification(payload);

    // Both should return the same job ID (idempotency via BullMQ jobId)
    expect(jobId1).toBe(jobId2);

    const queue = producer.getQueue();
    const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);

    expect(jobs.length).toBe(1);
    expect(jobs[0].id).toBe(jobId1);
  });

  // Requirement #6 — SMTP Outage, Retry, Recovery        

  it('retries during SMTP outage and succeeds after provider recovery', async () => {
    smtp.outage();

    const payload: EmailNotificationPayload = {
      user_id: 'user-124', // Use unique id
      notification_type: 'outage_test',
      to: 'user@test.com',
      subject: 'Hello',
      body: 'Test',
      timestamp: Date.now(),
    };

    const events = (REPO_TYPE === 'after') ? (worker as any).getWorker() : null;
    const queueEvents = new QueueEvents(queueName, { connection: redisOptions });
    
    try {
      let resolveFail: () => void = () => {};
      let rejectFail: (e: Error) => void = () => {};
      const failedOnce = new Promise<void>((res, rej) => {
        resolveFail = res;
        rejectFail = rej;
      });

      const timeoutFail = setTimeout(() => rejectFail(new Error('Test timed out - never failed')), 15000);

      // FOR AFTER: Listen to worker failure (triggers on every attempt)
      // FOR BEFORE: sendNotification throws immediately, so we don't need events
      if (events) {
          events.on('failed', (job: any) => {
              clearTimeout(timeoutFail);
              resolveFail();
          });
      }

      // TRIGGER ACTION
      let jobId: string | undefined;
      if (REPO_TYPE === 'before') {
          try {
              await producer.sendNotification(payload);
          } catch (e) {
              resolveFail(); // Before fails instantly
          }
      } else {
          jobId = await producer.sendNotification(payload);
      }

      // Wait for first failure
      await failedOnce;

      // provider recovers
      smtp.recover();

      // wait for completion
      if (REPO_TYPE === 'after' && jobId) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Test timed out - never recovered')), 30000);
            queueEvents.on('completed', ({ jobId: completedJobId }) => {
              if (completedJobId === jobId) {
                  clearTimeout(timeout);
                  resolve();
              }
            });
          });
      }

      expect(smtp.sentCount()).toBeGreaterThan(0);
    } finally {
      await queueEvents.close();
    }
  });

  // Requirement #5 — Dead Letter Queue                  

  it('moves job to DLQ after exhausting all retry attempts', async () => {
    smtp.outage(); // permanent failure

    const queue = producer.getQueue();
    const events = new QueueEvents(queueName, { connection: redisOptions });
    const dlq = new Queue(dlqName, { connection: redisOptions });

    try {
      let resolveExhausted: () => void = () => {};
      let rejectExhausted: (e: Error) => void = () => {};
      const exhausted = new Promise<void>((res, rej) => {
          resolveExhausted = res;
          rejectExhausted = rej;
      });

      const timeoutExhaust = setTimeout(() => rejectExhausted(new Error('Test timed out - job never exhausted retries')), 30000);

      events.on('failed', async ({ jobId: failedId }) => {
          const failedJob = await queue.getJob(failedId);
          if (failedJob?.attemptsMade === 3) {
              clearTimeout(timeoutExhaust);
              resolveExhausted();
          }
      });

      const job = await queue.add(
        'email_task',
        { to: 'fail@test.com', subject: 'Fail', body: 'Fail' },
        { attempts: 3 }
      );

      await exhausted;

      const dlqJobs = await dlq.getJobs(['waiting']);

      expect(dlqJobs.length).toBe(1);
      expect(dlqJobs[0].data.jobId || dlqJobs[0].id).toBe(job.id);
    } finally {
      await dlq.close();
      await events.close();
    }
  });

  // Requirement #4 — Circuit Breaker                    

  it('opens circuit breaker after 10 consecutive failures', async () => {
    smtp.outage();

    // Enqueue multiple jobs to trigger circuit breaker
    for (let i = 0; i < 12; i++) {
      const payload: EmailNotificationPayload = {
        user_id: `user-cb-${i}`,
        notification_type: 'circuit_test',
        to: `fail${i}@test.com`,
        subject: 'Test',
        body: 'Test',
        timestamp: Date.now(),
      };
      
      try {
        await producer.sendNotification(payload);
      } catch(e) {
          // Expected failure during synchronous or immediate push
      }
    }

    // Give worker time to process failures
    await new Promise((r) => setTimeout(r, 10000));

    const breakerState = worker.getCircuitBreakerState();

    expect(breakerState.opened).toBe(true);
    expect(breakerState.consecutiveFailures).toBeGreaterThanOrEqual(10);
  });
});
