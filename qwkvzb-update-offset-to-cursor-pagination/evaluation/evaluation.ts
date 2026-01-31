// evaluation.ts - Test Evaluation and Report Generation
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import * as os from 'os';

interface TestResult {
    nodeid: string;
    name: string;
    outcome: 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
}

interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
}

interface RepositoryTestResult {
    success: boolean;
    exit_code: number;
    tests: TestResult[];
    summary: TestSummary;
    stdout: string;
    stderr: string;
    duration_seconds: number;
}

interface EvaluationReport {
    run_id: string;
    started_at: string;
    finished_at: string;
    duration_seconds: number;
    success: boolean;
    error: string | null;
    environment: {
        node_version: string;
        typescript_version: string;
        platform: string;
        os: string;
        os_release: string;
        architecture: string;
        hostname: string;
        git_commit: string;
        git_branch: string;
    };
    results: {
        before: RepositoryTestResult | null;
        after: RepositoryTestResult | null;
        comparison: {
            before_tests_passed: boolean;
            after_tests_passed: boolean;
            before_total: number;
            before_passed: number;
            before_failed: number;
            after_total: number;
            after_passed: number;
            after_failed: number;
            improvement_percentage: number;
        } | null;
    };
}

/**
 * Run tests for a specific repository and parse results
 */
