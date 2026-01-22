const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function generateRunId() {
  return Math.random().toString(36).substring(2, 10);
}

function getGitInfo() {
  const gitInfo = { git_commit: "unknown", git_branch: "unknown" };
  return gitInfo;
}

function runVitestTests(testProject, testName, expectSuccess = true) {
  console.log("\n" + "=".repeat(60));
  console.log(`RUNNING TESTS: ${testName}`);
  console.log(`Expected outcome: ${expectSuccess ? "PASS" : "FAIL"}`);
  console.log("=".repeat(60));

  const projectDir = path.join(__dirname, "..", testProject);

  try {
    // Install dependencies first
    console.log("Installing dependencies...");
    try {
      execSync("rm -rf node_modules package-lock.json && npm install", {
        cwd: projectDir,
        encoding: "utf8",
        stdio: "inherit",
      });
    } catch (err) {
      console.error("Failed to install dependencies:", err.message);
      throw err;
    }

    // Run Vitest with JSON reporter
    // npx vitest run --reporter=json --outputFile=test-results.json
    try {
      execSync(
        `npx vitest run --reporter=json --outputFile=test-results.json`,
        {
          cwd: projectDir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, CI: "true" },
        },
      );
    } catch (err) {
      // Vitest exits with non-zero when tests fail.
      // We catch this to process the output file regardless.
    }

    const resultsPath = path.join(projectDir, "test-results.json");
    if (!fs.existsSync(resultsPath)) {
      throw new Error("Test results file not found at " + resultsPath);
    }
    const output = fs.readFileSync(resultsPath, "utf8");
    return parseVitestOutput(output, testName, expectSuccess);
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

function parseVitestOutput(output, testName, expectSuccess) {
  let parsed = null;
  let tests = [];
  let passed = 0;
  let failed = 0;
  let total = 0;
  let ignored = 0;

  try {
    parsed = JSON.parse(output);
  } catch (e) {
    console.error("Failed to parse Vitest JSON output:", e.message);
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
          else ignored++;
          total++;
        });
      }
    });

    // Vitest JSON sometimes summarizes at the top level
    if (parsed.numPassedTests !== undefined) passed = parsed.numPassedTests;
    if (parsed.numFailedTests !== undefined) failed = parsed.numFailedTests;
    if (parsed.numTotalTests !== undefined) total = parsed.numTotalTests;
  }

  const summary = {
    total: total,
    passed: passed,
    failed: failed,
    errors: 0,
    skipped: ignored,
  };

  // Determine if test met expectations
  // For this task, we mainly care about AFTER passing.
  // We don't have a BEFORE repo to test failures against for this specific task,
  // but the template logic handles "expect failure" if needed.
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
    exit_code: testsMetExpectation ? 0 : 1, // Logic aligned with "did it meet expectation"
    tests,
    summary,
    stdout: output, // Saving the full JSON as stdout for record
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

  // Also write to /host/report.json if the volume is mounted (for CI artifacts)
  try {
    if (fs.existsSync("/host")) {
      fs.writeFileSync("/host/report.json", reportJson);
      console.log(`✅ CI Artifact: /host/report.json`);

      const hostEvalDir = "/host/evaluation";
      if (fs.existsSync(hostEvalDir)) {
        fs.writeFileSync(path.join(hostEvalDir, "report.json"), reportJson);
        console.log(`✅ CI Artifact: ${hostEvalDir}/report.json`);
      }
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

// --- Main Evaluation Logic ---
const runId = generateRunId();
const startedAt = new Date();

console.log("\n" + "=".repeat(60));
console.log("BROWSER IMAGE COMPRESSOR EVALUATION");
console.log("=".repeat(60));
console.log(`Run ID: ${runId}`);
console.log(`Started at: ${startedAt.toISOString()}`);
console.log("\nRequirements:");
console.log("  1. Transparency: Transparent PNG remains transparent");
console.log("  2. EXIF: Respect orientation");
console.log("  3. UI: Stats displayed (Original | Compressed | Saved)");
console.log("  4. Performance: Non-blocking main thread");
console.log("  5. Client-Side: 100% Client-side processing");
console.log("  6. Formats: Handles jpeg, png, webp");
console.log("  7. Exports: All exports as PNG");
console.log("  8. Compression: 50% size reduction target");

// For this task, we only have repository_after tests to verify requirements are met.
const afterResults = runVitestTests(
  "repository_after",
  "repository_after",
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
  description: "Browser Native Image Compressor Requirement Verification",
  criteria: {
    transparency: "Transparent PNG remains transparent",
    exif: "Respect orientation",
    ui_stats: "Stats displayed accurately",
    performance: "Non-blocking main thread (Web Worker)",
    local_only: "100% Client-side",
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
