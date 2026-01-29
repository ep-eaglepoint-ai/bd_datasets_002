import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import * as os from "os";
import * as crypto from "crypto";

const ROOT = path.resolve(__dirname, "..");
const REPORTS = path.join(ROOT, "evaluation", "reports");

interface TestResult {
  passed: boolean;
  return_code: number;
  output: string;
}

interface Metrics {
  ts_file_count: number;
  lines_of_code: number;
  error?: string;
}

interface EvaluationResult {
  tests: TestResult;
  metrics: Metrics;
}

const environmentInfo = () => ({
  node_version: process.version,
  platform: os.platform() + " " + os.release(),
});

const runTest = async (target: string): Promise<TestResult> => {
  // Run test_requirements.ts directly with the appropriate TARGET env var
  const cmd = `npx ts-node tests/test_requirements.ts`;

  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      {
        cwd: ROOT,
        timeout: 300000,
        env: { ...process.env, TARGET: target },
      },
      (error, stdout, stderr) => {
        const output = stdout + stderr;
        const truncatedOutput =
          output.length > 20000
            ? output.substring(0, 4000) +
              "\n...[truncated]...\n" +
              output.substring(output.length - 16000)
            : output;

        resolve({
          passed: !error && (error === null || error === undefined),
          return_code: error ? error.code || 1 : 0,
          output: truncatedOutput,
        });
      },
    );
  });
};

const runMetrics = (repoPathStr: string): Metrics => {
  const metrics: Metrics = {
    ts_file_count: 0,
    lines_of_code: 0,
  };

  if (!fs.existsSync(repoPathStr)) {
    return metrics;
  }

  const traverse = (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (file.endsWith(".ts")) {
        metrics.ts_file_count++;
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          metrics.lines_of_code += content.split("\n").length;
        } catch (e) {
          // ignore
        }
      }
    }
  };

  try {
    traverse(repoPathStr);
  } catch (e: any) {
    metrics.error = e.message;
  }

  return metrics;
};

const evaluate = async (
  repoName: string,
  target: string,
): Promise<EvaluationResult> => {
  const repoPath = path.join(ROOT, repoName);
  const tests = await runTest(target);
  const metrics = runMetrics(repoPath);
  return { tests, metrics };
};

const parseTestOutput = (outputStr: string) => {
  // Parse output from test_requirements.ts
  // Look for "Passed: X/Y" pattern in TEST SUMMARY
  const summaryMatch = outputStr.match(/Passed:\s+(\d+)\/(\d+)/);

  if (summaryMatch) {
    const passed = parseInt(summaryMatch[1], 10);
    const total = parseInt(summaryMatch[2], 10);
    const failed = total - passed;
    return { passed, failed, total };
  }

  // Fallback: count PASS/FAIL lines
  const passMatches = outputStr.match(/PASS:/g);
  const failMatches = outputStr.match(/FAIL:/g);
  const passed = passMatches ? passMatches.length : 0;
  const failed = failMatches ? failMatches.length : 0;

  return {
    passed,
    failed,
    total: passed + failed,
  };
};

const printReport = (report: any, reportPath: string) => {
  console.log("=".repeat(60));
  console.log("EVALUATION RESULTS");
  console.log("=".repeat(60));
  console.log();
  console.log(`Run ID: ${report.run_id}`);
  console.log(`Duration: ${report.duration_seconds.toFixed(2)} seconds`);
  console.log();

  const testStats = parseTestOutput(report.tests.output);
  console.log("TEST RESULTS:");
  console.log(`  Tests execution passed (exit 0): ${report.tests.passed}`);
  console.log(`  Passed: ${testStats.passed}/${testStats.total}`);
  console.log(`  Failed: ${testStats.failed}/${testStats.total}`);
  console.log();
  console.log("=".repeat(60));
  console.log(`SUCCESS: ${report.success}`);
  console.log("=".repeat(60));
  console.log();
  console.log(`Report written to ${reportPath}`);
};

const main = async () => {
  const runId = crypto.randomUUID();
  const start = new Date();

  console.log("Running evaluation...");
  const result = await evaluate("repository_after", "after");

  // Pass logic: Tests must pass
  const passedGate = result.tests.passed;

  const end = new Date();
  const durationSeconds = (end.getTime() - start.getTime()) / 1000;

  const report = {
    run_id: runId,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: durationSeconds,
    environment: environmentInfo(),
    tests: result.tests,
    metrics: result.metrics,
    success: passedGate,
    error: null,
  };

  const dateStr = start.toISOString().split("T")[0];
  const timeStr = start.toISOString().split("T")[1].replace(/[:\.]/g, "-");
  const reportDir = path.join(REPORTS, dateStr, timeStr);

  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  printReport(report, reportPath);
  process.exit(report.success ? 0 : 1);
};

main();