async function runTestsAndParse(
    directory: string,
    repositoryName: string
): Promise<RepositoryTestResult> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running tests for ${repositoryName}...`);
    console.log(`${'='.repeat(60)}\n`);

    const testDir = path.join(process.cwd(), 'tests');
    const tests: TestResult[] = [];
    const summary: TestSummary = {
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
        // Get all test files
        const testFiles = fs.readdirSync(testDir)
            .filter(file => file.endsWith('.ts') && file.startsWith('test_'))
            .map(file => path.join(testDir, file));

        console.log(`Found ${testFiles.length} test files\n`);

        // Run each test file individually to get granular results
        for (const testFile of testFiles) {
            const testName = path.basename(testFile, '.ts');
            console.log(`Running ${testName}...`);

            try {
                // Modify import path to point to correct repository
                const testContent = fs.readFileSync(testFile, 'utf8');
                const modifiedContent = testName === 'test_consistency_shared'
                    ? testContent
                    : testContent.replace(
                        /from ['"]\.\.\/repository_after/g,
                        `from '../${repositoryName}`
                    );

                // Create temporary test file
                const tempTestFile = path.join(testDir, `_temp_${testName}.ts`);
                fs.writeFileSync(tempTestFile, modifiedContent, 'utf8');

                const testStartTime = Date.now();

                // Run test with ts-node
                const result = execSync(
                    `npx ts-node --transpile-only "${tempTestFile}"`,
                    {
                        cwd: process.cwd(),
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe'],
                        timeout: 60000, // 60 second timeout per test
                    }
                );

                const testDuration = (Date.now() - testStartTime) / 1000;

                stdout += result;
                console.log(`  ✅ PASSED (${testDuration.toFixed(2)}s)\n`);

                tests.push({
                    nodeid: `tests/${testName}.ts::${testName}`,
                    name: testName,
                    outcome: 'passed',
                    duration: testDuration,
                });

                summary.passed++;

                // Clean up temp file
                fs.unlinkSync(tempTestFile);

            } catch (error: any) {
                const testDuration = (Date.now() - Date.now()) / 1000;

                stderr += error.stderr || error.stdout || error.message;
                console.log(`  ❌ FAILED\n`);

                tests.push({
                    nodeid: `tests/${testName}.ts::${testName}`,
                    name: testName,
                    outcome: 'failed',
                    duration: testDuration,
                    error: error.message || 'Test failed',
                });

                summary.failed++;
                exitCode = 1;

                // Clean up temp file if exists
                const tempTestFile = path.join(testDir, `_temp_${testName}.ts`);
                if (fs.existsSync(tempTestFile)) {
                    fs.unlinkSync(tempTestFile);
                }
            }
        }

        summary.total = tests.length;

    } catch (error: any) {
        stderr += error.message;
        exitCode = 1;
        summary.errors++;
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log(`\n${repositoryName} Summary:`);
    console.log(`  Total: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Duration: ${duration.toFixed(2)}s\n`);

    return {
        success: exitCode === 0,
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
function getGitInfo(): { commit: string; branch: string } {
    try {
        const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        return { commit, branch };
    } catch {
        return { commit: 'unknown', branch: 'unknown' };
    }
}

/**
 * Get TypeScript version
 */
function getTypeScriptVersion(): string {
    try {
        const version = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
        return version.replace('Version ', '');
    } catch {
        return 'unknown';
    }
}

/**
 * Generate UUID-like run ID
 */
function generateRunId(): string {
    return Math.random().toString(36).substring(2, 10);
}

/**
 * Main evaluation function
 */
async function main() {
    const args = process.argv.slice(2);
    const outputFlag = args.indexOf('--output');
    const customOutput = outputFlag !== -1 ? args[outputFlag + 1] : null;

    const targetArg = args.find(arg => arg.startsWith('--target='));
    const target = targetArg ? targetArg.split('=')[1] : 'all';

    const noReport = args.includes('--no-report');

    const startAll = new Date();
    const runId = generateRunId();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`EVALUATION RUN ID: ${runId}`);
    console.log(`Started at: ${startAll.toISOString()}`);
    console.log(`Target: ${target}`);
    console.log(`${'='.repeat(60)}\n`);

    const baseDir = process.cwd();
    let resBefore: RepositoryTestResult | null = null;
    let resAfter: RepositoryTestResult | null = null;

    // Run tests based on target
    if (target === 'all' || target === 'repository_before') {
        console.log('Running repository_before tests...');
        resBefore = await runTestsAndParse('repository_before', 'repository_before');
    }

    if (target === 'all' || target === 'repository_after') {
        console.log('Running repository_after tests...');
        resAfter = await runTestsAndParse('repository_after', 'repository_after');
    }

    const finishedAt = new Date();
    const gitInfo = getGitInfo();

    // Helper to calculate pass rate safely
    const calculatePassRate = (res: RepositoryTestResult | null) =>
        (res && res.summary.total > 0) ? (res.summary.passed / res.summary.total) * 100 : 0;

    const beforePassRate = calculatePassRate(resBefore);
    const afterPassRate = calculatePassRate(resAfter);

    const improvement = afterPassRate - beforePassRate;

    // Determine overall success
    let overallSuccess = false;
    if (target === 'repository_before' && resBefore) {
        overallSuccess = resBefore.success;
    } else if (target === 'repository_after' && resAfter) {
        overallSuccess = resAfter.success;
    } else if (target === 'all' && resAfter) {
        // For 'all' (evaluation), we consider it a success if repository_after passes
        // We expect repository_before to potentially fail
        overallSuccess = resAfter.success;
    }

    // Generate report object
    const report: EvaluationReport = {
        run_id: runId,
        started_at: startAll.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: (finishedAt.getTime() - startAll.getTime()) / 1000,
        success: overallSuccess,
        error: null,
        environment: {
            node_version: process.version,
            typescript_version: getTypeScriptVersion(),
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
            comparison: (resBefore && resAfter) ? {
                before_tests_passed: resBefore.success,
                after_tests_passed: resAfter.success,
                before_total: resBefore.summary.total,
                before_passed: resBefore.summary.passed,
                before_failed: resBefore.summary.failed + resBefore.summary.errors,
                after_total: resAfter.summary.total,
                after_passed: resAfter.summary.passed,
                after_failed: resAfter.summary.failed + resAfter.summary.errors,
                improvement_percentage: improvement,
            } : null,
        },
    };

    let reportPath = 'SKIPPED';
    if (!noReport) {
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

    console.log(`Results:`);
    if (resBefore) {
        console.log(`  repository_before: ${resBefore.summary.passed}/${resBefore.summary.total} passed`);
    } else {
        console.log(`  repository_before: SKIPPED`);
    }

    if (resAfter) {
        console.log(`  repository_after:  ${resAfter.summary.passed}/${resAfter.summary.total} passed`);
    } else {
        console.log(`  repository_after:  SKIPPED`);
    }

    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);

    if (!noReport) {
        console.log(`Report generated at: ${reportPath}\n`);
    } else {
        console.log(`Report generation skipped (--no-report)\n`);
    }

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
}

// Run main function
main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
});
