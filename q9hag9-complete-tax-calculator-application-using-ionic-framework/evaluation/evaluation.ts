#!/usr/bin/env node

/**
 * Evaluation script that runs tests and generates a detailed report
 */

import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    failureMessages: string[];
}

interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    xfailed: number;
    errors: number;
    skipped: number;
}

interface EvaluationReport {
    run_id: string;
    started_at: string;
    finished_at: string;
    duration_seconds: number;
    success: boolean;
    error: string | null;
    environment: {
        node_version: string;
        platform: string;
        os: string;
        architecture: string;
        hostname: string;
    };
    results: {
        after: {
            success: boolean;
            exit_code: number;
            tests: TestResult[];
            summary: TestSummary;
        };
    };
    comparison: {
        after_tests_passed: boolean;
        after_total: number;
        after_passed: number;
        after_failed: number;
        after_xfailed: number;
    };
}

function runCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd,
            shell: true,
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({
                stdout,
                stderr,
                exitCode: code || 0
            });
        });

        proc.on('error', (error) => {
            resolve({
                stdout,
                stderr: stderr + error.message,
                exitCode: 1
            });
        });
    });
}

function parseJestOutput(stdout: string): TestResult[] {
    const tests: TestResult[] = [];

    // Parse test results from Jest output
    const testPattern = /✓\s+(.+?)\s+\((\d+)\s*ms\)|✓\s+(.+?)$/gm;
    let match;

    while ((match = testPattern.exec(stdout)) !== null) {
        const testName = match[1] || match[3];
        const duration = match[2] ? parseInt(match[2]) : 0;

        if (testName && testName.trim()) {
            tests.push({
                name: testName.trim(),
                status: 'passed',
                duration,
                failureMessages: []
            });
        }
    }

    // Parse failed tests
    const failPattern = /✕\s+(.+?)$/gm;
    while ((match = failPattern.exec(stdout)) !== null) {
        const testName = match[1];
        if (testName && testName.trim()) {
            tests.push({
                name: testName.trim(),
                status: 'failed',
                duration: 0,
                failureMessages: ['Test failed']
            });
        }
    }

    return tests;
}

async function main() {
    const runId = randomUUID();
    const startTime = new Date();
    const startedAt = startTime.toISOString();

    console.log(`\n🔍 Starting Evaluation - Run ID: ${runId}\n`);
    console.log('='.repeat(60));

    let success = false;
    let error: string | null = null;
    let tests: TestResult[] = [];
    let exitCode = 0;

    try {
        // Run tests with Jest JSON reporter
        console.log('\n📊 Running tests in repository_after...\n');

        const testsDir = join(process.cwd(), 'tests');
        const result = await runCommand(
            'npx',
            ['jest', 'tax.test.ts', '--json', '--verbose'],
            testsDir
        );

        exitCode = result.exitCode;

        // Try to parse JSON output first
        try {
            const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
            if (jsonMatch) {
                const jestJson = JSON.parse(jsonMatch[0]);

                // Extract tests from Jest JSON
                if (jestJson.testResults && jestJson.testResults.length > 0) {
                    jestJson.testResults.forEach((suiteResult: any) => {
                        suiteResult.assertionResults?.forEach((test: any) => {
                            tests.push({
                                name: test.title || test.fullName || 'Unknown test',
                                status: test.status === 'passed' ? 'passed' : 'failed',
                                duration: test.duration || 0,
                                failureMessages: test.failureMessages || []
                            });
                        });
                    });
                }
            }
        } catch (jsonError) {
            // Fallback to parsing text output
            console.log('Parsing text output...');
            tests = parseJestOutput(result.stdout);
        }

        // If we still don't have tests, parse the verbose output
        if (tests.length === 0) {
            tests = parseJestOutput(result.stdout);
        }

        success = result.exitCode === 0;

        if (!success) {
            error = 'Tests failed';
        }

        console.log(`\n✅ Tests completed with exit code: ${exitCode}`);
        console.log(`   Found ${tests.length} test results\n`);

    } catch (err) {
        console.error('Error running tests:', err);
        error = err instanceof Error ? err.message : 'Unknown error';
        exitCode = 1;
    }

    const endTime = new Date();
    const finishedAt = endTime.toISOString();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    // Calculate summary
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;

    const summary: TestSummary = {
        total: tests.length,
        passed,
        failed,
        xfailed: 0,
        errors: 0,
        skipped
    };

    // Build report
    const report: EvaluationReport = {
        run_id: runId,
        started_at: startedAt,
        finished_at: finishedAt,
        duration_seconds: parseFloat(durationSeconds.toFixed(3)),
        success,
        error,
        environment: {
            node_version: process.version,
            platform: process.platform,
            os: os.type(),
            architecture: process.arch,
            hostname: os.hostname()
        },
        results: {
            after: {
                success,
                exit_code: exitCode,
                tests,
                summary
            }
        },
        comparison: {
            after_tests_passed: success,
            after_total: summary.total,
            after_passed: summary.passed,
            after_failed: summary.failed,
            after_xfailed: 0
        }
    };

    // Create output directory with timestamp
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const timeFolder = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // hh-mm-ss
    const outputDir = join(__dirname, dateFolder, timeFolder);

    try {
        mkdirSync(outputDir, { recursive: true });
        const reportPath = join(outputDir, 'report.json');
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('='.repeat(60));
        console.log(`\n📄 Report generated: ${reportPath}`);
        console.log(`\n📊 Summary:`);
        console.log(`   Total tests: ${summary.total}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Duration: ${durationSeconds.toFixed(2)}s`);
        console.log(`   Success: ${success ? '✅' : '❌'}\n`);

    } catch (err) {
        console.error('Error writing report:', err);
        process.exit(1);
    }

    process.exit(success ? 0 : 1);
}

main();
