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

const runTests = async (): Promise<TestResult> => {
  // Run npm test directly
  const cmd = `npm test`;

  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      { cwd: "/app", timeout: 120000 },
      (error, stdout, stderr) => {
        const output = stdout + stderr;
        const truncatedOutput =
          output.length > 20000
            ? output.substring(0, 4000) +
              "\n...[truncated]...\n" +
              output.substring(output.length - 16000)
            : output;

        console.log("----------------------------------------");
        console.log("RAW TEST OUTPUT DEBUG:");
        console.log(truncatedOutput);
        console.log("----------------------------------------");

        // Check for custom reporter output
        let passed = 0;
        let failed = 0;

        const passedMatch = output.match(/Passed: (\d+)/);
        if (passedMatch) passed = parseInt(passedMatch[1]);

        const failedMatch = output.match(/Failed: (\d+)/);
        if (failedMatch) failed = parseInt(failedMatch[1]);

        // Fallback: Check for standard Jest output
        if (!passedMatch) {
          const standardPassedMatch = output.match(/Tests:\s+(\d+)\s+passed/s);
          if (standardPassedMatch) passed = parseInt(standardPassedMatch[1]);

          const standardFailedMatch = output.match(
            /Tests:.*\s+(\d+)\s+failed/s,
          );
          if (standardFailedMatch) failed = parseInt(standardFailedMatch[1]);
        }

        const total = passed + failed;
        const isSuccess = !error && total > 0 && failed === 0;

        resolve({
          passed: isSuccess,
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

  // Custom reporter
  const passedMatch = outputStr.match(/Passed: (\d+)/);
  if (passedMatch) passed = parseInt(passedMatch[1]);

  const failedMatch = outputStr.match(/Failed: (\d+)/);
  if (failedMatch) failed = parseInt(failedMatch[1]);

  // Standard Jest fallback - sum all test suites
  if (!passedMatch) {
    // Match all occurrences of "Tests: X passed"
    const passedMatches = outputStr.matchAll(/Tests:\s+(\d+)\s+passed/g);
    for (const match of passedMatches) {
      passed += parseInt(match[1]);
    }

    const failedMatches = outputStr.matchAll(/Tests:.*?(\d+)\s+failed/g);
    for (const match of failedMatches) {
      failed += parseInt(match[1]);
    }
  }

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

  const afterStats = parseJestOutput(report.after.tests.output);
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
  // console.log(`Report written to ${reportPath}`);
};

const main = async () => {
  const runId = crypto.randomUUID();
  const start = new Date();

  const before = {
    tests: {
      passed: false,
      return_code: 1,
      output: "Skipped - repository_before is empty",
    },
    metrics: { ts_file_count: 0, lines_of_code: 0 },
  };

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

  try {
    const timeStr = start.toISOString().split("T")[1].replace(/[:\.]/g, "-");
    const reportDir = path.join(REPORTS, dateStr, timeStr);
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    printReport(report, reportPath);
  } catch (e) {
    console.error("Failed to write report file:", e);
    printReport(report, "stdout");
  }

  // Explicitly error if failed
  if (!report.success) {
    console.error("Evaluation Verification Failed.");
    process.exit(1);
  }
  process.exit(0);
};

main();
