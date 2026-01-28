const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function generateRunId() {
  return Math.random().toString(36).substring(2, 10);
}

function getGitInfo() {
  return { git_commit: "unknown", git_branch: "unknown" };
}

function getEnvironmentInfo() {
  const gitInfo = getGitInfo();
  return {
    node_version: process.version,
    platform: os.platform(),
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    git_commit: gitInfo.git_commit,
    git_branch: gitInfo.git_branch,
  };
}

function runJestTests(testRepo, testName, expectSuccess = true) {
  console.log("\n" + "=".repeat(60));
  console.log(`RUNNING TESTS: ${testName}`);
  console.log(`Expected outcome: ${expectSuccess ? "PASS" : "FAIL"}`);
  console.log("=".repeat(60));

  const testsDir = path.join(__dirname, "..", "tests");

  try {
    const output = execSync(
      `node --experimental-vm-modules node_modules/jest/bin/jest.js --json --forceExit`,
      {
        cwd: testsDir,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 10,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, CI: "true", TEST_REPO: testRepo },
      }
    );

    return parseJestOutput(output, testName, true, expectSuccess);
  } catch (err) {
    if (err.stdout) {
      return parseJestOutput(err.stdout, testName, false, expectSuccess);
    }

    console.error("\nERROR:", err.message);
    if (err.stderr) console.error("STDERR:", err.stderr);

    return {
      success: false,
      exit_code: err.status || 1,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
      error: err.message,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    };
  }
}

function parseJestOutput(output, testName, executionSuccess, expectSuccess) {
  let parsed = null;
  let tests = [];
  let passed = 0;
  let failed = 0;
  let total = 0;

  try {
    const jsonStart = output.indexOf("{");
    const jsonEnd = output.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = output.substring(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(jsonStr);
    }
  } catch (e) {
    console.error("Failed to parse Jest JSON output:", e.message);
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
        });
      }
    });

    passed = parsed.numPassedTests || 0;
    failed = parsed.numFailedTests || 0;
    total = parsed.numTotalTests || 0;
  }

  const summary = {
    total: total,
    passed: passed,
    failed: failed,
    errors: 0,
    skipped: 0,
  };

  const testsMetExpectation = expectSuccess
    ? failed === 0 && passed > 0
    : failed > 0;

  const icon = testsMetExpectation ? "✅" : "❌";
  console.log(
    `\n${icon} ${testName}: ${summary.passed} passed, ${summary.failed} failed`
  );
  console.log(
    `   Expected to ${expectSuccess ? "PASS" : "FAIL"}: ${testsMetExpectation ? "YES" : "NO"}`
  );

  return {
    success: testsMetExpectation,
    exit_code: executionSuccess ? 0 : 1,
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

  const stableEvaluationPath = path.join(__dirname, "report.json");
  fs.writeFileSync(stableEvaluationPath, reportJson);

  const stableRootPath = path.join(__dirname, "..", "report.json");
  fs.writeFileSync(stableRootPath, reportJson);

  try {
    if (fs.existsSync("/host")) {
      fs.writeFileSync("/host/report.json", reportJson);
      console.log(`✅ CI Artifact: /host/report.json`);
    }
  } catch (err) {
    console.warn("Could not write to /host/report.json:", err.message);
  }

  return {
    primaryPath,
    stableEvaluationPath,
    stableRootPath,
  };
}

const runId = generateRunId();
const startedAt = new Date();

console.log("\n" + "=".repeat(60));
console.log("LOCK-FREE ATOMICS RACE CONDITION EVALUATION");
console.log("=".repeat(60));
console.log(`Run ID: ${runId}`);
console.log(`Started at: ${startedAt.toISOString()}`);

const beforeResults = runJestTests("before", "repository_before", false);
const afterResults = runJestTests("after", "repository_after", true);

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
  ...mapTestsToPythonic(beforeResults.tests, "repository_before"),
  ...mapTestsToPythonic(afterResults.tests, "repository_after"),
];

const unit_tests = {
  success: beforeResults.success && afterResults.success,
  exit_code: beforeResults.success && afterResults.success ? 0 : 1,
  tests: allTests,
  summary: {
    total: beforeResults.summary.total + afterResults.summary.total,
    passed: beforeResults.summary.passed + afterResults.summary.passed,
    failed: beforeResults.summary.failed + afterResults.summary.failed,
    errors: beforeResults.summary.errors + afterResults.summary.errors,
    skipped: beforeResults.summary.skipped + afterResults.summary.skipped,
  },
  repository_before: {
    expected: "FAIL",
    actual: beforeResults.summary.failed > 0 ? "FAIL" : "PASS",
    met_expectation: beforeResults.success,
    summary: beforeResults.summary,
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
  description: "Lock-free atomics race condition verification",
  criteria: {
    atomics_wait_notify: "Atomics.wait/notify with hashed state",
    pq_encrypt: "PQ-secure SHA-256 hash",
    thread_verification: "1000 threads on same record",
    race_free_proof: "Prove race-free behavior",
  },
  runs: [],
  statistics: {
    before_has_races: beforeResults.summary.failed > 0,
    after_is_race_free: afterResults.summary.failed === 0,
  },
};

const overallSuccess = beforeResults.success && afterResults.success;
const summary = {
  unit_tests_passed: unit_tests.success,
  validation_passed: algorithm_validation.success,
  overall_passed: overallSuccess,
  total_tests: unit_tests.summary.total,
  tests_passed: unit_tests.summary.passed,
  tests_failed: unit_tests.summary.failed,
  repository_before_met_expectation: beforeResults.success,
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
console.log(`\nrepository_before (expected to FAIL):`);
console.log(
  `  Tests: ${beforeResults.summary.passed} passed, ${beforeResults.summary.failed} failed`
);
console.log(`  Met expectation: ${beforeResults.success ? "✅ YES" : "❌ NO"}`);

console.log(`\nrepository_after (expected to PASS):`);
console.log(
  `  Tests: ${afterResults.summary.passed} passed, ${afterResults.summary.failed} failed`
);
console.log(`  Met expectation: ${afterResults.success ? "✅ YES" : "❌ NO"}`);

console.log("\n" + "-".repeat(60));
console.log(`\n✅ Report saved to: ${paths.primaryPath}`);
console.log(`✅ Stable report: ${paths.stableEvaluationPath}`);
console.log(`✅ Stable report: ${paths.stableRootPath}`);

console.log("\n" + "=".repeat(60));
console.log("EVALUATION COMPLETE");
console.log("=".repeat(60));
console.log(`Duration: ${duration.toFixed(2)}s`);
console.log(`Overall Success: ${overallSuccess ? "✅ YES" : "❌ NO"}`);

process.exit(overallSuccess ? 0 : 1);
