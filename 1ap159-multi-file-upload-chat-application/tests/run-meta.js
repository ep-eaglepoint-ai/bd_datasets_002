#!/usr/bin/env node
/**
 * Meta-test runner: run Jest against repository_before (must have failures) and
 * repository_after (must pass). Exits 0 only if before fails and after passes.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd, args, opts = {}) {
  const options = { stdio: 'inherit', cwd: root, ...opts };
  if (process.platform === 'win32') options.shell = true;
  return spawnSync(cmd, args, options);
}

console.log('--- Meta: run against repository_before (expect some failures) ---');
const r1 = run('npm', ['run', 'test:before']);
if (r1.status === 0) {
  console.error('Meta FAIL: repository_before must have failing tests (FAIL_TO_PASS).');
  process.exit(1);
}

console.log('--- Meta: run against repository_after (expect all pass) ---');
const r2 = run('npm', ['run', 'test:after']);
if (r2.status !== 0) {
  console.error('Meta FAIL: repository_after must pass all tests.');
  process.exit(1);
}

console.log('--- Meta: pass (before fails, after passes) ---');
