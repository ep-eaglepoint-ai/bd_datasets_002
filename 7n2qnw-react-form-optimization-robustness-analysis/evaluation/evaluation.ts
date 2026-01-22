import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

function generateRunId(): string {
    return 'run-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface TestResult {
    fullName: string;
    status: string;
    title: string;
    failureMessages: string[];
    location: any;
    duration?: number;
}

interface TestSummary {
    passed: boolean;
    return_code: number;
    output: string;
    summary: {
        numTotalTests: number;
        numPassedTests: number;
        numFailedTests: number;
        numTotalTestSuites: number;
        numPassedTestSuites: number;
        numFailedTestSuites: number;
    };
    tests: TestResult[];
    raw_output: string;
}

interface EvaluationReport {
    run_id: string;
    started_at: string;
    finished_at?: string;
    duration_seconds?: number;
    environment: {
        node_version: string;
        platform: string;
        arch: string;
    };
    before: TestSummary;
    after: TestSummary;
    comparison: {
        passed_gate: boolean;
    };
    success: boolean;
    error: string | null;
}

function runJest(target: 'repository_before' | 'repository_after'): TestSummary {
    const env = { ...process.env, REPO_PATH: target };
    const result = spawnSync('npx', ['jest', '--json', '--verbose'], {
        env,
        encoding: 'utf8',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdout = result.stdout || '';
    const returnCode = result.status || 0;

    let jsonResult: any = {};
    try {
        jsonResult = JSON.parse(stdout);
    } catch (e) {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { jsonResult = JSON.parse(jsonMatch[0]); } catch { jsonResult = { testResults: [] }; }
        } else { jsonResult = { testResults: [] }; }
    }

    const tests: TestResult[] = [];
    if (jsonResult.testResults) {
        for (const suite of jsonResult.testResults) {
            for (const assertion of suite.assertionResults || []) {
                tests.push({
                    fullName: assertion.fullName,
                    status: assertion.status,
                    title: assertion.title,
                    failureMessages: assertion.failureMessages || [],
                    location: assertion.location,
                    duration: assertion.duration
                });
            }
        }
    }

    return {
        passed: returnCode === 0,
        return_code: returnCode,
        output: "See raw_output for full details",
        summary: {
            numTotalTests: jsonResult.numTotalTests || 0,
            numPassedTests: jsonResult.numPassedTests || 0,
            numFailedTests: jsonResult.numFailedTests || 0,
            numTotalTestSuites: jsonResult.numTotalTestSuites || 0,
            numPassedTestSuites: jsonResult.numPassedTestSuites || 0,
            numFailedTestSuites: jsonResult.numFailedTestSuites || 0,
        },
        tests,
        raw_output: JSON.stringify(jsonResult)
    };
}

// Main execution
const start = new Date();
const report: EvaluationReport = {
    run_id: generateRunId(),
    started_at: start.toISOString(),
    environment: {
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch()
    },
    before: {} as any,
    after: {} as any,
    comparison: { passed_gate: false },
    success: false,
    error: null
};

try {
    console.log("Running before tests...");
    report.before = runJest('repository_before');

    console.log("Running after tests...");
    report.after = runJest('repository_after');

    // Comparison logic: before should fail, after should pass
    if (!report.before.passed && report.after.passed) {
        report.comparison.passed_gate = true;
        report.success = true;
    } else {
        report.comparison.passed_gate = false;
        report.success = false;
    }
} catch (e: any) {
    report.error = e.message;
    console.error("Evaluation failed:", e);
} finally {
    const end = new Date();
    report.finished_at = end.toISOString();
    report.duration_seconds = (end.getTime() - start.getTime()) / 1000;

    const dateStr = end.toISOString().split('T')[0];
    const timeStr = end.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const dirPath = path.join(__dirname, dateStr, timeStr);

    fs.mkdirSync(dirPath, { recursive: true });
    const reportPath = path.join(dirPath, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Report generated at: ${reportPath}`);
    console.log(report.success ? `Evaluation SUCCESS. Improvement detected.` : `Evaluation FAILED. Check report for details.`);

    // Always exit with code 0
    process.exit(0);
}
