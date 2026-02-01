const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function getEnvironmentInfo() {
    return {
        node_version: process.version,
        platform: process.platform,
        os: os.type(),
        architecture: os.arch(),
        hostname: os.hostname(),
    };
}

function parseVitestConsoleOutput(output) {
    // Try to parse JSON reporter output first (vitest --reporter=json)
    let cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    let tests = [];
    let summary = { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 };

    try {
        // Find the JSON object in the output (skip any preamble text)
        const firstBrace = cleanOutput.indexOf('{');
        const lastBrace = cleanOutput.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonText = cleanOutput.slice(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonText);

            // Handle multiple Vitest JSON shapes
            if (parsed) {
                // Shape A: numTotalTests / numPassedTests + testResults
                if (typeof parsed.numTotalTests === 'number') {
                    summary.total = parsed.numTotalTests;
                    summary.passed = parsed.numPassedTests ?? 0;
                    summary.failed = parsed.numFailedTests ?? 0;
                    summary.skipped = parsed.numPendingTests ?? 0;
                }

                // Extract individual tests from testResults[].assertionResults
                if (Array.isArray(parsed.testResults)) {
                    parsed.testResults.forEach((suite) => {
                        if (Array.isArray(suite.assertionResults)) {
                            suite.assertionResults.forEach((t) => {
                                tests.push({
                                    name: t.fullName || t.title || `Test ${tests.length + 1}`,
                                    status: t.status || 'unknown',
                                    duration: t.duration ?? 0,
                                    failureMessages: Array.isArray(t.failureMessages) ? t.failureMessages : (t.failureMessages ? [t.failureMessages] : []),
                                });
                            });
                        }
                    });
                }

                // Shape B: stats object
                if (parsed.stats) {
                    summary.total = parsed.stats.total ?? summary.total;
                    summary.passed = parsed.stats.passed ?? summary.passed;
                    summary.failed = parsed.stats.failed ?? summary.failed;
                    summary.skipped = parsed.stats.skipped ?? summary.skipped;
                }
            }
        }
    } catch (e) {
        // fall back to text parsing below
    }

    // Fallback: look for a "Tests <n> passed" summary in plain text
    if (summary.total === 0) {
        const match = cleanOutput.match(/Tests\s+(\d+)\s+passed/);
        if (match) {
            summary.passed = parseInt(match[1], 10);
            summary.total = summary.passed;
            tests = [];
            for (let i = 0; i < summary.passed; i++) {
                tests.push({ name: `Test ${i + 1}`, status: 'passed', duration: 0, failureMessages: [] });
            }
        }
    }

    return { tests, summary };
}

function runTests() {
    // Run vitest from repository_after directory (uses its vitest.config.ts)
    const repoAfterPath = path.resolve(__dirname, '..', 'repository_after');

    // Run vitest and capture stdout/stderr directly
    const cmd = 'npx';
    const args = ['vitest', '--reporter=json', '--run'];

    const result = spawnSync(cmd, args, {
        cwd: repoAfterPath,
        encoding: 'utf-8',
        shell: true,
        timeout: 300000,
        env: process.env,
    });

    const output = (result.stdout || '') + (result.stderr || '');

    return {
        success: result.status === 0,
        exitCode: result.status ?? 1,
        output,
    };
}

function main() {
    const runId = crypto.randomUUID();
    const startedAt = new Date();

    console.log(`Starting evaluation run: ${runId}`);
    console.log(`Started at: ${startedAt.toISOString()}`);

    let success = false;
    let error = null;
    let testResults = {
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 },
    };
    let exitCode = 1;

    try {
        console.log('Running tests...');
        const result = runTests();
        exitCode = result.exitCode;
        success = result.success;

        console.log('Parsing test output...');
        testResults = parseVitestConsoleOutput(result.output);

        console.log(`Tests completed. Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}`);
    } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        console.error('Error running tests:', error);
    }

    const finishedAt = new Date();
    const durationSeconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;

    const report = {
        run_id: runId,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: parseFloat(durationSeconds.toFixed(3)),
        success,
        error,
        environment: getEnvironmentInfo(),
        results: {
            after: {
                success,
                exit_code: exitCode,
                tests: testResults.tests,
                summary: testResults.summary,
            },
            comparison: {
                after_tests_passed: testResults.summary.failed === 0 && testResults.summary.passed > 0,
                after_total: testResults.summary.total,
                after_passed: testResults.summary.passed,
                after_failed: testResults.summary.failed,
                after_xfailed: testResults.summary.xfailed,
            },
        },
    };

    // Create output directory
    const dateStr = startedAt.toISOString().slice(0, 10); // yyyy-mm-dd
    const timeStr = startedAt.toISOString().slice(11, 19).replace(/:/g, '-'); // hh-mm-ss
    const outputDir = path.join(__dirname, dateStr, timeStr);

    fs.mkdirSync(outputDir, { recursive: true });

    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nReport saved to: ${reportPath}`);
    console.log(`Duration: ${durationSeconds.toFixed(3)}s`);
    console.log(`Success: ${success}`);

    process.exit(success ? 0 : 1);
}

main();
