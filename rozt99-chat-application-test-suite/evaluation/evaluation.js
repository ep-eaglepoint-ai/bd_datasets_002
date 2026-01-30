const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawnSync } = require("child_process");

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
        maxBuffer: 10 * 1024 * 1024,
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
console.log("CHAT APPLICATION EVALUATION");
console.log("=".repeat(60));
console.log(`Run ID: ${runId}`);
console.log(`Started at: ${startedAt.toISOString()}`);
console.log("\nRequirements:");
console.log("  1. Message Sending: User messages user role, input clearing");
console.log("  2. Async Handling: Typing indicators, delayed responses");
console.log("  3. Response Generation: Keywords (hello, time, date, weather)");
console.log("  4. Auto-Scroll: scrollIntoView on new messages");
console.log("  5. UI State: Disabled inputs during typing");
console.log("  6. Edge Cases: Long messages, special characters");
console.log("  7. Integration: Full conversation flow");

// Run tests from repository_after
// We modify runJestTests to use 'npm test' to ensure react-scripts is used
function runJestTestsAdapated(testProject, testName, expectSuccess = true) {
  console.log("\n" + "=".repeat(60));
  console.log(`RUNNING TESTS: ${testName}`);
  console.log(`Expected outcome: ${expectSuccess ? "PASS" : "FAIL"}`);
  console.log("=".repeat(60));

  const projectDir = path.join(__dirname, "..", testProject);

  console.log(`Project directory: ${projectDir}`);

  try {
    const nodeModulesPath = path.join(projectDir, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      console.log("Installing dependencies...");
      execSync("npm install", { cwd: projectDir, stdio: "inherit" });
    }

    console.log("Running Jest tests via npm test...");
    let output = "";

    // We use 'npm test -- --json' to let react-scripts invoke jest and output json
    const result = spawnSync(
      "npm",
      ["test", "--", "--json", "--watchAll=false"],
      {
        cwd: projectDir,
        encoding: "utf8",
        env: { ...process.env, CI: "true" },
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    output = result.stdout || "";
    // react-scripts/jest often prints JSON to stdout, but sometimes mixed with logs.
    // parseJestOutput attempts to find the JSON blob.

    if (result.status !== 0 && !output.includes("testResults")) {
      console.log("Test execution failed. Stderr:", result.stderr);
    }

    return parseJestOutput(output, testName, expectSuccess);
  } catch (err) {
    console.error("Execution error:", err.message);
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

const metaResults = runJestTests(
  "tests",
  "Meta Tests",
  true,
);

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
  ...mapTestsToPythonic(metaResults.tests, "tests"),
];

const unit_tests = {
  success: metaResults.success,
  exit_code: metaResults.success ? 0 : 1,
  tests: allTests,
  summary: {
    total: metaResults.summary.total,
    passed: metaResults.summary.passed,
    failed: metaResults.summary.failed,
    errors: metaResults.summary.errors,
    skipped: metaResults.summary.skipped,
  },
  meta_tests: {
    expected: "PASS",
    actual: metaResults.summary.failed === 0 ? "PASS" : "FAIL",
    met_expectation: metaResults.success,
    summary: metaResults.summary,
  },
  stdout: "",
  stderr: "",
};

const algorithm_validation = {
  success: metaResults.success,
  description: "Meta Test Validation",
  criteria: {
    test_structure: "Tests organized with describe blocks",
    browser_mocks: "Browser APIs mocked in setupTests.js",
    fake_timers: "Async tests use jest.useFakeTimers()",
    react_testing: "Uses act() and waitFor() for state updates",
    parameterized: "Keyword tests use test.each",
    best_practices: "Proper cleanup and test isolation",
  },
  runs: [],
  statistics: {
    requirements_met: metaResults.summary.failed === 0,
  },
};

const overallSuccess = metaResults.success;
const summary = {
  unit_tests_passed: unit_tests.success,
  validation_passed: algorithm_validation.success,
  overall_passed: overallSuccess,
  total_tests: unit_tests.summary.total,
  tests_passed: unit_tests.summary.passed,
  tests_failed: unit_tests.summary.failed,
  meta_tests_met_expectation: metaResults.success,
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

console.log(`\nMeta Tests (expected to PASS):`);
console.log(
  `  Tests: ${metaResults.summary.passed} passed, ${metaResults.summary.failed} failed`,
);
console.log(`  Met expectation: ${metaResults.success ? "✅ YES" : "❌ NO"}`);

console.log("\n" + "=".repeat(60));
console.log("EVALUATION COMPLETE");
console.log("=".repeat(60));
console.log(`Duration: ${duration.toFixed(2)}s`);
console.log(`Overall Success: ${overallSuccess ? "✅ YES" : "❌ NO"}`);

process.exit(overallSuccess ? 0 : 1);
