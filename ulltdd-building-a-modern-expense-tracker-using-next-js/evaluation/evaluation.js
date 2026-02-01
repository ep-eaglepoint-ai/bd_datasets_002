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
        // Find first JSON object in output
        const firstBrace = cleanOutput.indexOf('{');
        if (firstBrace !== -1) {
            const jsonText = cleanOutput.slice(firstBrace);
            const parsed = JSON.parse(jsonText);

            // Vitest JSON reporter exposes `stats` and `tests` (depends on version)
            if (parsed && parsed.stats) {
                summary.total = parsed.stats.total ?? 0;
                summary.passed = parsed.stats.passed ?? 0;
                summary.failed = parsed.stats.failed ?? 0;
                summary.skipped = parsed.stats.skipped ?? 0;
            }

            if (parsed && Array.isArray(parsed.tests)) {
                tests = parsed.tests.map((t, i) => ({
                    name: t.name ?? `Test ${i + 1}`,
                    status: t.status ?? 'unknown',
                    duration: t.duration ?? 0,
                    failureMessages: t.error ? [t.error.message || String(t.error)] : [],
                }));
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

    // Run vitest and capture its output into a report file to avoid mixing other logs
    const reportFile = path.join(repoAfterPath, 'vitest_report.json');
    // Shell command writes both stdout and stderr to the file
    const shellCmd = `npx vitest --reporter=json --run > "${reportFile}" 2>&1`;

    const result = spawnSync('bash', ['-lc', shellCmd], {
        cwd: repoAfterPath,
        encoding: 'utf-8',
        shell: true,
        timeout: 300000,
        env: process.env,
    });

    let output = '';
    try {
        output = fs.readFileSync(reportFile, 'utf-8');
    } catch (e) {
        output = (result.stdout || '') + (result.stderr || '') + '\n' + (e.message || '');
    }

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
