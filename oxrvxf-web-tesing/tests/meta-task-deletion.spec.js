const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate task deletion tests meet requirement 2
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const deletionTestFile = path.join(testDir, 'task-deletion.spec.js');

if (!fs.existsSync(deletionTestFile)) {
  throw new Error('task-deletion.spec.js not found');
}

const content = fs.readFileSync(deletionTestFile, 'utf-8');

// Requirement 2: Must use page.evaluate() to call deleteTask
assert(content.includes('page.evaluate'), 'Must use page.evaluate() to call deleteTask');
assert(content.includes('deleteTask'), 'Must test deleteTask function');

// Must verify exactly one task removed
assert(content.includes('toHaveLength') || content.includes('length') && content.includes('toBe'), 
  'Must verify exactly one task removed from array');

// Must verify other tasks untouched
assert(content.includes('other') || content.includes('remaining') || 
       content.includes('length') && content.includes('toBe'), 
  'Must verify other tasks remain untouched');

// Must verify localStorage updated
assert(content.includes('localStorage'), 'Must verify localStorage updated after deletion');

// Must test non-existent ID handling
assert(content.includes('non-existent') || content.includes('invalid') || 
       content.includes('not exist') || content.includes('missing'), 
  'Must test deleteTask with non-existent ID');

// Must verify no error thrown for non-existent ID (implicitly by verifying task still exists)
assert(content.includes('try') || content.includes('catch') || 
       content.includes('not throw') || content.includes('does not throw') ||
       (content.includes('non-existent') && content.includes('toHaveLength')), 
  'Must verify non-existent ID handled gracefully (either explicit check or implicit via array length)');

console.log('✓ Task deletion test requirements validation passed');
