import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getCurrentTimestamp() {
    const now = new Date();
    return {
        iso: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].replace(/:/g, '-')
    };
}

function runTests() {
    const startTime = Date.now();
    let testOutput = '';
    let returnCode = 0;

    // We parse TAP output manually as node --test outputs TAP
    let tapResults = [];
    let passedTests = 0;
    let failedTests = 0;

    try {
        // Run tests via npm (node --test)
        // Ensure we capture stdout. 
        testOutput = execSync('npm test', {
            encoding: 'utf-8',
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe'
        });
        returnCode = 0;
    } catch (error) {
        if (error.stdout) {
            testOutput = error.stdout.toString();
        }
        returnCode = error.status || 1;
    }

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;

    // Parse TAP output
    const lines = testOutput.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        const okMatch = trimmed.match(/^ok\s+\d+\s+-\s+(.*)$/);
        const notOkMatch = trimmed.match(/^not ok\s+\d+\s+-\s+(.*)$/);

        if (okMatch) {
            passedTests++;
            tapResults.push({
                fullName: okMatch[1],
                title: okMatch[1],
                status: 'passed',
                failureMessages: []
            });
        } else if (notOkMatch) {
            failedTests++;
            tapResults.push({
                fullName: notOkMatch[1],
                title: notOkMatch[1],
                status: 'failed',
                failureMessages: ['Check output for details']
            });
        }
    });

    // Fallback if no TAP lines found (e.g. fatal error)
    // If output is not empty but no TAP, status might be failed

    // Handle skipped tests if needed (lines starting with 'ok ... # skip')

    const totalTests = passedTests + failedTests;
    const passed = returnCode === 0 && failedTests === 0 && totalTests > 0;

    return {
        passed,
        returnCode,
        output: testOutput,
        durationSeconds,
        summary: {
            numTotalTests: totalTests,
            numPassedTests: passedTests,
            numFailedTests: failedTests,
            numTotalTestSuites: 1,
            numPassedTestSuites: passed ? 1 : 0,
            numFailedTestSuites: passed ? 0 : 1
        },
        summary_matrix: [[passedTests, failedTests]],
        tests: tapResults
    };
}



function generateReport() {
    const timestamp = getCurrentTimestamp();
    const runId = crypto.randomUUID();

    // console.log('Running tests for repository_after...'); // Suppress
    const afterResults = runTests();

    // Map tests to template format
    const formattedAfterTests = afterResults.tests ? afterResults.tests.map(t => ({
        nodeid: `repository_after::${t.fullName || t.title}`,
        name: t.title,
        outcome: t.status === 'passed' ? 'passed' : 'failed',
        message: t.title,
        failureMessages: t.failureMessages
    })) : [];

    const report = {
        run_id: runId,
        started_at: timestamp.iso,
        finished_at: new Date().toISOString(),
        duration_seconds: afterResults.durationSeconds,
        success: afterResults.passed,
        error: null,
        environment: {
            node_version: process.version,
            platform: process.platform,
            os: process.platform, // 'linux' likely in docker
            os_release: os.release(),
            architecture: process.arch,
            hostname: os.hostname(),
            git_commit: null, // Not available in this environment
            git_branch: null
        },
        results: {
            before: {
                success: false,
                exit_code: 1,
                tests: [],
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    errors: 0,
                    skipped: 0
                }
            },
            after: {
                success: afterResults.passed,
                exit_code: afterResults.returnCode,
                tests: formattedAfterTests,
                summary: {
                    total: afterResults.summary.numTotalTests,
                    passed: afterResults.summary.numPassedTests,
                    failed: afterResults.summary.numFailedTests,
                    errors: 0,
                    skipped: 0
                }
            },
            comparison: {
                before_tests_passed: false,
                after_tests_passed: afterResults.passed,
                before_total: 0,
                before_passed: 0,
                before_failed: 0,
                after_total: afterResults.summary.numTotalTests,
                after_passed: afterResults.summary.numPassedTests,
                after_failed: afterResults.summary.numFailedTests
            }
        }
    };

    const reportDir = path.join(__dirname, timestamp.date, timestamp.time);
    fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('report.json created');

    // Custom Clean Output
    if (afterResults.tests) {
        afterResults.tests.forEach(t => {
            const symbol = t.status === 'passed' ? '✓' : '✗';
            // Print only the test title, clean and simple
            console.log(`${symbol} ${t.title}`);
        });
    }
    console.log(`Tests: ${afterResults.summary.numPassedTests}/${afterResults.summary.numTotalTests} passed`);

    return report;
}

try {
    generateReport();
    process.exit(0);
} catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
}
