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

const runTests = async (
  testPath: string = "tests/test_requirements.test.ts",
): Promise<TestResult> => {
  const cmd = `npx jest ${testPath} --no-cache --reporters ./tests/custom_reporter.js`;

  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      { cwd: ROOT, timeout: 120000 },
      (error, stdout, stderr) => {
        const output = stdout + stderr;
        const truncatedOutput =
          output.length > 20000
            ? output.substring(0, 4000) +
              "\n...[truncated]...\n" +
              output.substring(output.length - 16000)
            : output;

        resolve({
          passed: !error,
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
        if (!file.startsWith(".") && file !== "node_modules") {
          traverse(fullPath);
        }
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
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

const evaluate = async (repoName: string): Promise<EvaluationResult> => {
  const repoPath = path.join(ROOT, repoName);

  const tests = await runTests();
  const metrics = runMetrics(repoPath);
  return { tests, metrics };
};

const parseJestOutput = (outputStr: string) => {
  let passed = 0;
  let failed = 0;

  const passedMatch = outputStr.match(/Passed: (\d+)/);
  if (passedMatch) passed = parseInt(passedMatch[1]);

  const failedMatch = outputStr.match(/Failed: (\d+)/);
  if (failedMatch) failed = parseInt(failedMatch[1]);

  return { passed, failed, total: passed + failed };
};

const printReport = (report: any, reportPath: string) => {
  console.log("=".repeat(60));
  console.log("EVALUATION RESULTS");
  console.log("=".repeat(60));
  console.log();
  console.log(`Run ID: ${report.run_id}`);
  console.log(`Duration: ${report.duration_seconds.toFixed(2)} seconds`);
  console.log();

  const beforeStats = parseJestOutput(report.before.tests.output);
  console.log("BEFORE (repository_before):");
  console.log(`  Tests passed: ${report.before.tests.passed}`);
  console.log(
    `  Passed: ${beforeStats.passed} | Failed: ${beforeStats.failed}`,
  );

  const afterStats = parseJestOutput(report.after.tests.output);
  console.log();
  console.log("AFTER (repository_after):");
  console.log(`  Tests passed: ${report.after.tests.passed}`);
  console.log(`  Passed: ${afterStats.passed} | Failed: ${afterStats.failed}`);
  console.log();
  console.log("COMPARISON:");
  console.log(`  Passed gate: ${report.comparison.passed_gate}`);
  console.log(`  Summary: ${report.comparison.improvement_summary}`);
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

  const before = await evaluate("repository_before");
  const after = await evaluate("repository_after");

  const passedGate = after.tests.passed;

  const comparison = {
    passed_gate: passedGate,
    improvement_summary: passedGate
      ? "Verification of requirements passed"
      : "Verification failed",
  };

  const end = new Date();
  const durationSeconds = (end.getTime() - start.getTime()) / 1000;

  const report = {
    run_id: runId,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: durationSeconds,
    environment: environmentInfo(),
    before,
    after,
    comparison,
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
