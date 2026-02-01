/**
 * Evaluation Script
 * Runs tests against repository_before and repository_after.
 * Generates a JSON report in evaluation/yyyy-mm-dd/hh-mm-ss/report.json.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');

// Configuration
const REPO_BEFORE = 'repository_before';
const REPO_AFTER = 'repository_after';
const TEST_SCRIPT = 'tests/run_tests.js';

// Helper to calculate duration
const now = () => new Date();

// Helper to run command and capture output
function runTests(repoPath) {
    return new Promise((resolve) => {
        const env = { ...process.env, REPO_PATH: repoPath }; // Ensure REPO_PATH is set

        const child = spawn('node', [TEST_SCRIPT], { env });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                exit_code: code,
                stdout,
                stderr
            });
        });
    });
}

// Parse spec output from node:test
function parseTestOutput(stdout) {
    const tests = [];
    const lines = stdout.split('\n');

    // Regex for spec reporter
    const passRegex = /^\s*✔\s+(.+?)\s+\(/;
    const failRegex = /^\s*✖\s+(.+?)\s+\(/;

    // We need to avoid parsing the summary section "✖ failing tests:"
    let inSummary = false;

    for (const line of lines) {
        if (line.includes('✖ failing tests:')) {
            inSummary = true;
        }

        if (inSummary) continue;

        const passMatch = line.match(passRegex);
        if (passMatch) {
            tests.push({
                nodeid: passMatch[1],
                name: passMatch[1],
                outcome: 'passed',
                message: line.trim()
            });
            continue;
        }

        const failMatch = line.match(failRegex);
        if (failMatch) {
            if (failMatch[1] === 'Encryption Utility Compliance Tests') continue;

            tests.push({
                nodeid: failMatch[1],
                name: failMatch[1],
                outcome: 'failed',
                message: line.trim()
            });
            continue;
        }
    }

    return tests;
}

function calculateSummary(tests, markFailedAsXfailed = false) {
    let passed = 0;
    let failed = 0;
    let xfailed = 0;

    const processedTests = tests.map(t => {
        if (markFailedAsXfailed && t.outcome === 'failed') {
            xfailed++;
            return { ...t, outcome: 'xfailed' };
        } else if (t.outcome === 'failed') {
            failed++;
            return t;
        } else {
            passed++;
            return t;
        }
    });

    return {
        tests: processedTests,
        summary: {
            total: tests.length,
            passed,
            failed,
            xfailed,
            errors: 0,
            skipped: 0
        }
    };
}

async function main() {
    const startTime = now();
    const runId = crypto.randomUUID();

    console.log(`Starting Evaluation... (Run ID: ${runId})`);

    // 1. Run Before
    console.log(`Running tests on ${REPO_BEFORE}...`);
    const beforeResult = await runTests(REPO_BEFORE);
    const beforeTestsRaw = parseTestOutput(beforeResult.stdout);
    const beforeData = calculateSummary(beforeTestsRaw, true);

    // 2. Run After
    console.log(`Running tests on ${REPO_AFTER}...`);
    const afterResult = await runTests(REPO_AFTER);
    const afterTestsRaw = parseTestOutput(afterResult.stdout);
    const afterData = calculateSummary(afterTestsRaw, false);

    const endTime = now();
    const duration = (endTime - startTime) / 1000;

    // 3. Construct Report
    const report = {
        run_id: runId,
        started_at: startTime.toISOString(),
        finished_at: endTime.toISOString(),
        duration_seconds: duration,
        success: true, // execution successful
        error: null,
        environment: {
            node_version: process.version,
            platform: os.platform(),
            os: os.type(),
            architecture: os.arch(),
            hostname: os.hostname()
        },
        results: {
            before: {
                success: beforeResult.exit_code === 0,
                exit_code: beforeResult.exit_code,
                tests: beforeData.tests,
                summary: beforeData.summary
            },
            after: {
                success: afterResult.exit_code === 0,
                exit_code: afterResult.exit_code,
                tests: afterData.tests,
                summary: afterData.summary
            },
            comparison: {
                before_tests_passed: beforeData.summary.passed === beforeData.summary.total,
                after_tests_passed: afterData.summary.passed === afterData.summary.total,
                before_total: beforeData.summary.total,
                before_passed: beforeData.summary.passed,
                before_failed: beforeData.summary.failed,
                before_xfailed: beforeData.summary.xfailed,
                after_total: afterData.summary.total,
                after_passed: afterData.summary.passed,
                after_failed: afterData.summary.failed,
                after_xfailed: afterData.summary.xfailed
            }
        }
    };

    // 4. Write Report
    const dateStr = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = startTime.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS

    // Ensure dir exists
    const reportDir = path.join(__dirname, dateStr, timeStr);
    fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Report generated at: ${reportPath}`);
}

main().catch(err => {
    console.error("Evaluation failed:", err);
    process.exit(1);
});
