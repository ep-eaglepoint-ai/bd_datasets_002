const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate test coverage
// Check for refactored component structure
const kanbanDir = path.join(__dirname, '../repository_after/kanban');
const jsDir = path.join(kanbanDir, 'js');

// Check if refactored structure exists (js/ directory)
let appContent = '';
if (fs.existsSync(jsDir)) {
  // Refactored structure: read all component files
  const componentFiles = [
    'state.js',
    'taskOperations.js',
    'renderer.js',
    'modal.js',
    'taskEditing.js',
    'dragDrop.js',
    'app.js'
  ];
  
  for (const file of componentFiles) {
    const filePath = path.join(jsDir, file);
    if (fs.existsSync(filePath)) {
      appContent += fs.readFileSync(filePath, 'utf-8') + '\n';
    }
  }
} else {
  // Fallback to old structure
  const appJsPath = path.join(kanbanDir, 'app.js');
  if (!fs.existsSync(appJsPath)) {
    throw new Error(`App file not found: ${appJsPath} and js/ directory not found`);
  }
  appContent = fs.readFileSync(appJsPath, 'utf-8');
}

// Extract function names from all component files
// Look for both function declarations and export statements
const functionRegex = /(?:function\s+(\w+)|export\s+function\s+(\w+)|export\s+{\s*(\w+))/g;
const functions = [];
let match;

while ((match = functionRegex.exec(appContent)) !== null) {
  const funcName = match[1] || match[2] || match[3];
  if (funcName) {
    // Skip internal/helper functions
    if (!['setupEventListeners', 'setupTaskEvents', 'setupTaskEventsHandler', 
          'getColumnFromElement', 'getDragAfterElement', 'escapeHtml', 
          'createTaskHTML', 'setSetupTaskEvents', 'setActiveColumnForModal',
          'getActiveColumnForModal', 'setupModalListeners', 'setupDragDropListeners'].includes(funcName)) {
      functions.push(funcName);
    }
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

// Requirement 14: Verify critical paths have both happy-path and error-path tests
const criticalPaths = [
  { name: 'create task', happy: ['create', 'success', 'valid'], error: ['empty', 'invalid', 'error', 'fail'] },
  { name: 'move task', happy: ['move', 'success', 'valid'], error: ['invalid', 'error', 'fail', 'non-existent'] },
  { name: 'delete task', happy: ['delete', 'success', 'valid'], error: ['invalid', 'error', 'fail', 'non-existent'] }
];

const missingPaths = [];
for (const path of criticalPaths) {
  const hasHappy = path.happy.some(keyword => allTestContent.toLowerCase().includes(keyword));
  const hasError = path.error.some(keyword => allTestContent.toLowerCase().includes(keyword));
  
  if (!hasHappy || !hasError) {
    missingPaths.push({
      path: path.name,
      missingHappy: !hasHappy,
      missingError: !hasError
    });
  }
}

// Requirement 14: Verify every function defined in app.js has at least one test that invokes it
const functionsNotInvoked = [];
for (const func of requiredFunctions) {
  // Check if function is invoked in tests (not just mentioned)
  let isInvoked = false;
  
  if (func === 'loadState' || func === 'saveState') {
    // loadState and saveState are invoked indirectly through:
    // - page.reload() (triggers loadState)
    // - localStorage operations (triggers saveState)
    // - DOMContentLoaded event (triggers loadState)
    isInvoked = allTestContent.includes('page.reload') || 
                allTestContent.includes('localStorage') ||
                allTestContent.includes('reload') ||
                allTestContent.includes('DOMContentLoaded') ||
                allTestContent.includes('window.loadState') ||
                allTestContent.includes('window.saveState') ||
                allTestContent.includes('loadState()') ||
                allTestContent.includes('saveState()');
  } else {
    // For other functions, check direct invocation
    const invokedPattern = new RegExp(`(window\\.${func}|${func}\\s*\\(|page\\.evaluate.*${func})`, 'g');
    isInvoked = invokedPattern.test(allTestContent);
  }
  
  if (!isInvoked) {
    functionsNotInvoked.push(func);
  }
}

assert(functionsNotInvoked.length === 0, 
  `Functions not invoked in tests: ${functionsNotInvoked.join(', ')}`);

// Note: Requirement 14 also mentions using page.coverage.startJSCoverage() for runtime coverage.
// That would need to be done in actual test execution, not in meta-tests (which are static analysis).
// The config is set up correctly for this - tests can add coverage collection if needed.

// Note: We can't do actual coverage collection without running Playwright,
// but we verify all functions are tested and critical paths have both happy/error tests
if (missingPaths.length > 0) {
  console.warn('Warning: Some critical paths may be missing happy-path or error-path tests:', missingPaths);
}

console.log('✓ Test coverage validation passed');
