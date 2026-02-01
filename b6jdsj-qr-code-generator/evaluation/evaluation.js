const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Get current date/time for directory naming
const now = new Date();
const dateStr = now.toISOString().split('T')[0]; // yyyy-mm-dd format
// time string hh-mm-ss for a second-level directory
const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // hh-mm-ss

const startedAt = now.toISOString();
const runId = crypto.randomUUID();

let report = {
    run_id: runId,
    started_at: startedAt,
    finished_at: null,
    duration_seconds: 0,
    success: false,
    error: null,
    environment: {
        node_version: process.version,
        platform: process.platform,
        os: os.type(),
        architecture: os.arch(),
        hostname: os.hostname()
    },
    results: {
        after: {
            success: false,
            exit_code: 1,
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                xfailed: 0,
                errors: 0,
                skipped: 0
            }
        },
        comparison: {
            after_tests_passed: false,
            after_total: 0,
            after_passed: 0,
            after_failed: 0,
            after_xfailed: 0
        }
    }
};

function runTests() {
    console.log('Running tests for repository_after...');

    try {
        // Install dependencies for server (needed for test imports)
        console.log('Installing server dependencies...');
        execSync('npm install', {
            cwd: '/workspace/repository_after/server',
            stdio: 'pipe'
        });

        // Install test dependencies
        console.log('Installing test dependencies...');
        execSync('npm install', {
            cwd: '/workspace/tests',
            stdio: 'pipe'
        });

        // Run jest with JSON reporter
        console.log('Running Jest tests...');
        const result = spawnSync('npx', ['jest', '--json', '--outputFile=/tmp/jest-results.json'], {
            cwd: '/workspace/tests',
            stdio: 'pipe',
            encoding: 'utf-8'
        });

        report.results.after.exit_code = result.status || 0;

        // Parse Jest JSON output
        if (fs.existsSync('/tmp/jest-results.json')) {
            const jestResults = JSON.parse(fs.readFileSync('/tmp/jest-results.json', 'utf-8'));

            const passed = jestResults.numPassedTests || 0;
            const failed = jestResults.numFailedTests || 0;
            const total = jestResults.numTotalTests || 0;
            const skipped = jestResults.numPendingTests || 0;

            // Extract individual test results
            const tests = [];
            if (jestResults.testResults) {
                for (const suite of jestResults.testResults) {
                    for (const test of suite.assertionResults || []) {
                        tests.push({
                            name: test.fullName || test.title,
                            status: test.status,
                            duration_ms: test.duration || 0
                        });
                    }
                }
            }

            report.results.after.tests = tests;
            report.results.after.summary = {
                total,
                passed,
                failed,
                xfailed: 0,
                errors: 0,
                skipped
            };

            report.results.after.success = failed === 0 && result.status === 0;

            // Update comparison
            report.results.comparison = {
                after_tests_passed: report.results.after.success,
                after_total: total,
                after_passed: passed,
                after_failed: failed,
                after_xfailed: 0
            };

            report.success = report.results.after.success;
        } else {
            report.error = 'Jest results file not found';
        }

    } catch (err) {
        report.error = err.message;
        report.success = false;
    }
}

function main() {
    try {
        runTests();
    } catch (err) {
        report.error = err.message;
    }

    // Calculate duration
    const finishedAt = new Date();
    report.finished_at = finishedAt.toISOString();
    report.duration_seconds = (finishedAt - now) / 1000;

    // Create output directory with date and time subdirectory (yyyy-mm-dd/hh-mm-ss)
    const outputDir = path.join('/workspace/evaluation', dateStr, timeStr);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write report to yyyy-mm-dd/hh-mm-ss/report.json
    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n========================================');
    console.log('Evaluation Complete');
    console.log('========================================');
    console.log(`Report saved to: ${reportPath}`);
    console.log(`Success: ${report.success}`);
    console.log(`Tests passed: ${report.results.after.summary.passed}/${report.results.after.summary.total}`);

    // Also output the report to stdout
    console.log('\nReport JSON:');
    console.log(JSON.stringify(report, null, 2));

    process.exit(report.success ? 0 : 1);
}

main();
