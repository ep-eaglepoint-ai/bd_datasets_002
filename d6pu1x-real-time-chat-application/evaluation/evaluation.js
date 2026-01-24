#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
  return {
    node_version: process.version,
    platform: os.platform() + '-' + os.arch()
  };
}

function runTests() {
  try {
    console.log('Running tests...\n');
    const proc = execSync('npm test', {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 120000
    });
    return {
      passed: true,
      return_code: 0,
      output: 'Tests completed successfully'
    };
  } catch (error) {
    return {
      passed: false,
      return_code: error.status || -1,
      output: 'Tests failed'
    };
  }
}

function runMetrics(repoPath) {
  // Optional – implement if needed
  return {};
}

function evaluate(repoName) {
  const repoPath = path.join(ROOT, repoName);
  let tests;
  if (repoName === 'repository_before') {
    tests = { passed: true, return_code: 0, output: 'No implementation to test' };
  } else {
    tests = runTests();
  }
  const metrics = runMetrics(repoPath);
  return {
    tests: tests,
    metrics: metrics
  };
}

function runEvaluation() {
  const runId = uuidv4();
  const start = new Date();
  const before = evaluate('repository_before');
  const after = evaluate('repository_after');
  const comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: after.tests.passed ? 'After implementation passed correctness tests' : 'After implementation failed tests'
  };
  const end = new Date();
  return {
    run_id: runId,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: (end - start) / 1000,
    environment: environmentInfo(),
    before: before,
    after: after,
    comparison: comparison,
    success: comparison.passed_gate,
    error: null
  };
}

function main() {
  if (!fs.existsSync(REPORTS)) {
    fs.mkdirSync(REPORTS, { recursive: true });
  }
  const report = runEvaluation();
  const reportPath = path.join(REPORTS, 'latest.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${reportPath}`);

  if (report.success) {
    console.log('\n🎉 Evaluation SUCCEEDED! All tests passed.');
  } else {
    console.log('\n❌ Evaluation FAILED! Some tests failed.');
  }

  return report.success ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { runEvaluation, main };