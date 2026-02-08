#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const testDir = path.join(__dirname);

console.log('Running Playwright tests...\n');
console.log('='.repeat(60));

try {
  // Run Playwright tests - capture output for parsing but also show it
  const output = execSync('npx playwright test --reporter=list', {
    cwd: testDir,
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'pipe'] // stdin inherit, stdout/stderr pipe for capture
  });
  
  // Output is captured in output variable, but we also want to show it
  // Since we're using pipe, we need to manually output it
  process.stdout.write(output);
  process.stderr.write(output);
  
  console.log('\n✓ All tests passed');
  process.exit(0);
} catch (error) {
  // Playwright exits with non-zero on failure
  const output = error.stdout || error.stderr || '';
  process.stdout.write(output);
  process.stderr.write(output);
  
  console.error('\n✗ Some tests failed');
  process.exit(1);
}
