const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
    return {
        node: process.version,
        platform: os.platform() + ' ' + os.release()
    };
}

function parseVitestOutput(output) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('Tests') && line.includes('passed')) {
            const passedMatch = line.match(/(\d+)\s+passed/);
            if (passedMatch) passed = parseInt(passedMatch[1], 10);

            const failedMatch = line.match(/(\d+)\s+failed/);
            if (failedMatch) failed = parseInt(failedMatch[1], 10);

            const skippedMatch = line.match(/(\d+)\s+skipped/);
            if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);
        }
    }

    return { passed, failed, skipped };
}

function runTestsDocker() {
    try {
        const result = spawnSync('docker', ['compose', 'run', '--rm', 'tests'], {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: 300000
        });

        const output = (result.stdout || '') + (result.stderr || '');
        const { passed, failed, skipped } = parseVitestOutput(output);

        return {
            passed: failed === 0 && passed > 0,
            return_code: result.status,
            tests_passed: passed,
            tests_failed: failed,
            tests_skipped: skipped,
            output: output.slice(0, 8000)
        };
    } catch (e) {
        return {
            passed: false,
            return_code: -1,
            tests_passed: 0,
            tests_failed: 0,
            tests_skipped: 0,
            output: `Error running tests: ${e.message}`
        };
    }
}

function runTestsDirect() {
    const workDir = '/app/repository_after';

    try {
        const vitestBin = path.join(workDir, 'node_modules', '.bin', 'vitest');

        const result = spawnSync(vitestBin, ['run'], {
            cwd: workDir,
            encoding: 'utf-8',
            env: { ...process.env, CI: 'true' },
            timeout: 300000
        });

        const output = (result.stdout || '') + (result.stderr || '');
        const { passed, failed, skipped } = parseVitestOutput(output);

        const isSuccess = (failed === 0 && passed > 0) || (result.status === 0 && passed > 0);

        return {
            passed: isSuccess,
            return_code: result.status,
            tests_passed: passed,
            tests_failed: failed,
            tests_skipped: skipped,
            output: output.slice(0, 8000)
        };

    } catch (e) {
        return {
            passed: false,
            return_code: -1,
            tests_passed: 0,
            tests_failed: 0,
            tests_skipped: 0,
            output: `Error running tests: ${e.message}`
        };
    }
}

function runTests() {
    const inDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER;

    if (inDocker) {
        return runTestsDirect();
    } else {
        return runTestsDocker();
    }
}

function evaluate() {
    const tests = runTests();
    return { tests, metrics: {} };
}

function printSeparator(char = '=', length = 70) {
    console.log(char.repeat(length));
}

function printTestSummary(name, result) {
    if (!result) {
        console.log(`\n${'─'.repeat(35)}`);
        console.log(`  ${name}`);
        console.log(`${'─'.repeat(35)}`);
        console.log(`  Status:          ⚪ SKIPPED (not present)`);
        return;
    }

    const tests = result.tests;
    const status = tests.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${'─'.repeat(35)}`);
    console.log(`  ${name}`);
    console.log(`${'─'.repeat(35)}`);
    console.log(`  Status:          ${status}`);
    console.log(`  Tests Passed:    ${tests.tests_passed}`);
    console.log(`  Tests Failed:    ${tests.tests_failed}`);
    console.log(`  Tests Skipped:   ${tests.tests_skipped}`);
    console.log(`  Return Code:     ${tests.return_code}`);
}

function runEvaluation() {
    const runId = crypto.randomUUID();
    const start = new Date();

    printSeparator();
    console.log('  RESUME BUILDER EVALUATION');
    printSeparator();

    console.log(`\n  Run ID:     ${runId}`);
    console.log(`  Started:    ${start.toISOString().replace('T', ' ').split('.')[0]} UTC`);
    console.log(`  Node:       ${process.version}`);
    console.log(`  Platform:   ${os.platform()}`);

    const inDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER;
    console.log(`  Environment: ${inDocker ? 'Docker container' : 'Host system'}`);

    console.log(`\n${'─'.repeat(70)}`);
    console.log('  Running Tests...');
    console.log(`${'─'.repeat(70)}`);

    console.log('\n  [1/2] repository_before: SKIPPED (not present)');

    console.log('  [2/2] Testing repository_after...');
    const after = evaluate();

    const comparison = {
        before_passed: null,
        after_passed: after.tests.passed,
        before_failed_count: null,
        after_failed_count: after.tests.tests_failed,
        passed_gate: after.tests.passed,
        improvement_summary: ''
    };

    if (after.tests.passed) {
        comparison.improvement_summary = `All ${after.tests.tests_passed} tests passed successfully.`;
    } else {
        comparison.improvement_summary = `${after.tests.tests_failed} tests failed.`;
    }

    const end = new Date();
    const duration = (end - start) / 1000;

    const result = {
        run_id: runId,
        started_at: start.toISOString(),
        finished_at: end.toISOString(),
        duration_seconds: duration,
        environment: environmentInfo(),
        before: null,
        after: after,
        comparison: comparison,
        success: after.tests.passed,
        error: null
    };

    const dateStr = start.toISOString().split('T')[0];
    const timeStr = start.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const reportDir = path.join(REPORTS, dateStr, timeStr);

    try {
        fs.mkdirSync(reportDir, { recursive: true });
        const reportPath = path.join(reportDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

        console.log(`\n${'─'.repeat(70)}`);
        console.log('  RESULTS SUMMARY');
        console.log(`${'─'.repeat(70)}`);

        printTestSummary('repository_before', null);
        printTestSummary('repository_after', after);

        console.log(`\n${'─'.repeat(70)}`);
        console.log('  COMPARISON');
        console.log(`${'─'.repeat(70)}`);

        const beforeStatus = '⚪ Not present';
        const afterStatus = after.tests.passed ? '✅ All tests pass' : `❌ ${after.tests.tests_failed} tests FAILED`;
        const gateStatus = result.success ? '✅ PASSED' : '❌ FAILED';

        console.log(`\n  Before:     ${beforeStatus}`);
        console.log(`  After:      ${afterStatus}`);
        console.log(`  Gate:       ${gateStatus}`);
        console.log(`\n  Summary: ${comparison.improvement_summary}`);

        console.log(`\n${'─'.repeat(70)}`);
        console.log('  REPORT');
        console.log(`${'─'.repeat(70)}`);

        console.log(`\n  Report saved to: ${reportPath}`);
        console.log(`  Duration: ${duration.toFixed(2)} seconds`);

        console.log(`\n${'='.repeat(70)}`);
        if (result.success) {
            console.log('  ✅ EVALUATION SUCCESSFUL ✅');
        } else {
            console.log('  ❌ EVALUATION FAILED ❌');
        }
        console.log(`${'='.repeat(70)}\n`);

        return result;

    } catch (e) {
        console.error('Error writing report:', e);
        return { success: false };
    }
}

function main() {
    try {
        const result = runEvaluation();
        process.exit(result.success ? 0 : 1);
    } catch (e) {
        console.error(`\n❌ Evaluation failed with error: ${e.message}`);
        process.exit(1);
    }
}

main();
