/**
 * Evaluation: run tests on repository_before and repository_after, compare,
 * write report to evaluation/reports/yyyy-mm-dd/HH-mm-ss/report.json.
 * Exit 0 if after passes, 1 otherwise.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_BASE = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
  return {
    node_version: process.version,
    platform: require('os').platform(),
  };
}

function runTests(script) {
  const opts = {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000,
  };
  if (process.platform === 'win32') opts.shell = true;
  const r = spawnSync('npm', ['run', script], opts);
  const output = [(r.stdout || ''), (r.stderr || '')].join('').slice(0, 8000);
  return {
    passed: r.status === 0,
    return_code: r.status != null ? r.status : -1,
    output,
  };
}

function runEvaluation() {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();

  const before = {
    tests: runTests('test:before'),
    metrics: {},
  };
  const after = {
    tests: runTests('test:after'),
    metrics: {},
  };

  const finishedAt = new Date().toISOString();
  const durationSeconds =
    (new Date(finishedAt) - new Date(startedAt)) / 1000;

  const passedGate = after.tests.passed;
  const comparison = {
    passed_gate: passedGate,
    improvement_summary: passedGate
      ? 'After implementation passed correctness tests.'
      : 'After implementation did not pass correctness tests.',
  };

  return {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    environment: environmentInfo(),
    before,
    after,
    comparison,
    success: passedGate,
    error: null,
  };
}

function main() {
  let report;
  try {
    report = runEvaluation();
  } catch (e) {
    report = {
      run_id: randomUUID(),
      started_at: new Date().toISOString(),
      finished_at: null,
      duration_seconds: null,
      environment: environmentInfo(),
      before: { tests: { passed: false, return_code: -1, output: '' }, metrics: {} },
      after: { tests: { passed: false, return_code: -1, output: '' }, metrics: {} },
      comparison: { passed_gate: false, improvement_summary: 'Evaluation crashed.' },
      success: false,
      error: String(e),
    };
  }

  // Path: evaluation/reports/yyyy-mm-dd/HH-mm-ss/report.json
  const started = report.started_at;
  const d = started ? new Date(started) : new Date();
  const iso = d.toISOString();
  const dateStr = iso.slice(0, 10);
  const timeStr = iso.slice(11, 19).replace(/:/g, '-');
  const reportDir = path.join(REPORTS_BASE, dateStr, timeStr);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Report written to', reportPath);
  process.exit(report.success ? 0 : 1);
}

main();
