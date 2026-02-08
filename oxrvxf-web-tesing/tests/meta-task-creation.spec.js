const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate task creation tests meet requirement 1
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const creationTestFile = path.join(testDir, 'task-creation.spec.js');

if (!fs.existsSync(creationTestFile)) {
  throw new Error('task-creation.spec.js not found');
}

const content = fs.readFileSync(creationTestFile, 'utf-8');

// Requirement 1: Must use page.evaluate() to call createTask
assert(content.includes('page.evaluate'), 'Must use page.evaluate() to call createTask');
assert(content.includes('createTask'), 'Must test createTask function');

// Must verify returned task object structure
assert(content.includes('task.id') || content.includes('task[\'id\']') || content.includes('task["id"]'), 
  'Must verify task.id property');
assert(content.includes('task.title') || content.includes('task[\'title\']'), 
  'Must verify task.title property');
assert(content.includes('task.column') || content.includes('task[\'column\']'), 
  'Must verify task.column property');

// Must verify ID pattern: task-<timestamp>-<random>
const hasIdPattern = /task-\d+-[a-z0-9]+/.test(content) || 
                     /\.toMatch.*task-\d+/.test(content) ||
                     /expect\([^)]*id[^)]*\)\.toMatch/.test(content);
assert(hasIdPattern, 'Must verify ID matches pattern "task-<timestamp>-<random>"');

// Must verify title matches trimmed input
assert(content.includes('trim') || content.includes('title') && content.includes('toBe'), 
  'Must verify title matches trimmed input');

// Must verify column matches specified column
assert(content.includes('column') && (content.includes('toBe') || content.includes('toEqual')), 
  'Must verify column property matches specified column');

// Must verify task appended to global tasks array
assert(content.includes('window.tasks') || content.includes('tasks array'), 
  'Must verify task was appended to global tasks array');

// Must verify localStorage contains serialized state
assert(content.includes('localStorage'), 'Must verify localStorage contains updated state');
assert(content.includes('kanban-board-state') || content.includes('STORAGE_KEY') || 
       content.includes('getItem') || content.includes('setItem'), 
  'Must verify localStorage key and serialized state');

console.log('✓ Task creation test requirements validation passed');
