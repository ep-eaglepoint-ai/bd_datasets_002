import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';

interface Test {
    class: string;
    name: string;
    status: string;
    full_name: string;
}

interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    xfailed: number;
    errors: number;
    skipped: number;
}

interface TestResults {
    success: boolean;
    exit_code: number;
    tests: Test[];
    summary: TestSummary;
}

interface ComparisonResults {
    before_tests_passed: boolean;
    after_tests_passed: boolean;
    before_total: number;
    before_passed: number;
    before_failed: number;
    before_xfailed: number;
    before_skipped: number;
    before_errors: number;
    after_total: number;
    after_passed: number;
    after_failed: number;
    after_xfailed: number;
    after_skipped: number;
    after_errors: number;
    improvement: {
        tests_fixed: number;
        features_added: number;
    };
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
        platform: string;
        os: string;
        architecture: string;
        hostname: string;
    };
    results: {
        before: TestResults;
        after: TestResults;
        comparison: ComparisonResults;
    };
}

function extractClassName(fullName: string): string {
    // Extract class name from full test name
    // Format is typically "CategoryForm Static Analysis <test name>"
    const match = fullName.match(/^(.+?)\s+(?:>>|›)\s+/);
    if (match) {
        return match[1];
    }

    // Alternative format: extract from describe block
    const parts = fullName.split(' ');
    if (parts.length > 2) {
        // Return first few words as class name
        return parts.slice(0, Math.min(3, parts.length - 1)).join(' ');
    }

    return 'CategoryForm Static Analysis';
}

function extractTestName(fullName: string): string {
    // Extract the actual test name from full name
    const match = fullName.match(/(?:>>|›)\s+(.+)$/);
    if (match) {
        return match[1];
    }
    return fullName;
}

function runJest(target: 'repository_before' | 'repository_after'): TestResults {
    const env = { ...process.env, REPO_PATH: target };
    const result = spawnSync('npx', ['jest', '--json', '--verbose'], {
        env,
        encoding: 'utf8',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdout = result.stdout || '';
    const exitCode = result.status || 0;

    let jsonResult: any = {};
    try {
        jsonResult = JSON.parse(stdout);
    } catch (e) {
        // Try to extract JSON from stdout
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                jsonResult = JSON.parse(jsonMatch[0]);
            } catch {
                jsonResult = { testResults: [] };
            }
        } else {
            jsonResult = { testResults: [] };
        }
    }

    const tests: Test[] = [];

    if (jsonResult.testResults) {
        for (const suite of jsonResult.testResults) {
            for (const assertion of suite.assertionResults || []) {
                const fullName = assertion.fullName || assertion.title || '';
                const className = extractClassName(fullName);
                const testName = extractTestName(assertion.title || fullName);

                tests.push({
                    class: className,
                    name: testName,
                    status: assertion.status || 'unknown',
                    full_name: `${className}::${testName}`
                });
            }
        }
    }

    // Calculate summary
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped' || t.status === 'pending').length;
    const xfailed = 0; // Jest doesn't have xfailed, but keeping for compatibility
    const errors = 0; // Track separately if needed

    return {
        success: exitCode === 0,
        exit_code: exitCode,
        tests,
        summary: {
            total: tests.length,
            passed,
            failed,
            xfailed,
            errors,
            skipped
        }
    };
}

function generateComparison(before: TestResults, after: TestResults): ComparisonResults {
    // Calculate tests fixed
    const beforeFailedTests = new Set(
        before.tests.filter(t => t.status === 'failed').map(t => t.full_name)
    );
    const afterPassedTests = new Set(
        after.tests.filter(t => t.status === 'passed').map(t => t.full_name)
    );

    // Tests that were failing before and now pass
    const testsFixed = [...beforeFailedTests].filter(name => afterPassedTests.has(name)).length;

    // Features added (tests that pass in after)
    const featuresAdded = after.summary.passed;

    return {
        before_tests_passed: before.success,
        after_tests_passed: after.success,
        before_total: before.summary.total,
        before_passed: before.summary.passed,
        before_failed: before.summary.failed,
        before_xfailed: before.summary.xfailed,
        before_skipped: before.summary.skipped,
        before_errors: before.summary.errors,
        after_total: after.summary.total,
        after_passed: after.summary.passed,
        after_failed: after.summary.failed,
        after_xfailed: after.summary.xfailed,
        after_skipped: after.summary.skipped,
        after_errors: after.summary.errors,
        improvement: {
            tests_fixed: testsFixed,
            features_added: featuresAdded
        }
    };
}

// Main execution
const start = new Date();
const report: EvaluationReport = {
    run_id: randomUUID(),
    started_at: start.toISOString(),
    finished_at: '',
    duration_seconds: 0,
    success: false,
    error: null,
    environment: {
        node_version: process.version,
        platform: os.platform(),
        os: `${os.type()}-${os.release()}-${os.arch()}`,
        architecture: os.arch(),
        hostname: os.hostname()
    },
    results: {
        before: {} as TestResults,
        after: {} as TestResults,
        comparison: {} as ComparisonResults
    }
};

try {
    console.log("Running tests on repository_before...");
    report.results.before = runJest('repository_before');

    console.log("Running tests on repository_after...");
    report.results.after = runJest('repository_after');

    // Generate comparison
    report.results.comparison = generateComparison(report.results.before, report.results.after);

    // Determine overall success
    // Success if: before fails AND after passes
    if (!report.results.before.success && report.results.after.success) {
        report.success = true;
        console.log("✓ Evaluation SUCCESS: Tests fixed!");
    } else if (report.results.before.success && report.results.after.success) {
        report.success = true;
        console.log("✓ Evaluation SUCCESS: All tests passing in both repositories");
    } else {
        report.success = false;
        console.log("✗ Evaluation FAILED: Expected improvement not detected");
    }
} catch (e: any) {
    report.error = e.message;
    console.error("Evaluation failed:", e);
} finally {
    const end = new Date();
    report.finished_at = end.toISOString();
    report.duration_seconds = parseFloat(((end.getTime() - start.getTime()) / 1000).toFixed(3));

    // Create directory structure: evaluation/YYYY-MM-DD/HH-MM-SS/
    const dateStr = end.toISOString().split('T')[0];
    const timeStr = end.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const dirPath = path.join(__dirname, dateStr, timeStr);

    fs.mkdirSync(dirPath, { recursive: true });
    const reportPath = path.join(dirPath, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nReport generated at: ${reportPath}`);
    console.log(`Duration: ${report.duration_seconds}s`);
    console.log(`Tests fixed: ${report.results.comparison.improvement.tests_fixed}`);
    console.log(`Features added: ${report.results.comparison.improvement.features_added}`);

    // Always exit with code 0
    process.exit(0);
}
