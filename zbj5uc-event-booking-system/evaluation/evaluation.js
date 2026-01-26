const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.resolve(REPO_ROOT, 'tests');
const REPORT_DIR = path.resolve(__dirname);

// Helper to generate UUID
const generateUUID = () => crypto.randomUUID();

// Helper to get formatted timestamps
const getTimestamps = () => {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    return { date, time };
};

// Helper to run command
const runCommand = (command, args, cwd) => {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { cwd, shell: true, env: { ...process.env, CI: 'true' } });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
};

const main = async () => {
    const runId = generateUUID();
    const startedAt = new Date();

    console.log(`Starting evaluation run ${runId}...`);

    // Ensure tests dependencies are installed
    // We assume the docker container handles this or we run it now.
    // Given the docker-compose setup, we will run npm install in tests dir just in case.
    console.log('Installing test dependencies...');
    await runCommand('npm', ['install'], REPO_ROOT);

    // Run tests with JSON output
    console.log('Running tests...');
    const { code, stdout, stderr } = await runCommand('npm', ['test', '--', '--json', '--outputFile=evaluation/test-results.json'], REPO_ROOT);

    const finishedAt = new Date();
    const durationSeconds = (finishedAt - startedAt) / 1000;

    // Parse Jest JSON output
    let testResults = {};
    const resultsPath = path.join(REPO_ROOT, 'evaluation/test-results.json');
    try {
        if (fs.existsSync(resultsPath)) {
            const fileContent = fs.readFileSync(resultsPath, 'utf8');
            testResults = JSON.parse(fileContent);
        }
    } catch (e) {
        console.error('Failed to parse test results:', e);
    }

    // Map Jest results to report format
    const summary = {
        total: testResults.numTotalTests || 0,
        passed: testResults.numPassedTests || 0,
        failed: testResults.numFailedTests || 0,
        xfailed: testResults.numPendingTests || 0, // treating pending as xfailed for now or just skipped
        errors: testResults.numRuntimeErrorTestSuites || 0,
        skipped: testResults.numPendingTests || 0
    };

    const tests = (testResults.testResults || []).flatMap(suite =>
        suite.assertionResults.map(assertion => ({
            name: assertion.fullName,
            status: assertion.status,
            duration: assertion.duration,
            failureMessages: assertion.failureMessages
        }))
    );

    const report = {
        run_id: runId,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: durationSeconds,
        success: code === 0,
        error: code !== 0 ? stderr : null,
        environment: {
            node_version: process.version,
            platform: os.platform(),
            os: os.type(),
            architecture: os.arch(),
            hostname: os.hostname()
        },
        results: {
            after: {
                success: code === 0,
                exit_code: code,
                tests: tests,
                summary: summary
            },
            comparison: {
                after_tests_passed: code === 0,
                after_total: summary.total,
                after_passed: summary.passed,
                after_failed: summary.failed,
                after_xfailed: summary.xfailed
            }
        }
    };

    // Save report
    const { date, time } = getTimestamps();
    const targetDir = path.join(REPORT_DIR, date, time);

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const reportPath = path.join(targetDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);

    // Clean up temp file
    if (fs.existsSync(resultsPath)) {
        fs.unlinkSync(resultsPath);
    }

    if (code !== 0) {
        console.error('Tests failed.');
        process.exit(1);
    } else {
        console.log('Tests passed.');
    }
};

main().catch(err => {
    console.error('Evaluation script error:', err);
    process.exit(1);
});
