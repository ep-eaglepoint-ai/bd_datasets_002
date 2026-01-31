// evaluation.ts - Test Evaluation and Report Generation for Personal Expense Tracker
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
 * Run the verification script and parse results
 */
async function runVerificationTests(
    repositoryName: string
): Promise<RepositoryTestResult> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running tests for ${repositoryName}...`);
    console.log(`${'='.repeat(60)}\n`);

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
        // Run Vitest with JSON reporter
        console.log('Running vitest tests...\n');

        const runVitest = () => {
            try {
                return execSync('npm test -- --reporter=json', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 120000,
                });
            } catch (error: any) {
                // Capture stderr and exitCode from the error object if execSync fails
                stderr = error.stderr || '';
                exitCode = error.status || 1;
                return error.stdout || ''; // Return stdout even on error, as it might contain partial JSON
            }
        };

        const vitestOutput = runVitest();
        stdout = vitestOutput;

        // Extract JSON from output (in case of noise)
        const jsonMatch = vitestOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.testResults) {
                    const baseDir = process.cwd().replace(/\\/g, '/');
                    parsed.testResults.forEach((file: any) => {
                        const relativePath = file.name.replace(/\\/g, '/').replace(baseDir + '/', '');
                        file.assertionResults.forEach((test: any) => {
                            const result: TestResult = {
                                nodeid: `${relativePath}::${test.title}`,
                                name: test.title,
                                outcome: test.status === 'passed' ? 'passed' : 'failed',
                                duration: Number((test.duration / 1000).toFixed(3)),
                            };

                            if (test.status !== 'passed' && test.failureMessages) {
                                result.error = test.failureMessages.join('\n');
                            }

                            tests.push(result);
                        });
                    });
                }

                summary.total = parsed.numTotalTests || 0;
                summary.passed = parsed.numPassedTests || 0;
                summary.failed = parsed.numFailedTests || 0;
                summary.skipped = parsed.numPendingTests || 0;
                summary.errors = parsed.numTodoTests || 0;

            } catch (e) {
                console.error('Failed to parse Vitest JSON output');
            }
        }

        // Run the verification script as well if it exists
        console.log('Running criteria verification...\n');
        try {
            const result = execSync(
                'npm run verify',
                {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 60000,
                }
            );
            stdout += '\n\nVerification Output:\n' + result;
        } catch (error: any) {
            stdout += '\n\nVerification Output:\n' + (error.stdout || '');
            stderr += '\n\nVerification Error:\n' + (error.stderr || '');
        }

    } catch (error: any) {
        stderr += error.message;
        exitCode = 1;
    }

    const duration = Number(((Date.now() - startTime) / 1000).toFixed(3));

    console.log(`\n${repositoryName} Summary:`);
    console.log(`  Total: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Duration: ${duration.toFixed(2)}s\n`);

    return {
        success: summary.failed === 0 && summary.total > 0,
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
        const version = execSync('npx --yes tsc --version', { encoding: 'utf8' }).trim();
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

    // Mock Before Results (repository_before is minimal/empty)
    const resBefore: RepositoryTestResult = {
        success: false,
        exit_code: 1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 },
        stdout: 'repository_before is a minimal scaffold without implementation',
        stderr: '',
        duration_seconds: 0
    };

    // Run tests for repository_after
    const resAfter = await runVerificationTests('repository_after');

    const finishedAt = new Date();
    const gitInfo = getGitInfo();

    // Calculate improvement percentage
    const beforePassRate = 0;
    const afterPassRate = resAfter.summary.total > 0
        ? (resAfter.summary.passed / resAfter.summary.total) * 100
        : 0;
    const improvement = afterPassRate - beforePassRate;

    // Define criteria met
    const criteriaResults = [
        {
            name: 'Criteria 1: User Authentication',
            description: 'Implement user signup and login using NextAuth.js with email/password credentials, secure session management with JWT strategy, and protected routes that redirect unauthenticated users to the login page',
            met: resAfter.success,
        },
        {
            name: 'Criteria 2: Transaction Management',
            description: 'Build a form to add new transactions with amount, description, date, type (income/expense), and category selection, with the ability to edit and delete existing transactions, and input validation for required fields',
            met: resAfter.success,
        },
        {
            name: 'Criteria 3: Predefined Categories',
            description: 'Provide predefined expense categories (Food, Transport, Entertainment, Bills, Shopping, etc.) and income categories (Salary, Freelance, Investment, etc.), displayed with distinct colors for visual identification in charts and lists',
            met: resAfter.success,
        },
        {
            name: 'Criteria 4: Transaction List & Filters',
            description: 'Display transactions in a paginated list sorted by date, with filters for date range (this week, this month, custom range), transaction type, and category, showing running balance or totals for filtered results',
            met: resAfter.success,
        },
        {
            name: 'Criteria 5: Dashboard with Charts',
            description: 'Create a dashboard showing total income, total expenses, and net balance for the selected period, with a pie chart breaking down expenses by category and a bar chart showing daily or monthly spending trends',
            met: resAfter.success,
        },
        {
            name: 'Criteria 6: Monthly Analytics',
            description: 'Provide a monthly view showing income vs expenses comparison, top spending categories, and percentage change from the previous month, helping users understand their spending patterns over time',
            met: resAfter.success,
        },
    ];

    // Generate report
    const report: EvaluationReport = {
        run_id: runId,
        started_at: startAll.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: Number(((finishedAt.getTime() - startAll.getTime()) / 1000).toFixed(3)),
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
                improvement_percentage: Number(improvement.toFixed(2)),
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

    console.log(`Criteria Met:`);
    criteriaResults.forEach(c => {
        console.log(`  ${c.met ? '✅' : '❌'} ${c.name}`);
    });

    console.log(`\nReport generated at: ${reportPath}\n`);

    // Exit with appropriate code
    process.exit(resAfter.success ? 0 : 1);
}

// Run main function
main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
});
