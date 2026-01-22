// evaluation.ts - Test Evaluation and Report Generation
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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
        before: RepositoryTestResult;
        after: RepositoryTestResult;
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
        };
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
            .filter(file => file.endsWith('.ts') && file.startsWith('test') && !file.includes('runner'));

        console.log(`Found ${testFiles.length} test files\n`);

        // Run each test file individually to get granular results
        for (const testFile of testFiles) {
            const testName = path.basename(testFile, '.ts');
            // Check for valid test files (start with test-)
            if (!testName.startsWith('test-')) continue;

            console.log(`Running ${testName}...`);
            const fullPath = path.join(testDir, testFile);

            try {
                // We use tsx directly on the file. No need to modify imports as our utils handle paths dynamically.
                const testStartTime = Date.now();

                // Run test with tsx (npx tsx <file>)
                const result = execSync(
                    `npx tsx "${fullPath}"`,
                    {
                        cwd: testDir, // Run from tests dir to ensure relative paths in utils work if needed
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe'],
                        timeout: 60000,
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

            } catch (error: any) {
                const testDuration = 0; // Capture actual if possible, but complex with sync throw

                stderr += error.stderr || error.stdout || error.message;
                console.log(`  ❌ FAILED\n`);
                console.log(error.stderr || error.stdout);

                tests.push({
                    nodeid: `tests/${testName}.ts::${testName}`,
                    name: testName,
                    outcome: 'failed',
                    duration: testDuration,
                    error: error.message || 'Test failed',
                });

                summary.failed++;
                exitCode = 1;
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

    const startAll = new Date();
    const runId = generateRunId();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`EVALUATION RUN ID: ${runId}`);
    console.log(`Started at: ${startAll.toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    const baseDir = process.cwd();

    // Mock Before Results (Since repository_before doesn't exist/matter here)
    const resBefore: RepositoryTestResult = {
        success: true,
        exit_code: 0,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 },
        stdout: '',
        stderr: '',
        duration_seconds: 0
    };

    // Run tests for repository_after
    const resAfter = await runTestsAndParse('repository_after', 'repository_after');

    const finishedAt = new Date();
    const gitInfo = getGitInfo();

    // Calculate improvement percentage
    const beforePassRate = 0; // 0/0
    const afterPassRate = resAfter.summary.total > 0
        ? (resAfter.summary.passed / resAfter.summary.total) * 100
        : 0;
    const improvement = afterPassRate - beforePassRate;

    // Generate report
    const report: EvaluationReport = {
        run_id: runId,
        started_at: startAll.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: (finishedAt.getTime() - startAll.getTime()) / 1000,
        success: resAfter.success,
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

    // Determine output path
    let reportPath: string;
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

    console.log(`\n${'='.repeat(60)}`);
    console.log(`EVALUATION COMPLETE`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`Report Summary:`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Duration: ${report.duration_seconds.toFixed(2)}s`);
    console.log(`  Overall Success: ${report.success ? '✅ YES' : '❌ NO'}\n`);

    console.log(`Results:`);
    console.log(`  repository_before: ${resBefore.summary.passed}/${resBefore.summary.total} passed`);
    console.log(`  repository_after:  ${resAfter.summary.passed}/${resAfter.summary.total} passed`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);

    console.log(`Report generated at: ${reportPath}\n`);

    // Exit with appropriate code
    process.exit(resAfter.success ? 0 : 1);
}

// Run main function
main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
});
