#!/usr/bin/env node
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { Command } = require("commander");

function generateRunId() {
  return uuidv4().replace(/-/g, "").substring(0, 8);
}

function getGitInfo() {
  const gitInfo = { git_commit: "unknown", git_branch: "unknown" };

  try {
    const commitResult = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    gitInfo.git_commit = commitResult.trim().substring(0, 8);
  } catch {
    // Ignore errors
  }

  try {
    const branchResult = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    gitInfo.git_branch = branchResult.trim();
  } catch {
    // Ignore errors
  }

  return gitInfo;
}

function getEnvironmentInfo() {
  const gitInfo = getGitInfo();

  return {
    node_version: process.version,
    platform: `${os.type()}-${os.release()}-${os.arch()}`,
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    git_commit: gitInfo.git_commit,
    git_branch: gitInfo.git_branch,
  };
}

function runJestTests(testsDir, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RUNNING TESTS: ${label.toUpperCase()}`);
  console.log("=".repeat(60));
  console.log(`Tests directory: ${testsDir}`);

  // Use the root jest config
  const cmd = ["npx", "jest", "--json", "--runInBand", "--forceExit", "--config", "jest.config.js"];

  const env = { ...process.env };
  env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test-secret";

  try {
    // Run from project root
    const cwd = path.resolve(__dirname, '..');
    const result = spawnSync(cmd[0], cmd.slice(1), {
      cwd,
      env,
      encoding: "utf-8",
      timeout: 120000,
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    try {
      const jestData = JSON.parse(stdout);

      const passed = jestData.numPassedTests || 0;
      const failed = jestData.numFailedTests || 0;
      const total = jestData.numTotalTests || 0;

      const tests = [];
      for (const testFile of jestData.testResults || []) {
        for (const assertion of testFile.assertionResults || []) {
          const status = assertion.status;
          const name = assertion.title;
          const ancestor = assertion.ancestorTitles || [];
          const fullName = [...ancestor, name].join(" > ");

          tests.push({
            nodeid: fullName,
            name,
            outcome: status,
          });
        }
      }

      console.log(`\nResults: ${passed} passed, ${failed} failed (total: ${total})`);

      for (const test of tests) {
        const statusIcon = test.outcome === "passed" ? "✅" : "❌";
        console.log(`  ${statusIcon} ${test.nodeid}`);
      }

      return {
        success: result.status === 0,
        exit_code: result.status || -1,
        tests,
        summary: {
          total,
          passed,
          failed,
          errors: 0,
          skipped: jestData.numPendingTests || 0,
        },
        stdout: stdout.length > 3000 ? stdout.slice(-3000) : stdout,
        stderr: stderr.length > 1000 ? stderr.slice(-1000) : stderr,
      };
    } catch {
      console.log("❌ Failed to parse Jest JSON output");
      console.log("STDOUT:", stdout);
      return {
        success: false,
        exit_code: result.status || -1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, error: "Failed to parse Jest output" },
        stdout,
        stderr,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("TIMEOUT") || errorMessage.includes("timed out")) {
      console.log("❌ Test execution timed out");
      return {
        success: false,
        exit_code: -1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, error: "Test execution timed out" },
        stdout: "",
        stderr: "",
      };
    }
    console.log(`❌ Error running tests: ${errorMessage}`);
    return {
      success: false,
      exit_code: -1,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, error: errorMessage },
      stdout: "",
      stderr: "",
    };
  }
}

function runEvaluation() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("IoT Sensor Dashboard EVALUATION");
  console.log("=".repeat(60));

  const projectRoot = path.dirname(__dirname);
  const testsDir = path.join(projectRoot, "tests");

  // Run tests with BEFORE implementation
  console.log(`\n${"=".repeat(60)}`);
  console.log("RUNNING TESTS: BEFORE (repository_before)");
  console.log("=".repeat(60));
  console.log("Skipping Before tests as only After implementation is deployed for testing.");

  const beforeResults = {
    success: false,
    exit_code: -1,
    tests: [],
    summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, note: "Skipped" },
    stdout: "",
    stderr: "",
  };

  // Run tests with AFTER implementation using Jest
  const afterResults = runJestTests(testsDir, "after (repository_after)");

  // Build comparison
  const comparison = {
    before_tests_passed: beforeResults.success,
    after_tests_passed: afterResults.success,
    before_total: beforeResults.summary.total,
    before_passed: beforeResults.summary.passed,
    before_failed: beforeResults.summary.failed,
    after_total: afterResults.summary.total,
    after_passed: afterResults.summary.passed,
    after_failed: afterResults.summary.failed,
  };

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("EVALUATION SUMMARY");
  console.log("=".repeat(60));

  console.log(`\nBefore Implementation (repository_before):`);
  console.log(`  Overall: ${beforeResults.success ? "✅ PASSED" : "⏭️ SKIPPED/FAILED"}`);
  console.log(`  Tests: ${comparison.before_passed}/${comparison.before_total} passed`);

  console.log(`\nAfter Implementation (repository_after):`);
  console.log(`  Overall: ${afterResults.success ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`  Tests: ${comparison.after_passed}/${comparison.after_total} passed`);

  // Determine expected behavior
  console.log(`\n${"=".repeat(60)}`);
  console.log("EXPECTED BEHAVIOR CHECK");
  console.log("=".repeat(60));

  if (afterResults.success) {
    console.log("✅ After implementation: All tests passed (expected)");
  } else {
    console.log("❌ After implementation: Some tests failed (unexpected - should pass all)");
  }

  return {
    before: beforeResults,
    after: afterResults,
    comparison,
  };
}

function generateOutputPath() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");

  const projectRoot = path.dirname(__dirname);
  const outputDir = path.join(projectRoot, "evaluation", dateStr, timeStr);

  fs.mkdirSync(outputDir, { recursive: true });

  return path.join(outputDir, "report.json");
}

function main() {
  const program = new Command();

  program
    .description("Run IoT Sensor Dashboard evaluation")
    .option("--output <path>", "Output JSON file path (default: evaluation/YYYY-MM-DD/HH-MM-SS/report.json)");

  program.parse(process.argv);
  const options = program.opts();

  // Generate run ID and timestamps
  const runId = generateRunId();
  const startedAt = new Date();

  console.log(`Run ID: ${runId}`);
  console.log(`Started at: ${startedAt.toISOString()}`);

  let results = null;
  let success = false;
  let errorMessage = null;

  try {
    results = runEvaluation();

    // Success if after implementation passes all tests
    success = results.after.success;
    errorMessage = success ? null : "After implementation tests failed";
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.log(`\nERROR: ${errStr}`);
    if (error instanceof Error && error.stack) {
      console.log(error.stack);
    }
    results = null;
    success = false;
    errorMessage = errStr;
  }

  const finishedAt = new Date();
  const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;

  // Collect environment information
  const environment = getEnvironmentInfo();

  // Build report
  const report = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.round(duration * 1000000) / 1000000,
    success,
    error: errorMessage,
    environment,
    results,
  };

  // Determine output path
  let outputPath;
  if (options.output) {
    outputPath = options.output;
  } else {
    outputPath = generateOutputPath();
  }

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${outputPath}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("EVALUATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Run ID: ${runId}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Success: ${success ? "✅ YES" : "❌ NO"}`);

  return success ? 0 : 1;
}

process.exit(main());
