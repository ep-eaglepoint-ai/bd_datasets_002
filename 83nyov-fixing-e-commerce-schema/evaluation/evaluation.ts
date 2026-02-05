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
  prisma_file_count: number;
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

const runTests = async (repoName: string): Promise<TestResult> => {
  let cmd = "";
  let env = { ...process.env };

  if (repoName === "repository_before") {
    cmd = "npm run test:before";
    if (process.env.SCHEMA_PATH_BEFORE) {
      env["SCHEMA_PATH"] = process.env.SCHEMA_PATH_BEFORE;
    } else {
      // Fallback default
      env["SCHEMA_PATH"] = "repository_before/schema.prisma";
    }
  } else {
    cmd = "npm run test:after";
  }

  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      { cwd: ROOT, env, timeout: 120000 },
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
          return_code: error
            ? typeof error.code === "number"
              ? error.code
              : 1
            : 0,
          output: truncatedOutput,
        });
      },
    );
  });
};

const runMetrics = (repoPathStr: string): Metrics => {
  const metrics: Metrics = {
    prisma_file_count: 0,
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
      } else if (file.endsWith(".prisma")) {
        metrics.prisma_file_count++;
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

  // We pass the repoName to runTests to determine which npm script to run
  const tests = await runTests(repoName);
  const metrics = runMetrics(repoPath);
  return { tests, metrics };
};

// Helper for parsing jest output
const parseJestOutput = (outputStr: string, isBefore: boolean) => {
  let passed = 0;
  let failed = 0;
  let total = 0;

  // We want to capture the specific "Tests:" summary line.
  // Example: "Tests:       6 failed, 1 passed, 7 total"
  // Example: "Tests:       6 passed, 6 total"
  const summaryLineMatch = outputStr.match(/^Tests:\s+(.+)$/m);

  if (summaryLineMatch) {
    const line = summaryLineMatch[1];

    const passedMatch = line.match(/(\d+)\s+passed/);
    const failedMatch = line.match(/(\d+)\s+failed/);
    const totalMatch = line.match(/(\d+)\s+total/);

    if (passedMatch) passed = parseInt(passedMatch[1]);
    if (failedMatch) failed = parseInt(failedMatch[1]);
    if (totalMatch) total = parseInt(totalMatch[1]);
  } else {
    // Fallback: If no "Tests:" line found (e.g. hard crash or minimal output),
    // try to find global counts but be careful not to confuse Test Suites with Tests is hard without context.
    // However, if we didn't find the Tests line, maybe we iterate all numerical matches?
    // Let's rely on standard fallback for now
    if (outputStr.includes("FAIL") || outputStr.includes("failed")) {
      // If we can't parse numbers but it failed, assume 1 failed
      if (total === 0) {
        failed = 1;
        total = 1;
      }
    }
  }

  return { passed, failed, total };
};

const printReport = (report: any, reportPath: string) => {
  console.log("=".repeat(60));
  console.log("EVALUATION RESULTS");
  console.log("=".repeat(60));
  console.log();
  console.log(`Run ID: ${report.run_id}`);
  console.log(`Duration: ${report.duration_seconds.toFixed(2)} seconds`);
  console.log();

  const beforeStats = parseJestOutput(report.before.tests.output, true);
  console.log("BEFORE (repository_before):");
  console.log(`  Tests execution passed: ${report.before.tests.passed}`);
  console.log(
    `  Metrics: ${report.before.metrics.prisma_file_count} prisma files, ${report.before.metrics.lines_of_code} lines`,
  );
  console.log(
    `  Parsed Results: Passed: ${beforeStats.passed} | Failed: ${beforeStats.failed}`,
  );

  const afterStats = parseJestOutput(report.after.tests.output, false);
  console.log();
  console.log("AFTER (repository_after):");
  console.log(`  Tests execution passed: ${report.after.tests.passed}`);
  console.log(
    `  Metrics: ${report.after.metrics.prisma_file_count} prisma files, ${report.after.metrics.lines_of_code} lines`,
  );
  console.log(
    `  Parsed Results: Passed: ${afterStats.passed} | Failed: ${afterStats.failed}`,
  );
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

  // Pass logic: After tests must pass command execution and find at least 1 test passed
  const afterStats = parseJestOutput(after.tests.output, false);
  const passedGate =
    after.tests.passed && afterStats.passed > 0 && afterStats.failed === 0;

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

  // Save report
  const dateStr = start.toISOString().split("T")[0];
  const timeStr = start
    .toISOString()
    .split("T")[1]
    .replace(/[:\.]/g, "-")
    .split("Z")[0];
  const reportDir = path.join(REPORTS, dateStr, timeStr);

  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  printReport(report, reportPath);
  process.exit(report.success ? 0 : 1);
};

main();
