
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
// Removed uuid import to avoid dependency issues

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
    passed: boolean; // Computed based on return code
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
    raw_output: string; // The JSON output from Jest
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
    // Run jest with --json to get structured output. 
    // We also capture stdout/stderr for the 'output' field (human readable).
    // Note: --verbose is for human readable, --json gives the data. 
    // We might need two runs or just use the json output for stats and recreate the human output.
    // For simplicity, let's run it once with --json and use the json for everything.

    // Actually, user wants "output" field to look like the console output.
    // Jest's --json outputs the json to stdout.

    let stdout = '';
    let returnCode = 0;

    try {
        stdout = execSync('npx jest --json --verbose', { env, encoding: 'utf8' });
    } catch (e: any) {
        stdout = e.stdout || '';
        returnCode = e.status || 1;
    }

    // output seems to capture the JSON. We need the json content.
    // Jest with --json prints JSON to stdout. 

    let jsonResult: any = {};
    try {
        jsonResult = JSON.parse(stdout);
    } catch (e) {
        console.error("Failed to parse Jest JSON output", stdout);
        jsonResult = { testResults: [] };
    }

    // Extract tests
    const tests: TestResult[] = [];
    if (jsonResult.testResults) {
        for (const suite of jsonResult.testResults) {
            for (const assertion of suite.assertionResults) {
                tests.push({
                    fullName: assertion.fullName,
                    status: assertion.status,
                    title: assertion.title,
                    failureMessages: assertion.failureMessages,
                    location: assertion.location,
                    duration: assertion.duration
                });
            }
        }
    }

    return {
        passed: returnCode === 0,
        return_code: returnCode,
        output: "See raw_output for full details", // We verify via JSON, text output is less critical if we have the structured data
        summary: {
            numTotalTests: jsonResult.numTotalTests || 0,
            numPassedTests: jsonResult.numPassedTests || 0,
            numFailedTests: jsonResult.numFailedTests || 0,
            numTotalTestSuites: jsonResult.numTotalTestSuites || 0,
            numPassedTestSuites: jsonResult.numPassedTestSuites || 0,
            numFailedTestSuites: jsonResult.numFailedTestSuites || 0,
        },
        summary_matrix: [[jsonResult.numPassedTests || 0, jsonResult.numFailedTests || 0]],
        tests: tests,
        raw_output: JSON.stringify(jsonResult)
    } as any;
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
    comparison: {
        passed_gate: false
    },
    success: false,
    error: null
};

try {
    console.log("Running before tests...");
    report.before = runJest('repository_before');

    console.log("Running after tests...");
    report.after = runJest('repository_after');

    // Comparison logic
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

    // Create directory
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const dirPath = path.join(__dirname, dateStr, timeStr);

    fs.mkdirSync(dirPath, { recursive: true });

    const reportPath = path.join(dirPath, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Report generated at: ${reportPath}`);
    // console.log(JSON.stringify(report, null, 2)); // Suppressed as per user request

    if (report.success) {
        console.log(`Evaluation SUCCESS. Improvement detected.`);
    } else {
        console.log(`Evaluation FAILED. Check report for details.`);
    }
}
