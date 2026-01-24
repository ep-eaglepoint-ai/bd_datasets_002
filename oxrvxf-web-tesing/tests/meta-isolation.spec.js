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

console.log('✓ Test isolation validation passed');
