const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { randomUUID } = require('crypto');

function isoNow() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function gatherEnvironment() {
  return {
    node_version: process.version,
    platform: process.platform,
    os: os.type(),
    architecture: process.arch,
    hostname: os.hostname(),
  };
}

function runTests() {
  try {
    const out = execSync('npm run test:run --silent', { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, exitCode: 0, rawOutput: out };
  } catch (err) {
    const exitCode = (err && err.status) || 1;
    const rawOutput = (err && err.stdout) ? String(err.stdout) : (err && err.message) ? err.message : '';
    return { success: false, exitCode, rawOutput };
  }
}

function parseVitestOutput(output) {
  const tests = [];
  const lines = (output || '').split(/\r?\n/);
  const itemRe = /^\s*[✓×]\s+(.*)$/;
  for (const line of lines) {
    const m = line.match(itemRe);
    if (m) {
      const name = m[1].trim();
      tests.push({ name, status: line.indexOf('✓') !== -1 ? 'passed' : 'failed', duration: 0, failureMessages: [] });
    }
  }

  const summary = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed').length,
    xfailed: 0,
    errors: 0,
    skipped: 0,
  };

  return { tests, summary };
}

function main() {
  const runId = typeof randomUUID === 'function' ? randomUUID() : `run-${Date.now()}`;
  const startedAt = isoNow();

  const testResult = runTests();

  const finishedAt = isoNow();
  const durationSeconds = (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;

  const env = gatherEnvironment();
  const parsed = parseVitestOutput(testResult.rawOutput || '');

  const results = {
    after: {
      success: testResult.success,
      exit_code: testResult.exitCode,
      tests: parsed.tests,
      summary: parsed.summary,
    },
    comparison: {
      after_tests_passed: parsed.summary.failed === 0,
      after_total: parsed.summary.total,
      after_passed: parsed.summary.passed,
      after_failed: parsed.summary.failed,
      after_xfailed: parsed.summary.xfailed || 0,
    },
  };

  const report = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    success: testResult.success,
    error: testResult.success ? null : `Exit code ${testResult.exitCode}`,
    environment: env,
    results,
  };

  const now = new Date();
  const dir = path.join(__dirname, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`);
  ensureDir(dir);
  const outPath = path.join(dir, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('Wrote report to', outPath);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(2);
}
