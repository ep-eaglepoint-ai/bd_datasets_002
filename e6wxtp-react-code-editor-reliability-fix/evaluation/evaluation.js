// evaluation.js - Test Evaluation and Report Generation
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const http = require('http');
const net = require('net');

let killPortLib;
try {
    // Try to load kill-port from tests dependencies
    killPortLib = require('../tests/node_modules/kill-port');
} catch (e) {
    console.warn("Warning: kill-port library not found in ./tests/node_modules. Port cleanup might fail.");
}

const TEST_PORT_BEFORE = 3000;
const TEST_PORT_AFTER = 3001;

// Helper: Ensure port is free
async function ensurePortFree(port) {
    for (let i = 0; i < 20; i++) {
        const isFree = await new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', (err) => {
                resolve(false);
            });
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port);
        });

        if (isFree) return true;

        console.log(`Port ${port} still busy (attempt ${i + 1}/20), retrying kill...`);
        try {
            if (killPortLib) {
                await killPortLib(port);
            } else {
                if (os.platform() !== 'win32') {
                    try {
                        const testDir = path.join(process.cwd(), 'tests');
                        execSync(`npx kill-port ${port}`, { cwd: testDir, stdio: 'ignore' });
                    } catch (e) {
                        execSync(`(lsof -t -i:${port} | xargs kill -9) || (fuser -k ${port}/tcp) || true`, { stdio: 'ignore' });
                    }
                } else {
                    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`, { stdio: 'ignore' });
                }
            }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

// Helper: Kill any process on port
async function killPort(port) {
    console.log(`Cleaning up port ${port}...`);
    try {
        if (killPortLib) {
            await killPortLib(port);
        } else {
            // Fallback
            try {
                const testDir = path.join(process.cwd(), 'tests');
                execSync(`npx kill-port ${port}`, { cwd: testDir, stdio: 'ignore' });
            } catch (e) { }
        }
    } catch (e) {
        console.error("Error killing port:", e.message);
    }
    // Verify
    const free = await ensurePortFree(port);
    if (!free) console.error(`WARNING: Port ${port} could not be freed.`);
}

// Helper: Wait for server to be ready
async function waitForServer(port, retries = 600) {
    const url = `http://localhost:${port}`;
    console.log(`Waiting for ${url} to be ready...`);
    for (let i = 0; i < retries; i++) {
        if (i % 10 === 0) console.log(`Retry ${i}/${retries}...`);
        try {
            const isReady = await new Promise((resolve) => {
                const req = http.get(url, (res) => {
                    resolve(res.statusCode === 200);
                });
                req.on('error', () => resolve(false));
                req.setTimeout(500, () => {
                    req.destroy();
                    resolve(false);
                });
                req.end();
            });
            if (isReady) {
                console.log("Server is ready!");
                return true;
            }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 500));
    }
    console.error("Server failed to start in time.");
    return false;
}

// Helper: Start server
async function startServer(dirName, port) {
    console.log(`Starting server in ${dirName} on port ${port}...`);
    await killPort(port);

    const serverProcess = spawn('npm', ['start'], {
        cwd: path.join(process.cwd(), dirName),
        shell: true,
        stdio: 'inherit',
        detached: true, // Allow killing the entire process group
        env: { ...process.env, PORT: port.toString(), BROWSER: 'none', CI: 'true' }
    });

    return serverProcess;
}

/**
 * Run tests for a specific repository and parse results
 */
async function runTestsAndParse(repositoryName, port) {
    const startTime = Date.now();
    const testUrl = `http://localhost:${port}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running tests for ${repositoryName} on ${testUrl}...`);
    console.log(`${'='.repeat(60)}\n`);

    // Start Server
    let serverProc = null;
    try {
        serverProc = await startServer(repositoryName, port);
    } catch (e) {
        console.error("Failed to start server process:", e);
        return { success: false, exit_code: 1, tests: [], summary: { failed: 1 }, duration_seconds: 0 };
    }

    const ready = await waitForServer(port);
    if (!ready) {
        console.error("Skipping tests because server didn't start.");
        if (serverProc) {
            try {
                process.kill(-serverProc.pid);
            } catch (e) {
                await killPort(port);
            }
        } else {
            await killPort(port);
        }
        return {
            success: false,
            exit_code: 1,
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
            stdout: '',
            stderr: 'Server failed to start',
            duration_seconds: 0
        };
    }

    // Run Tests
    const testDir = path.join(process.cwd(), 'tests');

    // Results container
    const tests = [];
    const summary = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
    };

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
        console.log(`Running Jest suite in ${testDir} against ${testUrl}...`);

        let jestOutput;
        try {
            // Run Jest with APP_URL env var
            const cmd = `npx jest --json --passWithNoTests`;
            jestOutput = execSync(cmd, {
                cwd: testDir,
                env: { ...process.env, APP_URL: testUrl },
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch (e) {
            jestOutput = e.stdout;
            stderr += e.stderr;
            exitCode = 1;
        }

        stdout += jestOutput;

        // CRITICAL: Log Jest output to see failures in CI
        // Extract the JSON part if mixed with other output, or just log the whole thing if it's mostly JSON
        // For debugging, we log the raw output (which might be large, but necessary)
        console.log("----- JEST OUTPUT START -----");
        console.log(jestOutput);
        console.log("----- JEST OUTPUT END -----");
        if (stderr) {
            console.error("----- JEST STDERR START -----");
            console.error(stderr);
            console.error("----- JEST STDERR END -----");
        }

        try {
            const results = JSON.parse(jestOutput);

            summary.total = results.numTotalTests;
            summary.passed = results.numPassedTests;
            summary.failed = results.numFailedTests;
            summary.errors = results.numRuntimeErrorTestSuites;
            summary.skipped = results.numPendingTests;

            results.testResults.forEach(suite => {
                suite.assertionResults.forEach(assertion => {
                    const duration = (assertion.duration || 0) / 1000;
                    const outcome = assertion.status === 'passed' ? 'passed' :
                        assertion.status === 'failed' ? 'failed' : 'skipped';

                    tests.push({
                        nodeid: assertion.fullName,
                        name: assertion.title,
                        outcome: outcome,
                        duration: duration,
                        error: assertion.failureMessages ? assertion.failureMessages.join('\n') : undefined
                    });
                });
            });

        } catch (parseError) {
            console.error("Failed to parse Jest output:", parseError);
            stderr += `\nFailed to parse Jest JSON: ${parseError.message}`;
            exitCode = 1;
        }

    } catch (error) {
        stderr += error.message;
        exitCode = 1;
        summary.errors++;
    }

    // Stop Server (Robust Kill)
    if (serverProc) {
        console.log(`Stopping server process (PID ${serverProc.pid})...`);
        try {
            // Kill process group (works on Linux/Unix)
            process.kill(-serverProc.pid);
        } catch (e) {
            // Fallback for Windows or if group kill fails
            try {
                serverProc.kill();
            } catch (e2) { }
        }
    }
    // Double check port
    await killPort(port);

    const duration = (Date.now() - startTime) / 1000;

    console.log(`\n${repositoryName} Summary:`);
    console.log(`  Total: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Duration: ${duration.toFixed(2)}s\n`);

    return {
        success: exitCode === 0 || summary.failed === 0,
        exit_code: exitCode,
        tests,
        summary,
        stdout,
        stderr,
        duration_seconds: duration,
    };
}

/**
 * Get Git information
 */
function getGitInfo() {
    try {
        const commit = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: 'ignore' }).trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: 'ignore' }).trim();
        return { commit, branch };
    } catch {
        return { commit: 'unknown', branch: 'unknown' };
    }
}

