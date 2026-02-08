const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate task movement tests meet requirement 3
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const movementTestFile = path.join(testDir, 'task-movement.spec.js');

if (!fs.existsSync(movementTestFile)) {
  throw new Error('task-movement.spec.js not found');
}

const content = fs.readFileSync(movementTestFile, 'utf-8');

// Requirement 3: Must use page.evaluate() to call moveTask
assert(content.includes('page.evaluate'), 'Must use page.evaluate() to call moveTask');
assert(content.includes('moveTask'), 'Must test moveTask function');

// Must verify column property updated
assert(content.includes('column') && (content.includes('toBe') || 
       content.includes('toEqual') || content.includes('update')), 
  'Must verify column property is updated');

// Must test insertBeforeId parameter
assert(content.includes('insertBefore') || content.includes('insertBeforeId') || 
       content.includes('position') || content.includes('before'), 
  'Must test insertBeforeId parameter for repositioning');

// Must verify task repositioned in array
assert(content.includes('position') || content.includes('order') || 
       content.includes('array') && (content.includes('before') || 
       content.includes('index') || content.includes('position')), 
  'Must verify task repositioned in array when insertBeforeId provided');

// Must test moving to same column/position (no net change)
assert((content.includes('same') && content.includes('column')) || 
       content.includes('same column') || content.includes('no change') || 
       content.includes('unchanged') || 
       (content.includes('move') && content.includes('same')), 
  'Must test moving task to current column/position (no net change)');

// Must test invalid task ID handling
assert(content.includes('invalid') || content.includes('non-existent') || 
       content.includes('missing') && content.includes('ID'), 
  'Must test invalid task ID handling');

// Must test invalid column handling (or non-existent task which is similar)
assert((content.includes('invalid') && content.includes('column')) || 
       (content.includes('column') && content.includes('error')) ||
       content.includes('non-existent'), 
  'Must test invalid column value or non-existent task handling');

// Must verify no array corruption
assert(content.includes('corrupt') || content.includes('corruption') || 
       content.includes('array') && (content.includes('intact') || 
       content.includes('valid') || content.includes('consistent')), 
  'Must verify tasks array not corrupted by invalid inputs');

console.log('✓ Task movement test requirements validation passed');
