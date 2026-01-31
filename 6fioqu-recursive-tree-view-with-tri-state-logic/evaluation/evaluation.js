#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
 

function generateRunId() {
  return crypto.randomBytes(4).toString('hex');
}

function getGitInfo() {
  const gitInfo = { git_commit: "unknown", git_branch: "unknown" };
  try {
    const commitResult = execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    gitInfo.git_commit = commitResult.trim().substring(0, 8);
    const branchResult = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    gitInfo.git_branch = branchResult.trim();
  } catch (e) {
    // Ignore git errors
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

  // We use --json to get machine-readable output
  const cmd = ["npx", "jest", "--json", "tests", "--runInBand", "--forceExit"];
  
  try {
    const projectRoot = path.dirname(__dirname);
    const result = spawnSync(cmd[0], cmd.slice(1), {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 120000,
      shell: true,
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
          tests.push({
            nodeid: [...(assertion.ancestorTitles || []), assertion.title].join(" > "),
            name: assertion.title,
            outcome: assertion.status,
          });
        }
      }

      console.log(`\nResults: ${passed} passed, ${failed} failed (total: ${total})`);
      tests.forEach(test => {
        console.log(`  ${test.outcome === "passed" ? "✅" : "❌"} ${test.nodeid}`);
      });

      return {
        success: result.status === 0,
        exit_code: result.status || 0,
        tests,
        summary: { total, passed, failed, errors: 0, skipped: jestData.numPendingTests || 0 },
        stdout: stdout.length > 3000 ? stdout.slice(-3000) : stdout,
        stderr: stderr.length > 1000 ? stderr.slice(-1000) : stderr,
      };
    } catch (e) {
      console.log("❌ Failed to parse Jest JSON output");
      return {
        success: false,
        exit_code: 1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0, error: "Failed to parse Jest output" },
        stdout,
        stderr,
      };
    }
  } catch (error) {
    console.log(`❌ Error running tests: ${error.message}`);
    return {
      success: false,
      exit_code: 1,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0, error: error.message },
      stdout: "",
      stderr: "",
    };
  }
}

function runEvaluation() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Recursive Tree EVALUATION");
  console.log("=".repeat(60));

  const projectRoot = path.dirname(__dirname);
  const testsDir = path.join(projectRoot, "tests");

  // Before implementation (repository_before) usually has no implementation files
  const beforeResults = {
    success: false,
    exit_code: -1,
    tests: [],
    summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, note: "Skipped" },
    stdout: "",
    stderr: "",
  };

  const afterResults = runJestTests(testsDir, "after (repository_after)");

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

  return { before: beforeResults, after: afterResults, comparison };
}

function generateOutputPath(projectRoot, date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');

  const dateStr = `${yy}-${mm}-${dd}`;
  const timeStr = `${hh}-${min}-${sec}`;

  const outputDir = path.join(projectRoot, "evaluation", "reports", dateStr, timeStr);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return path.join(outputDir, "report.json");
}

function main() {
  const startedAt = new Date();
  const runId = generateRunId();
  
  console.log(`Run ID: ${runId}`);
  console.log(`Started at: ${startedAt.toISOString()}`);

  let results = null;
  let success = false;
  let errorMessage = null;

  try {
    results = runEvaluation();
    success = results.after.success;
    errorMessage = success ? null : "Some tests failed in the after implementation.";
  } catch (error) {
    errorMessage = error.message;
    console.error("Evaluation Error:", error);
  }

  const finishedAt = new Date();
  const report = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: (finishedAt - startedAt) / 1000,
    success,
    error: errorMessage,
    environment: getEnvironmentInfo(),
    results
  };

  const projectRoot = path.dirname(__dirname);
  const outputPath = generateOutputPath(projectRoot, startedAt);

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${outputPath}`);
  console.log(`Overall Success: ${success ? "✅ YES" : "❌ NO"}`);

  process.exit(success ? 0 : 1);
}

main();