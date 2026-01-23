#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_BEFORE = path.join(__dirname, '../repository_before');
const REPO_AFTER = path.join(__dirname, '../repository_after');

function runTests(repoPath, repoName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running tests on ${repoName}`);
    console.log('='.repeat(60));

    let output = '';
    let passed = 0;
    let failed = 0;
    let total = 0;

    try {
        const env = { 
            ...process.env, 
            TEST_REPO_PATH: repoPath
        };

        // For repository_before, check if tests exist, otherwise return empty results
        if (repoName === 'repository_before') {
            const testsDir = path.join(repoPath, 'tests');
            if (!fs.existsSync(testsDir) || fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.js')).length === 0) {
                console.log('No tests found in repository_before (expected)');
                return {
                    success: false,
                    passed: 0,
                    failed: 0,
                    total: 0,
                    output: 'No tests in repository_before'
                };
            }
        }

        output = execSync(
            'npm test 2>&1',
            { 
                cwd: path.join(__dirname, repoName === 'repository_before' ? '../repository_before' : '../repository_after'),
                env: env,
                encoding: 'utf8',
                shell: '/bin/bash',
                timeout: 300000
            }
        );
    } catch (error) {
        output = error.stdout || error.stderr || error.message || '';
    }

    console.log(output);

    // Parse Playwright test results
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const failedMatch = output.match(/(\d+)\s+failed/i);
    const totalMatch = output.match(/(\d+)\s+total/i);

    if (passedMatch) {
        passed = parseInt(passedMatch[1]);
    }
    if (failedMatch) {
        failed = parseInt(failedMatch[1]);
    }
    if (totalMatch) {
        total = parseInt(totalMatch[1]);
    } else if (passedMatch || failedMatch) {
        total = (passed || 0) + (failed || 0);
    }

    const success = failed === 0 && passed > 0;

    console.log(`\nParsed results: ${passed} passed, ${failed} failed, ${total} total`);

    return {
        success: success,
        passed: passed,
        failed: failed,
        total: total,
        output: output
    };
}

function analyzeMetrics(repoPath, testOutput) {
    const metrics = {
        has_playwright_tests: false,
        has_meta_tests: false,
        test_file_count: 0,
        coverage_achieved: null
    };

    if (!fs.existsSync(repoPath)) {
        return metrics;
    }

    const testsDir = path.join(repoPath, 'tests');
    if (fs.existsSync(testsDir)) {
        const files = fs.readdirSync(testsDir);
        metrics.test_file_count = files.filter(f => f.endsWith('.spec.js')).length;
        metrics.has_playwright_tests = metrics.test_file_count > 0;
        metrics.has_meta_tests = files.some(f => f.includes('meta-'));
    }

    // Extract coverage from output
    const coverageMatch = testOutput.match(/(\d+(?:\.\d+)?)%/);
    if (coverageMatch) {
        metrics.coverage_achieved = parseFloat(coverageMatch[1]);
    }

    return metrics;
}

function generateReport(beforeResults, afterResults, beforeMetrics, afterMetrics) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const reportsDir = path.join(__dirname, 'reports');
    const reportDir = path.join(reportsDir, dateStr, timeStr);
    fs.mkdirSync(reportDir, { recursive: true });

    const report = {
        run_id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        started_at: now.toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: 0,
        environment: {
            node_version: process.version,
            platform: `${process.platform}-${process.arch}`
        },
        before: {
            tests: {
                passed: beforeResults.passed,
                failed: beforeResults.failed,
                total: beforeResults.total,
                success: beforeResults.success,
                output: beforeResults.output.substring(0, 8000)
            },
            metrics: beforeMetrics
        },
        after: {
            tests: {
                passed: afterResults.passed,
                failed: afterResults.failed,
                total: afterResults.total,
                success: afterResults.success,
                output: afterResults.output.substring(0, 8000)
            },
            metrics: afterMetrics
        },
        comparison: {
            passed_gate: afterResults.success,
            improvement_summary: afterResults.success 
                ? "After implementation passed all Playwright tests."
                : "Implementation failed some tests."
        },
        success: !beforeResults.success && afterResults.success
    };

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const latestPath = path.join(reportsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    const reportContent = buildReportContent(report);
    const reportContentPath = path.join(reportDir, 'report_content');
    fs.writeFileSync(reportContentPath, reportContent);
    fs.writeFileSync(path.join(reportsDir, 'report_content'), reportContent);

    const logSummary = buildLogSummary(report);
    const logSummaryPath = path.join(reportDir, 'log_summary');
    fs.writeFileSync(logSummaryPath, logSummary);
    fs.writeFileSync(path.join(reportsDir, 'log_summary'), logSummary);

    return { report, reportPath };
}

function buildReportContent(report) {
    const before = report.before || {};
    const after = report.after || {};
    const comparison = report.comparison || {};

    return (
        "## Summary\n" +
        `- **success**: \`${report.success}\`\n` +
        `- **passed_gate**: \`${comparison.passed_gate}\`\n` +
        `- **improvement_summary**: ${comparison.improvement_summary}\n\n` +
        "## Before (`repository_before`)\n" +
        `- **passed**: \`${before.tests?.success}\`\n` +
        `- **tests_passed**: \`${before.tests?.passed}\`\n` +
        `- **tests_failed**: \`${before.tests?.failed}\`\n` +
        "### Output (truncated)\n" +
        "```\n" +
        `${(before.tests?.output || '').substring(0, 2000)}\n` +
        "```\n\n" +
        "## After (`repository_after`)\n" +
        `- **passed**: \`${after.tests?.success}\`\n` +
        `- **tests_passed**: \`${after.tests?.passed}\`\n` +
        `- **tests_failed**: \`${after.tests?.failed}\`\n` +
        "### Output (truncated)\n" +
        "```\n" +
        `${(after.tests?.output || '').substring(0, 2000)}\n` +
        "```\n"
    );
}

