import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import * as os from "os";

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

const runTests = async (): Promise<TestResult> => {
  // We are inside the 'test' or 'evaluation' container.
  // The command in docker-compose for 'test' runs both.
  // For evaluation, we want to run the tests and capture output.

  // We can try to run the testing command again here.
  // The repo is mounted at /app/repository_after
  // Tests are at /app/tests

  const cmd = `ln -sf /app/frontend_deps/node_modules /app/repository_after/frontend/node_modules && cp -r /app/tests /app/repository_after/frontend/tests && sed -i 's|../repository_after/frontend/src|../src|g' /app/repository_after/frontend/tests/frontend.test.ts && cd repository_after/frontend && npm test; cd ../.. && pytest tests`;

  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      { cwd: "/app", timeout: 120000 },
      (error, stdout, stderr) => {
        const output = stdout + stderr;
        console.log("----------------------------------------");
        console.log("RAW TEST OUTPUT DEBUG:");
        console.log(output);
        console.log("----------------------------------------");

        // Check success
        const isSuccess = !error;

        // Simple heuristic parsing
        // Pytest: "X passed"
        // Vitest: "X passed"

        resolve({
          passed: isSuccess,
          return_code: error ? error.code || 1 : 0,
          output: output,
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

  const traverse = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!file.startsWith(".") && file !== "node_modules") {
          traverse(fullPath);
        }
      } else if (
        file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".vue") ||
        file.endsWith(".py")
      ) {
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

const main = async () => {
  const start = new Date();

  console.log("Starting Evaluation...");

  // 1. Run Tests
  const testResult = await runTests();

  // 2. Metrics
  const metrics = runMetrics(path.join("/app", "repository_after"));

  const passed = testResult.passed;

  const report = {
    run_id: "eval-run",
    started_at: start.toISOString(),
    tests: testResult,
    metrics: metrics,
    success: passed,
  };

  // Print Report
  console.log("=".repeat(60));
  console.log("EVALUATION RESULTS");
  console.log("=".repeat(60));
  console.log(`Success: ${passed}`);
  console.log(`LOC: ${metrics.lines_of_code}`);
  console.log("=".repeat(60));

  // Save report
  const reportPath = path.join("/app/evaluation", "report.json");
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
  } catch (e) {
    console.error("Failed to save report", e);
  }

  if (!passed) {
    process.exit(1);
  }
};

main();
