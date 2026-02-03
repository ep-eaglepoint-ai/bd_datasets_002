#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
    return {
        python_version: process.version,
        platform: `${process.platform}-${process.arch}`
    };
}

function runTests(testFiles) {
    const jestArgs = testFiles.map(f => `tests/${f}`);

    try {
        const output = execSync(`npx jest ${jestArgs.join(' ')}`, {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: 120000
        });
        return {
            passed: true,
            return_code: 0,
            output: output.substring(0, 8000)
        };
    } catch (error) {
        return {
            passed: false,
            return_code: error.status || 1,
            output: (error.stdout || '') + (error.stderr || '').substring(0, 8000)
        };
    }
}

function runMetrics(repoPath) {
    return {};
}

function evaluate(repoName, testFiles) {
    const repoPath = path.join(ROOT, repoName);
    const tests = runTests(testFiles);
    const metrics = runMetrics(repoPath);
    return {
        tests,
        metrics
    };
}

function runEvaluation() {
    const runId = crypto.randomUUID();
    const startTime = new Date();

    // Before: only integration tests
    const before = evaluate('repository_before', ['integration.test.js']);
    // After: all tests except integration
    const after = evaluate('repository_after', [
        'legacy.test.js',
        'isolation.test.js',
        'tax.test.js',
        'refactored.test.js'
    ]);

    const endTime = new Date();
    const durationSeconds = (endTime - startTime) / 1000;

    const comparison = {
        passed_gate: after.tests.passed,
        improvement_summary: after.tests.passed 
            ? 'After implementation passed correctness criteria'
            : 'After implementation failed correctness criteria'
    };

    const report = {
        run_id: runId,
        started_at: startTime.toISOString() + 'Z',
        finished_at: endTime.toISOString() + 'Z',
        duration_seconds: parseFloat(durationSeconds.toFixed(3)),
        environment: environmentInfo(),
        before: before,
        after: after,
        comparison: comparison,
        success: comparison.passed_gate,
        error: null
    };

    return report;
}

function main() {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const report = runEvaluation();
    const reportPath = path.join(REPORTS_DIR, 'latest.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportPath}`);

    return report.success ? 0 : 1;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = { runEvaluation };