function buildLogSummary(report) {
    const comparison = report.comparison || {};
    const before = report.before || {};
    const after = report.after || {};

    return (
        "KANBAN PLAYWRIGHT TEST EVALUATION\n\n" +
        `success: ${report.success}\n` +
        `passed_gate: ${comparison.passed_gate}\n` +
        `before.tests.success: ${before.tests?.success}\n` +
        `after.tests.success: ${after.tests?.success}\n` +
        `after.tests.passed: ${after.tests?.passed}\n` +
        `after.tests.failed: ${after.tests?.failed}\n`
    );
}

function main() {
    console.log('='.repeat(60));
    console.log('Kanban Playwright Test Suite Evaluation');
    console.log('='.repeat(60));

    // Run tests on before (should fail - no tests exist)
    console.log('\n[1/3] Running tests on repository_before (expected to FAIL)...');
    const beforeResults = runTests(REPO_BEFORE, 'repository_before');
    const beforeMetrics = analyzeMetrics(REPO_BEFORE, beforeResults.output);
    console.log(`  ✗ Passed: ${beforeResults.passed}`);
    console.log(`  ✗ Failed: ${beforeResults.failed}`);
    console.log(`  ✗ Total: ${beforeResults.total}`);

    // Run tests on after (should pass)
    console.log('\n[2/3] Running tests on repository_after (expected to PASS)...');
    const afterResults = runTests(REPO_AFTER, 'repository_after');
    const afterMetrics = analyzeMetrics(REPO_AFTER, afterResults.output);
    console.log(`  ✓ Passed: ${afterResults.passed}`);
    console.log(`  ✓ Failed: ${afterResults.failed}`);
    console.log(`  ✓ Total: ${afterResults.total}`);

    // Generate report
    console.log('\n[3/3] Generating report...');
    const { report, reportPath } = generateReport(beforeResults, afterResults, beforeMetrics, afterMetrics);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Evaluation Complete');
    console.log('='.repeat(60));
    console.log(`\nOverall Success: ${report.success}`);
    console.log(`\nBefore (No Tests):`);
    console.log(`  - Tests Passed: ${beforeResults.passed}/${beforeResults.total}`);
    console.log(`  - Tests Failed: ${beforeResults.failed}/${beforeResults.total}`);
    console.log(`\nAfter (With Tests):`);
    console.log(`  - Tests Passed: ${afterResults.passed}/${afterResults.total}`);
    console.log(`  - Tests Failed: ${afterResults.failed}/${afterResults.total}`);
    console.log(`  - Test Files: ${afterMetrics.test_file_count}`);
    console.log(`  - Has Meta Tests: ${afterMetrics.has_meta_tests}`);
    console.log(`\nReport saved to: ${reportPath}`);

    process.exit(report.success ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = { runTests, analyzeMetrics, generateReport };
