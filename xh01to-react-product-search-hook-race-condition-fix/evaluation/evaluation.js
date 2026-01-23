#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

function environmentInfo() {
  return {
    node_version: process.version,
    platform: process.platform + '-' + process.arch
  };
}

function runTests(repo) {
  try {
    // Set REPO environment variable and run tests
    const env = { ...process.env, REPO: repo };
    const output = execSync(
      repo === 'before' ? 'cd repository_before && npm install && cd .. && npm test' : 'npm test',
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        timeout: 120000, // 2 minutes
        maxBuffer: 1024 * 1024 * 10, // 10MB
        env,
        stdio: 'pipe' // Suppress output to terminal
      }
    );

    return {
      passed: true,
      return_code: 0,
      output: output.slice(0, 8000)
    };
  } catch (error) {
    return {
      passed: false,
      return_code: error.status || 1,
      output: ((error.stdout || '') + (error.stderr || '')).slice(0, 8000)
    };
  }
}

function runMetrics(repoPath) {
  // Optional - no specific metrics for this task
  return {};
}

function evaluate(repo) {
  const tests = runTests(repo);
  const metrics = runMetrics(repo);
  return {
    tests,
    metrics
  };
}

function runEvaluation() {
  const runId = uuidv4();
  const start = new Date();

  console.log('Running evaluation...');

  const before = evaluate('before');
  const after = evaluate('after');

  const comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: after.tests.passed
      ? 'After implementation passed all tests, fixing race conditions and memory leaks'
      : 'After implementation still has failing tests'
  };

  const end = new Date();
  const duration = (end.getTime() - start.getTime()) / 1000;

  const report = {
    run_id: runId,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: duration,
    environment: environmentInfo(),
    before,
    after,
    comparison,
    success: comparison.passed_gate,
    error: null
  };

  return report;
}

function main() {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  try {
    const report = runEvaluation();
    const reportPath = path.join(reportsDir, 'latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Report written to ${reportPath}`);

    if (report.success) {
      console.log('✅ Evaluation succeeded: After implementation passes all tests');
    } else {
      console.log('❌ Evaluation failed: After implementation has failing tests');
    }

    return report.success ? 0 : 1;
  } catch (error) {
    console.error('Evaluation error:', error.message);
    const errorReport = {
      run_id: uuidv4(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_seconds: 0,
      environment: environmentInfo(),
      before: { tests: { passed: false, return_code: 1, output: '' }, metrics: {} },
      after: { tests: { passed: false, return_code: 1, output: '' }, metrics: {} },
      comparison: { passed_gate: false, improvement_summary: 'Evaluation crashed' },
      success: false,
      error: error.message
    };

    const reportPath = path.join(reportsDir, 'latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));

    console.log(`Error report written to ${reportPath}`);
    console.log('❌ Evaluation failed: Evaluation crashed');

    return 1;
  }
}

if (require.main === module) {
  process.exit(main());
}