const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate test coverage
const appJsPath = path.join(__dirname, '../repository_after/kanban/app.js');
if (!fs.existsSync(appJsPath)) {
  throw new Error(`App file not found: ${appJsPath}`);
}

const appContent = fs.readFileSync(appJsPath, 'utf-8');

// Extract function names from app.js
const functionRegex = /function\s+(\w+)\s*\(/g;
const functions = [];
let match;

while ((match = functionRegex.exec(appContent)) !== null) {
  const funcName = match[1];
  // Skip internal/helper functions
  if (!['setupEventListeners', 'setupTaskEvents', 'getColumnFromElement', 
        'getDragAfterElement', 'escapeHtml', 'createTaskHTML'].includes(funcName)) {
    functions.push(funcName);
  }
}

// Required functions that must be tested
const requiredFunctions = [
  'createTask',
  'deleteTask',
  'updateTask',
  'moveTask',
  'getTasksByColumn',
  'loadState',
  'saveState',
];

const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

const allTestContent = testFiles.map(file => 
  fs.readFileSync(path.join(testDir, file), 'utf-8')
).join('\n');

const missingTests = [];

for (const func of requiredFunctions) {
  // Check if function is directly tested or indirectly tested
  const directTest = allTestContent.includes(func);
  // loadState and saveState might be tested indirectly through localStorage
  const indirectTest = (func === 'loadState' || func === 'saveState') && 
                       (allTestContent.includes('localStorage') || 
                        allTestContent.includes('persist') ||
                        allTestContent.includes('reload'));
  
  if (!directTest && !indirectTest) {
    missingTests.push(func);
  }
}

assert(missingTests.length === 0, `Functions without tests: ${missingTests.join(', ')}`);

// Check for edge case test file
const hasEdgeCaseFile = testFiles.some(file => 
  file.toLowerCase().includes('edge')
);

assert(hasEdgeCaseFile, 'Edge case test file not found');

// Check for common edge cases in tests
const edgeCasePatterns = [
  'empty',
  'non-existent',
  'invalid',
  'corrupted',
  'whitespace',
  'long',
  'special',
  'concurrent',
];

const coveredEdgeCases = edgeCasePatterns.filter(pattern =>
  allTestContent.toLowerCase().includes(pattern)
);

// Should cover at least some edge cases
assert(coveredEdgeCases.length > 3, `Not enough edge cases covered. Found: ${coveredEdgeCases.join(', ')}`);

// Verify task creation test uses page.evaluate()
const creationTestFile = path.join(testDir, 'task-creation.spec.js');

if (!fs.existsSync(creationTestFile)) {
  throw new Error('task-creation.spec.js not found');
}

const content = fs.readFileSync(creationTestFile, 'utf-8');

// Must use page.evaluate() for createTask
assert(content.includes('page.evaluate'), 'task-creation.spec.js must use page.evaluate');
assert(content.includes('createTask'), 'task-creation.spec.js must test createTask');
// Check for ID pattern validation - can be in various forms
const hasIdPattern = /task-\d+-[a-z0-9]+/.test(content) || 
                     /task\.id.*match/.test(content) || 
                     /\.toMatch.*task-\d+/.test(content) ||
                     /expect\(.*id.*\)\.toMatch/.test(content);
assert(hasIdPattern, 'task-creation.spec.js must verify ID pattern (task-<timestamp>-<random>)');
assert(content.includes('localStorage'), 'task-creation.spec.js must verify localStorage');
assert(content.includes('window.tasks'), 'task-creation.spec.js must verify tasks array');

console.log('✓ Test coverage validation passed');
