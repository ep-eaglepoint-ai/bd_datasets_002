import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateRunId() {
  return Math.random().toString(36).substring(2, 10);
}

function getGitInfo() {
  const gitInfo = { git_commit: "unknown", git_branch: "unknown" };
  try {
    gitInfo.git_commit = execSync("git rev-parse HEAD 2>/dev/null", {
      encoding: "utf8",
    }).trim();
    gitInfo.git_branch = execSync(
      "git rev-parse --abbrev-ref HEAD 2>/dev/null",
      { encoding: "utf8" },
    ).trim();
  } catch (e) {
    // Ignore git errors
  }
  return gitInfo;
}

function runJestTests(testProject, testName, expectSuccess = true) {
  console.log("\n" + "=".repeat(60));
  console.log(`RUNNING TESTS: ${testName}`);
  console.log(`Expected outcome: ${expectSuccess ? "PASS" : "FAIL"}`);
  console.log("=".repeat(60));

  // When running in Docker, __dirname is /app/evaluation
  // So we need to go up one level to get to /app, then into the test project
  const projectDir = path.join(__dirname, "..", testProject);

  console.log(`Project directory: ${projectDir}`);
  console.log(`Current working directory: ${process.cwd()}`);

  try {
    // Check if node_modules exists, if not install
    const nodeModulesPath = path.join(projectDir, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      console.log("Installing dependencies...");
      try {
        execSync("npm install", {
          cwd: projectDir,
          encoding: "utf8",
          stdio: "inherit",
        });
      } catch (err) {
        console.error("Failed to install dependencies:", err.message);
        throw err;
      }
    } else {
      console.log("Dependencies already installed.");
    }

    // Run Jest with JSON reporter
    console.log("Running Jest tests...");
    let output = "";
    let stderr = "";

    try {
      const result = spawnSync("npx", ["jest", "--json", "--runInBand"], {
        cwd: projectDir,
        encoding: "utf8",
        env: {
          ...process.env,
          CI: "true",
          NODE_OPTIONS: "--experimental-vm-modules",
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      output = result.stdout || "";
      stderr = result.stderr || "";

      // Jest outputs JSON to stdout
      if (!output && result.status !== 0) {
        console.log("Jest stderr:", stderr);
      }
    } catch (err) {
      console.error("Jest execution error:", err.message);
      output = err.stdout || "";
      stderr = err.stderr || "";
    }

    return parseJestOutput(output, testName, expectSuccess);
  } catch (err) {
    console.error("\nERROR:", err.message);
    if (err.stderr) console.error("STDERR:", err.stderr);

    return {
      success: false,
      exit_code: 1,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
      error: err.message,
      stdout: "",
      stderr: err.stderr || "",
    };
  }
}

function parseJestOutput(output, testName, expectSuccess) {
  let parsed = null;
  let tests = [];
  let passed = 0;
  let failed = 0;
  let total = 0;
  let skipped = 0;

  try {
    // Jest outputs some warnings before the JSON, find the JSON part
    const jsonStart = output.indexOf("{");
    if (jsonStart !== -1) {
      const jsonStr = output.substring(jsonStart);
      parsed = JSON.parse(jsonStr);
    }
  } catch (e) {
    console.error("Failed to parse Jest JSON output:", e.message);
    console.error("Raw output (first 1000 chars):", output.substring(0, 1000));
  }

  if (parsed && parsed.testResults) {
    parsed.testResults.forEach((fileResult) => {
      if (fileResult.assertionResults) {
        fileResult.assertionResults.forEach((assertion) => {
          tests.push({
            name: assertion.fullName || assertion.title,
            outcome: assertion.status === "passed" ? "passed" : "failed",
            duration: assertion.duration,
          });

          if (assertion.status === "passed") passed++;
          else if (assertion.status === "failed") failed++;
          else if (
            assertion.status === "pending" ||
            assertion.status === "skipped"
          )
            skipped++;
          total++;
        });
      }
    });

    // Jest JSON provides summary at top level
    if (parsed.numPassedTests !== undefined) passed = parsed.numPassedTests;
    if (parsed.numFailedTests !== undefined) failed = parsed.numFailedTests;
    if (parsed.numTotalTests !== undefined) total = parsed.numTotalTests;
    if (parsed.numPendingTests !== undefined) skipped = parsed.numPendingTests;
  }

  const summary = {
    total: total,
    passed: passed,
    failed: failed,
    errors: 0,
    skipped: skipped,
  };

  // Determine if test met expectations
  const testsMetExpectation = expectSuccess
    ? failed === 0 && passed > 0
    : failed > 0;

  const icon = testsMetExpectation ? "✅" : "❌";
  console.log(
    `\n${icon} ${testName}: ${summary.passed} passed, ${summary.failed} failed`,
  );
  console.log(
    `   Expected to ${expectSuccess ? "PASS" : "FAIL"}: ${testsMetExpectation ? "YES" : "NO"}`,
  );

  return {
    success: testsMetExpectation,
    exit_code: testsMetExpectation ? 0 : 1,
    tests,
    summary,
    stdout: output,
    stderr: "",
  };
}

function generateOutputPath() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const outputDir = path.join(__dirname, dateStr, timeStr);
  fs.mkdirSync(outputDir, { recursive: true });
  return path.join(outputDir, "report.json");
}

function writeReportVariants(primaryPath, reportJson) {
  fs.writeFileSync(primaryPath, reportJson);
  console.log(`✅ Report saved to: ${primaryPath}`);

  const stableEvaluationPath = path.join(__dirname, "report.json");
  fs.writeFileSync(stableEvaluationPath, reportJson);
  console.log(`✅ Stable report: ${stableEvaluationPath}`);

  try {
    if (fs.existsSync("/host")) {
      fs.writeFileSync("/host/report.json", reportJson);
      console.log(`✅ Host artifact: /host/report.json`);

      const hostEvalDir = "/host/evaluation";
      if (fs.existsSync(hostEvalDir)) {
        fs.writeFileSync(path.join(hostEvalDir, "report.json"), reportJson);
        console.log(`✅ Host artifact: ${hostEvalDir}/report.json`);
      }
    }
  } catch (err) {
    console.warn("Could not write to /host:", err.message);
  }

  return {
    primaryPath,
    stableEvaluationPath,
  };
}

// --- Main Evaluation Logic ---
const runId = generateRunId();
const startedAt = new Date();

console.log("\n" + "=".repeat(60));
console.log("REACT NOTES EVALUATION");
console.log("=".repeat(60));
console.log(`Run ID: ${runId}`);
console.log(`Started at: ${startedAt.toISOString()}`);

// Run tests from root directory (where jest.config.js and tests/ are located)
const afterResults = runJestTests(".", "repository_after", true);

const finishedAt = new Date();
const duration = (finishedAt - startedAt) / 1000;

function mapTestsToPythonic(tests, repoName) {
  if (!Array.isArray(tests) || tests.length === 0) return [];
  return tests.map((t, idx) => ({
    nodeid: `${repoName}::${t.name || "test_" + idx}`,
    name: t.name || "test_" + idx,
    outcome: t.outcome || "unknown",
  }));
}

const allTests = [
  ...mapTestsToPythonic(afterResults.tests, "repository_after"),
];

const unit_tests = {
  success: afterResults.success,
  exit_code: afterResults.success ? 0 : 1,
  tests: allTests,
  summary: {
    total: afterResults.summary.total,
    passed: afterResults.summary.passed,
    failed: afterResults.summary.failed,
    errors: afterResults.summary.errors,
    skipped: afterResults.summary.skipped,
  },
  repository_after: {
    expected: "PASS",
    actual: afterResults.summary.failed === 0 ? "PASS" : "FAIL",
    met_expectation: afterResults.success,
    summary: afterResults.summary,
  },
  stdout: "",
  stderr: "",
};

const algorithm_validation = {
  success: afterResults.success,
  description: "Expense Splitter Performance and Correctness Verification",
  criteria: {
    performance_time: "Balance calculation < 2s",
    query_efficiency: "Constant query count (O(1))",
    query_limit: "Total queries < 20",
    memory_usage: "Memory usage < 100MB",
    orm_usage: "Prisma ORM only (no raw SQL)",
    correctness_settlement: "Settlement algorithms identical to baseline",
    correctness_balance: "Cent-accurate balance calculation",
  },
  runs: [],
  statistics: {
    requirements_met: afterResults.summary.failed === 0,
  },
};

const overallSuccess = afterResults.success;
const summary = {
  unit_tests_passed: unit_tests.success,
  validation_passed: algorithm_validation.success,
  overall_passed: overallSuccess,
  total_tests: unit_tests.summary.total,
  tests_passed: unit_tests.summary.passed,
  tests_failed: unit_tests.summary.failed,
  repository_after_met_expectation: afterResults.success,
};

const report = {
  run_id: runId,
  started_at: startedAt.toISOString(),
  finished_at: finishedAt.toISOString(),
  duration_seconds: parseFloat(duration.toFixed(6)),
  success: overallSuccess,
  error: null,
  environment: {
    node_version: process.version,
    platform: `${os.type()}-${os.release()}-${os.arch()}-${os.platform()}`,
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    git_commit: getGitInfo().git_commit,
    git_branch: getGitInfo().git_branch,
  },
  results: {
    unit_tests,
    algorithm_validation,
    summary,
    evaluation_passed: overallSuccess,
  },
};

const outputPath = generateOutputPath();
const reportJson = JSON.stringify(report, null, 2);
const paths = writeReportVariants(outputPath, reportJson);

console.log("\n" + "=".repeat(60));
console.log("EVALUATION RESULTS");
console.log("=".repeat(60));

console.log(`\nrepository_after (expected to PASS):`);
console.log(
  `  Tests: ${afterResults.summary.passed} passed, ${afterResults.summary.failed} failed`,
);
console.log(`  Met expectation: ${afterResults.success ? "✅ YES" : "❌ NO"}`);

console.log("\n" + "=".repeat(60));
console.log("EVALUATION COMPLETE");
console.log("=".repeat(60));
console.log(`Duration: ${duration.toFixed(2)}s`);
console.log(`Overall Success: ${overallSuccess ? "✅ YES" : "❌ NO"}`);

process.exit(overallSuccess ? 0 : 1);
