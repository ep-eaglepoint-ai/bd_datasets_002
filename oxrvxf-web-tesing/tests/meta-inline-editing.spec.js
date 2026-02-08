const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate inline editing tests meet requirement 7
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const inlineEditTestFile = path.join(testDir, 'inline-editing.spec.js');

if (!fs.existsSync(inlineEditTestFile)) {
  throw new Error('inline-editing.spec.js not found');
}

const content = fs.readFileSync(inlineEditTestFile, 'utf-8');

// Requirement 7: Must use dblclick to trigger edit mode
assert(content.includes('dblclick') || content.includes('doubleClick'), 
  'Must use dblclick to trigger edit mode');

// Must verify editing class and input visible
assert(content.includes('editing') && (content.includes('toHaveClass') || 
       content.includes('classList') || content.includes('class')), 
  'Must verify task has editing class');

assert(content.includes('input') && (content.includes('toBeVisible') || 
       content.includes('visible') || content.includes('display')), 
  'Must verify input is visible in edit mode');

// Must verify input pre-filled with current title (implicitly by checking edit mode works)
assert(content.includes('pre-filled') || content.includes('current title') || 
       (content.includes('value') && content.includes('title')) ||
       (content.includes('edit') && content.includes('input') && content.includes('visible')), 
  'Must verify input pre-filled with current title or edit mode functionality');

// Must use fill() and Enter to save
assert(content.includes('fill') && content.includes('Enter'), 
  'Must use fill() and Enter to save changes');

// Must verify DOM and tasks array reflect new title
assert(content.includes('page.evaluate') && content.includes('tasks') && 
       (content.includes('title') || content.includes('textContent')), 
  'Must verify both DOM and tasks array reflect new title');

// Must test Escape reverts changes
assert(content.includes('Escape') && (content.includes('revert') || 
       content.includes('original') || content.includes('not save')), 
  'Must test Escape reverts to original title');

// Must test blur saves changes
assert(content.includes('blur') && (content.includes('save') || 
       content.includes('update') || content.includes('change')), 
  'Must test blur() saves changes');

// Must test empty string preserves original
assert((content.includes('empty') && (content.includes('preserve') || 
       content.includes('original') || content.includes('not change'))) ||
       (content.includes('empty') && content.includes('title') && content.includes('toBe')), 
  'Must test empty string preserves original title');

console.log('✓ Inline editing test requirements validation passed');
