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
    const tests = [];

    // Remove ANSI escape codes for clean parsing
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

    // Try to find summary line: "Tests  7 passed (7)" or similar
    const summaryMatch = cleanOutput.match(/Tests\s+(\d+)\s+passed/);

    let passedCount = 0;

    if (summaryMatch) {
        passedCount = parseInt(summaryMatch[1], 10);
    }

    // Create placeholder tests
    for (let i = 0; i < passedCount; i++) {
        tests.push({
            name: `Test ${i + 1}`,
            status: 'passed',
            duration: 0,
            failureMessages: [],
        });
    }

    const summary = {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        xfailed: 0,
        errors: 0,
        skipped: tests.filter(t => t.status === 'skipped').length,
    };

    return { tests, summary };
}

function runTests() {
    // Run vitest from repository_after directory (uses its vitest.config.ts)
    const repoAfterPath = path.resolve(__dirname, '..', 'repository_after');

    const result = spawnSync('npm', ['run', 'test', '--', '--run'], {
        cwd: repoAfterPath,
        encoding: 'utf-8',
        shell: true,
        timeout: 120000,
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
