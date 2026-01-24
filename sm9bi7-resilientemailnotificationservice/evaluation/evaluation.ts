import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

interface TestResult {
    passed: boolean;
    return_code: number;
    output: string;
}

interface RepositoryResult {
    tests: TestResult;
    metrics: Record<string, number | boolean>;
}

interface Comparison {
    passed_gate: boolean;
    improvement_summary: string;
}

interface EvaluationReport {
    run_id: string;
    started_at: string;
    finished_at: string;
    duration_seconds: number;
    environment: {
        node_version: string;
        platform: string;
    };
    before: RepositoryResult;
    after: RepositoryResult;
    comparison: Comparison;
    success: boolean;
    error: string | null;
}

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo(): { node_version: string; platform: string } {
    return {
        node_version: process.version,
        platform: `${process.platform}-${process.arch}`
    };
}

async function runTests(repoName: string): Promise<TestResult> {
    try {
        // Use cross-platform environment variable setting
        const isWindows = process.platform === 'win32';
        let testCommand: string;
        
        if (repoName === 'repository_before') {
            testCommand = isWindows 
                ? 'set REPO=before && npm test'
                : 'REPO=before npm test';
        } else if (repoName === 'repository_after') {
            testCommand = isWindows
                ? 'set REPO=after && npm test'
                : 'REPO=after npm test';
        } else {
            testCommand = 'npm test';
        }

        const { stdout, stderr } = await execAsync(testCommand, {
            cwd: ROOT,
            timeout: 300000, // 5 minutes
            maxBuffer: 10 * 1024 * 1024 // 10MB
        });

        const output = (stdout + stderr).substring(0, 8000);
        return {
            passed: true,
            return_code: 0,
            output: output
        };
    } catch (error: any) {
        const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');
        const returnCode = error.code || (error.signal ? -1 : 1);
        return {
            passed: false,
            return_code: returnCode,
            output: output.substring(0, 8000)
        };
    }
}

 

async function evaluate(repoName: string): Promise<RepositoryResult> {
    const tests = await runTests(repoName);
     
    return {
        tests,
        metrics: {}
    };
}

async function runEvaluation(): Promise<EvaluationReport> {
    const runId = uuidv4();
    const start = new Date();
    const startedAt = start.toISOString();

    try {
        const before = await evaluate('repository_before');
        const after = await evaluate('repository_after');

        // Determine improvement summary
        let improvementSummary: string;
        if (after.tests.passed && !before.tests.passed) {
            improvementSummary = 'After implementation passed all tests (before implementation did not)';
        } else if (after.tests.passed && before.tests.passed) {
            improvementSummary = 'Both implementations passed tests';
        } else if (!after.tests.passed && !before.tests.passed) {
            improvementSummary = 'Both implementations failed tests';
        } else {
            improvementSummary = 'After implementation failed tests (regression)';
        }

        const comparison: Comparison = {
            passed_gate: after.tests.passed,
            improvement_summary: improvementSummary
        };

        const end = new Date();
        const finishedAt = end.toISOString();
        const durationSeconds = (end.getTime() - start.getTime()) / 1000;

        return {
            run_id: runId,
            started_at: startedAt,
            finished_at: finishedAt,
            duration_seconds: durationSeconds,
            environment: environmentInfo(),
            before,
            after,
            comparison,
            success: comparison.passed_gate,
            error: null
        };
    } catch (error: any) {
        const end = new Date();
        const finishedAt = end.toISOString();
        const durationSeconds = (end.getTime() - start.getTime()) / 1000;

        return {
            run_id: runId,
            started_at: startedAt,
            finished_at: finishedAt,
            duration_seconds: durationSeconds,
            environment: environmentInfo(),
            before: {
                tests: { passed: false, return_code: -1, output: '' },
                metrics: {}
            },
            after: {
                tests: { passed: false, return_code: -1, output: '' },
                metrics: {}
            },
            comparison: {
                passed_gate: false,
                improvement_summary: 'Evaluation crashed'
            },
            success: false,
            error: error.message || String(error)
        };
    }
}

async function main(): Promise<number> {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS)) {
        fs.mkdirSync(REPORTS, { recursive: true });
    }

    try {
        const report = await runEvaluation();

        // Create timestamped directory: yyyy-mm-dd/hr-min/
        const now = new Date();
        const dateDir = now.toISOString().substring(0, 10); // yyyy-mm-dd
        const timeDir = `${String(now.getUTCHours()).padStart(2, '0')}-${String(now.getUTCMinutes()).padStart(2, '0')}`; // hr-min
        const reportDir = path.join(REPORTS, dateDir, timeDir);
        
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Write report to timestamped location
        const reportPath = path.join(reportDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`Report written to ${reportPath}`);



        console.log(`Success: ${report.success}`);

        return report.success ? 0 : 1;
    } catch (error: any) {
        console.error(`Evaluation failed: ${error.message || error}`);
        return 1;
    }
}

// Export for testing
export { runEvaluation };
export type { EvaluationReport, TestResult, RepositoryResult, Comparison };

// Run if called directly
main()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
