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

console.log('✓ Test isolation validation passed');
