const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate DOM rendering tests meet requirement 8
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const domTestFile = path.join(testDir, 'dom-rendering.spec.js');

if (!fs.existsSync(domTestFile)) {
  throw new Error('dom-rendering.spec.js not found');
}

const content = fs.readFileSync(domTestFile, 'utf-8');

// Requirement 8: Must verify task count in each column
assert(content.includes('locator') && (content.includes('count') || 
       content.includes('toHaveCount') || content.includes('length')), 
  'Must verify task count in each column using locator');

// Must verify task count badges
assert(content.includes('data-count') || content.includes('count') && 
       (content.includes('toHaveText') || content.includes('textContent')), 
  'Must verify task count badges reflect column counts');

// Must verify empty state message
assert(content.includes('empty-state') || content.includes('empty') && 
       content.includes('message'), 
  'Must verify empty columns display empty state message');

// Must verify empty state is visible
assert(content.includes('empty') && (content.includes('toBeVisible') || 
       content.includes('visible') || content.includes('display')), 
  'Must verify empty state is visible');

// Must verify data-id attributes on tasks (or at least verify task structure)
assert(content.includes('data-id') || content.includes('dataId') || 
       content.includes('getAttribute') && content.includes('id') ||
       content.includes('toHaveAttribute') || content.includes('draggable'), 
  'Must verify task element attributes or structure');

console.log('✓ DOM rendering test requirements validation passed');