/**
 * Generate UUID-like run ID
 */
function generateRunId() {
    return Math.random().toString(36).substring(2, 10);
}

// ------------------------------------------------------------------
// Main Logic
// ------------------------------------------------------------------
async function main() {
    const args = process.argv.slice(2);
    const outputFlag = args.indexOf('--output');
    const customOutput = outputFlag !== -1 ? args[outputFlag + 1] : null;

    // Target selection: 'before', 'after', or 'both' (default)
    const targetFlag = args.indexOf('--target');
    const target = targetFlag !== -1 ? args[targetFlag + 1] : 'both';

    const startAll = new Date();
    const runId = generateRunId();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`EVALUATION RUN ID: ${runId}`);
    console.log(`Target: ${target}`);
    console.log(`Started at: ${startAll.toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    const baseDir = process.cwd();

    let resBefore = { summary: { total: 0, passed: 0, failed: 0, errors: 0 } };
    let resAfter = { summary: { total: 0, passed: 0, failed: 0, errors: 0 } };

    // Initial cleanup of both ports
    await killPort(TEST_PORT_BEFORE);
    await killPort(TEST_PORT_AFTER);

    // 1. Run tests for repository_before
    if (target === 'both' || target === 'before') {
        resBefore = await runTestsAndParse('repository_before', TEST_PORT_BEFORE);
    }

    // 2. Run tests for repository_after
    if (target === 'both' || target === 'after') {
        resAfter = await runTestsAndParse('repository_after', TEST_PORT_AFTER);
    }

    const finishedAt = new Date();
    const gitInfo = getGitInfo();

    // Calculate improvement percentage (only if both run, otherwise 0 or N/A)
    const beforePassRate = resBefore.summary.total > 0 ? (resBefore.summary.passed / resBefore.summary.total) * 100 : 0;
    const afterPassRate = resAfter.summary.total > 0 ? (resAfter.summary.passed / resAfter.summary.total) * 100 : 0;
    const improvement = (target === 'both') ? (afterPassRate - beforePassRate) : 0;

    // Determine success based on target
    let overallSuccess = false;
    if (target === 'before') overallSuccess = resBefore.success;
    else if (target === 'after') overallSuccess = resAfter.success;
    else overallSuccess = resAfter.success; // For 'both', usually we care if 'after' is good.

    // Generate report
    const shouldGenerateReport = args.includes('--report');

    const report = {
        run_id: runId,
        started_at: startAll.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: (finishedAt.getTime() - startAll.getTime()) / 1000,
        success: overallSuccess,
        error: null,
        environment: {
            node_version: process.version,
            platform: os.platform(),
            os: os.type(),
            os_release: os.release(),
            architecture: os.arch(),
            hostname: os.hostname(),
            git_commit: gitInfo.commit,
            git_branch: gitInfo.branch,
        },
        results: {
            before: resBefore,
            after: resAfter,
            comparison: {
                before_tests_passed: resBefore.success,
                after_tests_passed: resAfter.success,
                before_total: resBefore.summary.total,
                before_passed: resBefore.summary.passed,
                before_failed: resBefore.summary.failed + resBefore.summary.errors,
                after_total: resAfter.summary.total,
                after_passed: resAfter.summary.passed,
                after_failed: resAfter.summary.failed + resAfter.summary.errors,
                improvement_percentage: improvement,
            },
        },
    };

    let reportPath = null;
    if (shouldGenerateReport) {
        // Determine output path
        if (customOutput) {
            reportPath = customOutput;
            const reportDir = path.dirname(reportPath);
            if (reportDir && !fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
        } else {
            const timestampDay = startAll.toISOString().split('T')[0]; // YYYY-MM-DD
            const timestampTime = startAll.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const reportDir = path.join(baseDir, 'evaluation', 'reports', timestampDay, timestampTime);
            fs.mkdirSync(reportDir, { recursive: true });
            reportPath = path.join(reportDir, 'report.json');
        }

        // Write report
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`EVALUATION COMPLETE`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Report Summary:`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Duration: ${report.duration_seconds.toFixed(2)}s`);
    console.log(`  Overall Success: ${report.success ? '✅ YES' : '❌ NO'}\n`);

    if (target === 'both' || target === 'before') {
        console.log(`  repository_before: ${resBefore.summary.passed}/${resBefore.summary.total} passed`);
    }
    if (target === 'both' || target === 'after') {
        console.log(`  repository_after:  ${resAfter.summary.passed}/${resAfter.summary.total} passed`);
    }
    if (target === 'both') {
        console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);
    }

    console.log(`Report generated at: ${reportPath}\n`);

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
}

// Run main function
main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
});
