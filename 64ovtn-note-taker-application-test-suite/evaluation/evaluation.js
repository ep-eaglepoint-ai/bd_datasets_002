#!/usr/bin/env node
/**
 * Evaluation script for Note Taker Application Test Suite
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.dirname(__dirname);

function runTests(repoPath, options = {}) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: [],
  };

  try {
    const testArgs = ["test"];
    if (options.testPath) {
      testArgs.push("--", "--runTestsByPath", options.testPath);
    }

    const result = spawnSync("npm", testArgs, {
      cwd: repoPath,
      env: {
        ...process.env,
        CI: "true",
        FORCE_COLOR: "0",
        ...(options.appUnderTest
          ? { APP_UNDER_TEST: options.appUnderTest }
          : {}),
        ...(options.targetRepo ? { TARGET_REPO: options.targetRepo } : {}),
      },
      encoding: "utf-8",
      timeout: 180000,
      shell: true,
    });

    const output = result.stdout + result.stderr;

    // Parse individual test results from console output
    // Format: ✓ test name (XX ms) or ✕ test name (XX ms)
    const passedTestMatches = output.matchAll(/✓\s+(.+?)\s+\(\d+\s*m?s\)/g);
    const failedTestMatches = output.matchAll(/✕\s+(.+?)\s+\(\d+\s*m?s\)/g);

    for (const match of passedTestMatches) {
      results.tests.push({
        name: match[1].trim(),
        passed: true,
      });
      results.passed++;
    }

    for (const match of failedTestMatches) {
      results.tests.push({
        name: match[1].trim(),
        passed: false,
      });
      results.failed++;
    }

    results.total = results.passed + results.failed;

    // If no tests found via checkmarks, try summary line parsing
    if (results.total === 0) {
      // Try: "Tests: 21 passed, 21 total" or "Tests: 1 failed, 20 passed, 21 total"
      const summaryMatch = output.match(
        /Tests:\s+(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/,
      );
      if (summaryMatch) {
        results.failed = parseInt(summaryMatch[1] || 0);
        results.passed = parseInt(summaryMatch[2] || 0);
        results.total = parseInt(summaryMatch[3] || 0);
      }
    }

    // Another fallback - just count passed/failed
    if (results.total === 0) {
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      if (passedMatch) results.passed = parseInt(passedMatch[1]);
      if (failedMatch) results.failed = parseInt(failedMatch[1]);
      results.total = results.passed + results.failed;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

function saveReport(beforeResults, afterResults) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const outputDir = path.join(projectRoot, "evaluation", dateStr, timeStr);

  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    timestamp: now.toISOString(),
    repository_before: {
      passed: beforeResults.passed,
      failed: beforeResults.failed,
      total: beforeResults.total,
      tests: beforeResults.tests,
    },
    repository_after: {
      passed: afterResults.passed,
      failed: afterResults.failed,
      total: afterResults.total,
      tests: afterResults.tests,
    },
  };

  const filepath = path.join(outputDir, "report.json");
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

  return `evaluation/${dateStr}/${timeStr}/report.json`;
}

function main() {
  console.log("=".repeat(60));
  console.log("Note Taker Application Test Suite - Evaluation");
  console.log("=".repeat(60));

  const repoBefore = path.join(projectRoot, "repository_before");
  const repoAfter = path.join(projectRoot, "repository_after");
  const metaTests = path.join(projectRoot, "tests", "App.test.jsx");

  console.log("\n[repository_before]");
  const beforeResults = runTests(repoBefore, {
    testPath: metaTests,
    appUnderTest: path.join(repoBefore, "src", "App.jsx"),
    targetRepo: repoBefore,
  });
  console.log(`  Passed: ${beforeResults.passed}`);
  console.log(`  Failed: ${beforeResults.failed}`);
  console.log(`  Total:  ${beforeResults.total}`);

  console.log("\n[repository_after]");
  const afterResults = runTests(repoAfter, {
    testPath: metaTests,
    appUnderTest: path.join(repoAfter, "src", "App.jsx"),
    targetRepo: repoAfter,
  });
  console.log(`  Passed: ${afterResults.passed}`);
  console.log(`  Failed: ${afterResults.failed}`);
  console.log(`  Total:  ${afterResults.total}`);

  const reportPath = saveReport(beforeResults, afterResults);
  console.log(`\n  Report: ${reportPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));

  // For test-writing tasks: repository_before has no tests, repository_after has all tests passing
  if (afterResults.failed === 0 && afterResults.passed > 0) {
    console.log("PASS: All tests pass on repository_after");
    if (beforeResults.total === 0) {
      console.log(
        "      (repository_before has no tests - expected for test-writing task)",
      );
    }
    process.exit(0);
  } else {
    console.log("FAIL: Some tests failed on repository_after");
    process.exit(1);
  }
}

main();
