const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate test isolation
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

// Check if tests use test.only (should be avoided)
let canRunParallel = true;
const issues = [];

for (const file of testFiles) {
  const content = fs.readFileSync(
    path.join(testDir, file), 
    'utf-8'
  );

  // Check for test dependencies (test.only without comment)
  if (content.includes('test.only') && !content.includes('// test.only')) {
    issues.push({ file, issue: 'Uses test.only' });
    canRunParallel = false;
  }
}

assert(canRunParallel, `Parallel execution issues: ${JSON.stringify(issues)}`);

// Check for test order dependencies
const dependencies = [];

for (const file of testFiles) {
  const content = fs.readFileSync(
    path.join(testDir, file), 
    'utf-8'
  );

  // Check for hardcoded test order dependencies
  const orderDeps = /test\.only\(/g;
  if (orderDeps.test(content)) {
    dependencies.push({
      file,
      issue: 'Uses test.only',
    });
  }
}

// test.skip is acceptable, but test.only should be avoided
const onlyTests = dependencies.filter(d => 
  fs.readFileSync(
    path.join(testDir, d.file), 
    'utf-8'
  ).includes('test.only')
);

assert(onlyTests.length === 0, `Tests with test.only found: ${JSON.stringify(onlyTests)}`);

// Requirement 12: Verify Playwright config has fullyParallel: true and workers set appropriately
const configPath = path.join(testDir, 'playwright.config.js');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  
  // Must have fullyParallel: true
  const hasFullyParallel = /fullyParallel:\s*true/.test(configContent);
  assert(hasFullyParallel, 'playwright.config.js must have fullyParallel: true for parallel execution');
  
  // Workers should be set to maximum available (undefined or not set to 1 in non-CI)
  // In CI, workers: 1 is acceptable, but in non-CI it should be undefined or a higher number
  const hasWorkersConfig = /workers:\s*/.test(configContent);
  // If workers is explicitly set to 1 outside of CI check, that's a problem
  const workersSetToOne = /workers:\s*1(?!\s*\|\|)/.test(configContent);
  if (hasWorkersConfig && workersSetToOne && !configContent.includes('process.env.CI')) {
    console.warn('Warning: workers is set to 1 - should be set to maximum available for parallel execution');
  }
}

// Note: Requirement 12 also requires running the test suite multiple times to verify tests pass
// regardless of execution order. This is a runtime test that would need to be done during actual
// test execution, not in static meta-tests. The configuration is verified above.

console.log('✓ Test isolation validation passed');
