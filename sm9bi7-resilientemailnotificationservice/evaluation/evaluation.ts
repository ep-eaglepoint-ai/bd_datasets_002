import fs from 'fs';
import path from 'path';
import os from 'os';
import IORedis from 'ioredis';
import { EmailProducer, EmailNotificationPayload } from '../repository_after/EmailService.js';
import { LegacyMailer } from '../repository_before/EmailService.js';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
    success: boolean;
    duration_ms: number;
    error?: string;
    notes?: string;
}

interface EvaluationReport {
    run_id: string;
    started_at: string;
    finished_at: string;
    duration_seconds: number;
    environment: {
        node_version: string;
        platform: string;
        arch: string;
    };
    before: {
        tests: TestResult[];
    };
    after: {
        tests: TestResult[];
    };
    comparison: {
        passed_gate: boolean;
        improvement_summary: string;
    };
    success: boolean;
    error: string | null;
}

const REPORTS_DIR = path.resolve('reports');

function environmentInfo() {
    return {
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch(),
    };
}

async function runBeforeTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Non-blocking behavior
    const nonBlockingResult: TestResult = { success: false, duration_ms: 0 };
    try {
        const start = Date.now();
        const legacyMailer = new LegacyMailer({ host: 'smtp.test.com', port: 587 });
        (legacyMailer as any).transporter = {
            sendMail: async () => {
                await new Promise(resolve => setTimeout(resolve, 1000)); // simulate 1s blocking
                return { messageId: 'test' };
            },
        };
        await legacyMailer.sendNotification('test@example.com', 'Test', 'Body');
        nonBlockingResult.duration_ms = Date.now() - start;
        nonBlockingResult.success = true;
        nonBlockingResult.notes = 'Blocking behavior simulated';
    } catch (error: any) {
        nonBlockingResult.error = error.message;
    }
    results.push(nonBlockingResult);

    // Test 2: SMTP outage resilience
    const smtpOutageResult: TestResult = { success: false, duration_ms: 0 };
    try {
        const start = Date.now();
        const legacyMailer = new LegacyMailer({ host: 'smtp.test.com', port: 587 });
        (legacyMailer as any).transporter = {
            sendMail: async () => {
                throw new Error('SMTP provider unavailable');
            },
        };
        await legacyMailer.sendNotification('test@example.com', 'Test', 'Body');
        smtpOutageResult.duration_ms = Date.now() - start;
        smtpOutageResult.success = true;
    } catch (error: any) {
        smtpOutageResult.duration_ms = Date.now() - smtpOutageResult.duration_ms;
        smtpOutageResult.error = error.message;
        smtpOutageResult.success = false;
    }
    results.push(smtpOutageResult);

    // Test 3: Idempotency (no deduplication in legacy)
    const idempotencyResult: TestResult = { success: false, duration_ms: 0 };
    try {
        const start = Date.now();
        const legacyMailer = new LegacyMailer({ host: 'smtp.test.com', port: 587 });
        let sendCount = 0;
        (legacyMailer as any).transporter = {
            sendMail: async () => {
                sendCount++;
                return { messageId: 'test' };
            },
        };
        await legacyMailer.sendNotification('test@example.com', 'Test', 'Body');
        await legacyMailer.sendNotification('test@example.com', 'Test', 'Body');
        idempotencyResult.duration_ms = Date.now() - start;
        idempotencyResult.success = true;
        idempotencyResult.notes = sendCount > 1 ? 'Sends duplicates' : 'No duplicates';
    } catch (error: any) {
        idempotencyResult.error = error.message;
    }
    results.push(idempotencyResult);

    return results;
}

async function runAfterTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const redisConnection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

    try {
        // Test 1: Non-blocking behavior
        const startNB = Date.now();
        const producer = new EmailProducer(redisConnection);
        const payload: EmailNotificationPayload = {
            user_id: 'user123',
            notification_type: 'test',
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body',
        };
        await producer.sendNotification(payload);
        results.push({
            success: true,
            duration_ms: Date.now() - startNB,
            notes: 'Non-blocking, queued job successfully',
        });

        // Test 2: SMTP outage resilience (queued instead of fail)
        const startOutage = Date.now();
        const payload2: EmailNotificationPayload = {
            user_id: 'user123',
            notification_type: 'outage_test',
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body',
        };
        const jobId = await producer.sendNotification(payload2);
        const jobs = await producer.getQueue().getJobs(['waiting', 'delayed', 'active']);
        const queued = jobs.some(j => j.id === jobId);
        results.push({
            success: queued,
            duration_ms: Date.now() - startOutage,
            notes: queued ? 'Queued for retry on outage' : 'Job not queued',
        });

        // Test 3: Idempotency
        const startIdemp = Date.now();
        const payload3: EmailNotificationPayload = {
            user_id: 'user123',
            notification_type: 'idempotency_test',
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body',
            timestamp: 1234567890,
        };
        const jobId1 = await producer.sendNotification(payload3);
        const jobId2 = await producer.sendNotification(payload3);
        results.push({
            success: jobId1 === jobId2,
            duration_ms: Date.now() - startIdemp,
            notes: jobId1 === jobId2 ? 'Deduplication prevents duplicates' : 'Duplicates allowed',
        });

        await producer.close();
    } catch (error: any) {
        results.push({ success: false, duration_ms: 0, error: error.message });
    } finally {
        await redisConnection.quit();
    }

    return results;
}

function computeComparison(before: TestResult[], after: TestResult[]): { passed_gate: boolean; improvement_summary: string } {
    const allPassed = after.every(t => t.success);
    let improvements = 0;
    const notes: string[] = [];
    for (let i = 0; i < before.length; i++) {
        if (after[i].success && (!before[i].success || after[i].duration_ms < before[i].duration_ms)) {
            improvements++;
            notes.push(`Test ${i + 1}: ${after[i].notes}`);
        }
    }
    return {
        passed_gate: allPassed,
        improvement_summary: notes.join('; '),
    };
}

async function runEvaluation(): Promise<EvaluationReport> {
    const run_id = uuidv4();
    const started_at = new Date().toISOString();
    let beforeTests: TestResult[] = [];
    let afterTests: TestResult[] = [];
    let error: string | null = null;

    try {
        beforeTests = await runBeforeTests();
        afterTests = await runAfterTests();
    } catch (err: any) {
        error = err.message;
    }

    const comparison = computeComparison(beforeTests, afterTests);
    const finished_at = new Date().toISOString();
    const duration_seconds = (new Date(finished_at).getTime() - new Date(started_at).getTime()) / 1000;

    return {
        run_id,
        started_at,
        finished_at,
        duration_seconds,
        environment: environmentInfo(),
        before: { tests: beforeTests },
        after: { tests: afterTests },
        comparison,
        success: comparison.passed_gate,
        error,
    };
}

async function main() {
    try {
        const report = await runEvaluation();

        // Create timestamped folder: reports/YYYY-MM-DD/HH-MM
        const now = new Date();
        const folderPath = path.join(
            REPORTS_DIR,
            now.toISOString().split('T')[0],
            `${now.getHours()}-${now.getMinutes()}`
        );
        fs.mkdirSync(folderPath, { recursive: true });

        const reportPath = path.join(folderPath, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`Report written to ${reportPath}`);

        process.exit(report.success ? 0 : 1);
    } catch (err: any) {
        console.error('Evaluation failed:', err);
        process.exit(1);
    }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('evaluation.ts')) {
    main().catch(console.error);
}

export { runEvaluation, main, EvaluationReport };
