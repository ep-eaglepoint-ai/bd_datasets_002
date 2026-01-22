import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
    const resultsPath = path.join(__dirname, 'test-results.json');

    try {
        // Run tests with JSON reporter
        execSync('npx vitest run --reporter=json --outputFile=' + resultsPath, {
            encoding: 'utf-8',
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe' // Capture output to avoid console noise, but ignore it since we read file
        });
        returnCode = 0;
    } catch (error) {
        if (error.output) {
            // Collect stdout/stderr for debug if needed, but we essentially rely on the json file
            testOutput = error.output.map(b => b ? b.toString() : '').join('');
        }
        returnCode = error.status || 1;
    }

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;

    let totalTests = 0;
    let passedTests = 0;
    let testResults = [];

    if (fs.existsSync(resultsPath)) {
        try {
            const jsonResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            totalTests = jsonResults.numTotalTests;
            passedTests = jsonResults.numPassedTests;

            // Extract test details
            if (jsonResults.testResults) {
                jsonResults.testResults.forEach(suite => {
                    const filename = path.relative(path.join(__dirname, '..'), suite.name);
                    suite.assertionResults.forEach(assertion => {
                        testResults.push({
                            fullName: `${filename}::${assertion.title}`,
                            status: assertion.status,
                            title: assertion.title,
                            failureMessages: assertion.failureMessages,
                            location: assertion.location || { line: 0, column: 0 }
                        });
                    });
                });
            }

        } catch (e) {
            console.error("Failed to parse test results JSON", e);
        }
        // Clean up
        fs.unlinkSync(resultsPath);
    }

    const passed = returnCode === 0 && passedTests === totalTests;

    return {
        passed,
        returnCode,
        output: testOutput, // We can leave this empty or populate if validation failed
        durationSeconds,
        summary: {
            numTotalTests: totalTests,
            numPassedTests: passedTests,
            numFailedTests: totalTests - passedTests,
            numTotalTestSuites: 1,
            numPassedTestSuites: passed ? 1 : 0,
            numFailedTestSuites: passed ? 0 : 1
        },
        summary_matrix: [[passedTests, totalTests - passedTests]],
        tests: testResults
    };
}



function generateReport() {
    const timestamp = getCurrentTimestamp();
    const runId = crypto.randomUUID();

    console.log('Running tests for repository_after...');
    const afterResults = runTests();

    const report = {
        run_id: runId,
        started_at: timestamp.iso,
        finished_at: new Date().toISOString(),
        duration_seconds: afterResults.durationSeconds,
        environment: {
            node_version: process.version,
            platform: `${process.platform}-${process.arch}`
        },
        after: {
            tests: afterResults,
            metrics: {
                execution_time_seconds: afterResults.durationSeconds,
                tests_passed: afterResults.summary.numPassedTests,
                tests_failed: afterResults.summary.numFailedTests,
                error: null
            }
        },
        comparison: {
            passed_gate: afterResults.passed,
            improvement_summary: afterResults.passed
                ? 'All requirements met with 3-layer architecture'
                : 'Tests failed',
            requirements_met: {
                environment: 'Vite.js with plain JavaScript',
                architecture: '3-file feature-based separation',
                table_integration: 'orders, expenses, product_reviews',
                aggregate_accuracy: 'Revenue, Costs, Profit, Sentiment',
                resilience: 'Partial API failures handled gracefully',
                verification: 'Unit tests with mocked Supabase'
            }
        },
        success: afterResults.passed,
        error: null
    };

    const reportDir = path.join(__dirname, timestamp.date, timestamp.time);
    fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Report generated: ${reportPath}`);
    console.log(`Run ID: ${runId}`);
    console.log(`Tests: ${afterResults.summary.numPassedTests}/${afterResults.summary.numTotalTests} passed`);
    console.log(`Duration: ${afterResults.durationSeconds.toFixed(3)}s`);

    return report;
}

try {
    generateReport();
    process.exit(0);
} catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
}
