const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate modal interaction tests meet requirement 6
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const modalTestFile = path.join(testDir, 'modal-interaction.spec.js');

if (!fs.existsSync(modalTestFile)) {
  throw new Error('modal-interaction.spec.js not found');
}

const content = fs.readFileSync(modalTestFile, 'utf-8');

// Requirement 6: Must use locator to click add-task-btn
assert(content.includes('add-task-btn') || content.includes('addTaskBtn'), 
  'Must use locator to click add-task-btn');

// Must verify modal becomes visible with active class
assert(content.includes('modal') && (content.includes('toHaveClass') || 
       content.includes('active') || content.includes('toBeVisible')), 
  'Must verify modal has active class or is visible');

// Must verify input receives focus
assert(content.includes('task-input') && (content.includes('toBeFocused') || 
       content.includes('focus') || content.includes('activeElement')), 
  'Must verify input receives focus');

// Must test empty/whitespace title submission
assert((content.includes('empty') || content.includes('whitespace')) && 
       (content.includes('submit') || content.includes('Enter')), 
  'Must test empty/whitespace title submission');

// Must verify no task created with empty title
assert(content.includes('empty') && (content.includes('not create') || 
       content.includes('toHaveLength') && content.includes('0') || 
       content.includes('length') && content.includes('toBe(0)')), 
  'Must verify no task created with empty title');

// Must test Escape key closes modal
assert(content.includes('Escape') || content.includes('Escape') && 
       (content.includes('keyboard') || content.includes('press')), 
  'Must test Escape key closes modal');

// Must test overlay click closes modal
assert(content.includes('overlay') && (content.includes('click') || 
       content.includes('position') || content.includes('backdrop')), 
  'Must test overlay/backdrop click closes modal');

console.log('✓ Modal interaction test requirements validation passed');
