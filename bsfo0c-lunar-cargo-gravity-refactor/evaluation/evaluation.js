import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseTap(output) {
  const tests = {};
  const lines = output.split("\n");
  for (const line of lines) {
    const okMatch = line.match(/^ok \d+ - (.+)$/);
    const failMatch = line.match(/^not ok \d+ - (.+)$/);
    if (okMatch) tests[okMatch[1]] = "PASSED";
    if (failMatch) tests[failMatch[1]] = "FAILED";
  }
  const total = Object.keys(tests).length;
  const passed = Object.values(tests).filter(v => v === "PASSED").length;
  const failed = total - passed;
  return { tests, metrics: { total, passed, failed }, error: null };
}

function runTests(repo) {
  try {
    const output = execSync("node --test --test-reporter tap tests/index.js", {
      env: { ...process.env, REPO: repo },
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return parseTap(output);
  } catch (error) {
    const out = (error.stdout?.toString() || "") + "\n" + (error.stderr?.toString() || "");
    return parseTap(out);
  }
}

console.log("============================================================");
console.log("Lunar Cargo Gravity Refactor - Evaluation");
console.log("============================================================\n");

const before = runTests("repository_before");
const after = runTests("repository_after");

console.log(" Evaluating repository_before...");
console.log(`    Passed: ${before.metrics.passed}`);
console.log(`    Failed: ${before.metrics.failed}`);

console.log("\n Evaluating repository_after...");
console.log(`    Passed: ${after.metrics.passed}`);
console.log(`    Failed: ${after.metrics.failed}`);

const testsFixed = Object.keys(after.tests).filter(t => before.tests[t] === "FAILED" && after.tests[t] === "PASSED");
const testsBroken = Object.keys(after.tests).filter(t => before.tests[t] === "PASSED" && after.tests[t] === "FAILED");
const improvement = after.metrics.total > 0
  ? Math.round(((after.metrics.passed - before.metrics.passed) / after.metrics.total) * 10000) / 100
  : 0;

const now = new Date();
const dateStr = now.toISOString().split("T")[0];
const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
const outputDir = path.join("evaluation", dateStr, timeStr);
fs.mkdirSync(outputDir, { recursive: true });

const report = {
  timestamp: now.toISOString(),
  before,
  after,
  comparison: {
    tests_fixed: testsFixed,
    tests_broken: testsBroken,
    improvement
  },
  success: after.metrics.failed === 0 && after.metrics.total > 0,
  error: null
};

fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));

console.log("\n============================================================");
console.log("EVALUATION SUMMARY");
console.log("============================================================");
console.log(`Total After: ${after.metrics.total} | Passed: ${after.metrics.passed} | Failed: ${after.metrics.failed}`);
console.log(`Success Rate: ${after.metrics.total > 0 ? (after.metrics.passed / after.metrics.total * 100).toFixed(1) : "0.0"}%`);
console.log(`Overall: ${report.success ? "PASS" : "FAIL"}`);
console.log("============================================================");

if (!report.success) process.exit(1);
