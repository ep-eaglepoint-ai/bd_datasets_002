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

const testsWithoutIsolation = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  
  // Check if file has beforeEach
  const hasBeforeEach = /test\.beforeEach|beforeEach\(/.test(content);
  
  // Check if tests modify localStorage or state
  const modifiesState = /localStorage|window\.tasks|page\.evaluate/.test(content);
  
  // Check if test clears state in the test itself (acceptable for persistence tests)
  const clearsInTest = /localStorage\.clear|window\.tasks\s*=\s*\[\]/.test(content);

  // Persistence tests might not need beforeEach if they clear in test
  const isPersistenceTest = file.toLowerCase().includes('persist') || 
                           file.toLowerCase().includes('localstorage');

  if (modifiesState && !hasBeforeEach && !(clearsInTest && isPersistenceTest)) {
    testsWithoutIsolation.push(file);
  }
}

assert(testsWithoutIsolation.length === 0, 
  `Tests without proper isolation: ${testsWithoutIsolation.join(', ')}`);

// Verify beforeEach clears state
const improperCleanup = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  
  if (content.includes('beforeEach')) {
    // Check if beforeEach clears localStorage or resets state
    const clearsState = /localStorage\.clear|window\.tasks\s*=\s*\[\]|page\.evaluate.*clear/.test(content);
    
    if (!clearsState) {
      improperCleanup.push(file);
    }
  }
}

assert(improperCleanup.length === 0, 
  `Tests with improper cleanup: ${improperCleanup.join(', ')}`);

// Check for global state pollution (warning only, not failure)
const globalPollution = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  
  // Check for global variable declarations outside of page.evaluate
  const globalVars = /(let|const|var)\s+\w+\s*=\s*\[/g;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (globalVars.test(line) && !line.includes('page.evaluate') && !line.includes('async')) {
      globalPollution.push({
        file,
        line: index + 1,
      });
    }
  });
}

// This is a warning, not a failure - some tests might legitimately use module-level vars
if (globalPollution.length > 0) {
  console.warn('Potential global state pollution:', JSON.stringify(globalPollution));
}

// Requirement 10: Verify each test file includes a test.beforeEach hook
const missingBeforeEach = [];
for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  const hasBeforeEach = /test\.beforeEach|beforeEach\(/.test(content);
  const hasPageGoto = /page\.goto/.test(content);
  
  // Persistence tests that test across reloads might not use beforeEach
  // because they're testing state persistence, not isolation
  const isPersistenceTest = file.toLowerCase().includes('persist') || 
                           file.toLowerCase().includes('localstorage');
  
  // Check if test clears state in test itself (acceptable alternative to beforeEach)
  const clearsInTest = /localStorage\.clear|window\.tasks\s*=\s*\[\]/.test(content);
  
  // If test uses page.goto, it should have beforeEach for isolation
  // Exception: persistence tests that clear state in the test itself
  if (hasPageGoto && !hasBeforeEach && !(isPersistenceTest && clearsInTest)) {
    missingBeforeEach.push(file);
  }
}

assert(missingBeforeEach.length === 0, 
  `Test files missing beforeEach hook: ${missingBeforeEach.join(', ')}`);

// Requirement 11: Verify Playwright config has fullyParallel: true
const configPath = path.join(testDir, 'playwright.config.js');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const hasFullyParallel = /fullyParallel:\s*true/.test(configContent);
  assert(hasFullyParallel, 'playwright.config.js must have fullyParallel: true');
}

console.log('✓ Test isolation validation passed');
