#!/usr/bin/env ts-node
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "evaluation", "reports");

function environmentInfo() {
  return {
    node_version: process.version,
    platform: `${os.type()}-${os.arch()}`,
  };
}

function runTests() {
  const isWin = process.platform === "win32";
  const npxCmd = isWin ? "npx.cmd" : "npx";

  console.log(`Running Jest tests...`);
  const result = spawnSync(npxCmd, ["jest", "--no-colors", "--no-cache"], {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 300000,
    shell: isWin,
  });

  const output = (result.stdout || "") + (result.stderr || "");
  const passed = result.status === 0;

  return {
    passed: passed,
    return_code: result.status ?? -1,
    output: output.length > 8000 ? output.slice(0, 8000) + "... (truncated)" : output,
  };
}

function runEvaluation() {
  const startedAt = new Date();
  console.log(`\n============================================================`);
  console.log(`JWT MIDDLEWARE TEST SUITE EVALUATION`);
  console.log(`============================================================`);

  // Mock 'before' state as requested (Test suite was empty/missing)
  console.log("Analyzing 'before' state (Baseline: No tests)...");
  const beforeResult = {
    tests: {
        passed: false,
        return_code: 1,
        output: "No tests implemented in baseline."
    },
    metrics: {}
  };

  console.log("Evaluating 'after' state (Updated Test Suite)...");
  const afterTests = runTests();
  const afterResult = {
    tests: afterTests,
    metrics: {}
  };

  const finishedAt = new Date();

  console.log(`\n============================================================`);
  console.log(`EVALUATION SUMMARY`);
  console.log(`============================================================`);
  console.log(`Tests: ${afterTests.passed ? "✅ PASSED" : "❌ FAILED"}`);

  const passedGate = afterTests.passed;

  return {
    run_id: randomUUID(),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: (finishedAt.getTime() - startedAt.getTime()) / 1000,
    environment: environmentInfo(),
    before: beforeResult,
    after: afterResult,
    comparison: {
      passed_gate: passedGate,
      improvement_summary: passedGate 
        ? "Successfully implemented comprehensive JWT middleware test suite passing all requirements including clock skew, algorithm confusion, and concurrent refresh."
        : "Implementation has failing tests."
    },
    success: passedGate,
    error: null,
  };
}

function main() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  try {
    const report = runEvaluation();
    
    // Create nested timestamped directory: YYYY-MM-DD/HH-MM-SS
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    const outputDir = path.join(REPORTS_DIR, dateStr, timeStr);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, "report.json");
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    // Also save a copy to the root reports dir for easy access
    fs.writeFileSync(path.join(REPORTS_DIR, "report.json"), JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report written to: ${outputPath}`);
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error(`\nFATAL ERROR: ${error}`);
    process.exit(1);
  }
}

main();