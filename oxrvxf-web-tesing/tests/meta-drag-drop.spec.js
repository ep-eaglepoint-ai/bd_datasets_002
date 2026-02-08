const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate drag-and-drop tests meet requirement 4
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const dragDropTestFile = path.join(testDir, 'drag-and-drop.spec.js');

if (!fs.existsSync(dragDropTestFile)) {
  throw new Error('drag-and-drop.spec.js not found');
}

const content = fs.readFileSync(dragDropTestFile, 'utf-8');

// Requirement 4: Must use page.locator().dragTo()
assert(content.includes('dragTo') || content.includes('.dragTo('), 
  'Must use page.locator().dragTo() method');

// Must verify task exists in target column DOM
assert(content.includes('locator') && (content.includes('column') || content.includes('data-column')), 
  'Must verify task exists in target column DOM container');

// Must verify tasks array reflects new column
assert(content.includes('page.evaluate') && content.includes('tasks') && 
       (content.includes('column') || content.includes('getTasksByColumn')), 
  'Must verify tasks array reflects new column via page.evaluate()');

// Must verify drag state classes cleaned up
assert(content.includes('dragging') || content.includes('drag-over') || 
       content.includes('toHaveClass') || content.includes('classList'), 
  'Must verify dragging and drag-over classes are cleaned up');

console.log('✓ Drag-and-drop test requirements validation passed');
