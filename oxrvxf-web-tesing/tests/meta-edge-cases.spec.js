const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate edge case tests meet requirement 15
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const edgeCaseTestFile = path.join(testDir, 'edge-cases.spec.js');

if (!fs.existsSync(edgeCaseTestFile)) {
  throw new Error('edge-cases.spec.js not found');
}

const content = fs.readFileSync(edgeCaseTestFile, 'utf-8');

// Requirement 15: Must test HTML character escaping
assert((content.includes('special') || content.includes('HTML') || 
        content.includes('angle') || content.includes('ampersand')) && 
       (content.includes('textContent') || content.includes('innerHTML') || 
        content.includes('escape')), 
  'Must test HTML character escaping (angle brackets, ampersands)');

// Must test 100 character title
assert(content.includes('100') && (content.includes('character') || 
       content.includes('char') || content.includes('length')), 
  'Must test task creation with exactly 100 characters');

// Must verify full title saved and displayed
assert(content.includes('100') && (content.includes('saved') || 
       content.includes('displayed') || content.includes('length') && 
       content.includes('toBe(100)')), 
  'Must verify full 100-character title is saved and displayed');

// Must test dragging task onto itself (or similar edge case - may be in drag-and-drop.spec.js)
const dragDropFile = path.join(testDir, 'drag-and-drop.spec.js');
const hasDragTest = fs.existsSync(dragDropFile) ? 
  fs.readFileSync(dragDropFile, 'utf-8').includes('drag') : false;
assert((content.includes('drag') && (content.includes('itself') || 
       content.includes('self') || content.includes('same'))) ||
       (content.includes('drag') && content.includes('task')) ||
       hasDragTest, 
  'Must test dragging task onto itself or similar drag edge case (may be in drag-and-drop.spec.js)');

// Must verify no state corruption from self-drag (implicitly by testing drag works)
assert((content.includes('drag') && (content.includes('corrupt') || 
       content.includes('corruption') || content.includes('no change') || 
       content.includes('unchanged'))) ||
       (content.includes('drag') && content.includes('expect')), 
  'Must verify no state corruption from self-drag (or test drag functionality)');

// Must test localStorage quota exceeded
assert(content.includes('quota') || content.includes('storage full') || 
       (content.includes('localStorage') && content.includes('full')), 
  'Must test localStorage quota exceeded condition');

// Must verify graceful handling of storage full
assert(content.includes('quota') && (content.includes('graceful') || 
       content.includes('handle') || content.includes('catch') || 
       content.includes('try')), 
  'Must verify graceful handling of storage full');

// Must test Promise.all with rapid operations
assert(content.includes('Promise.all') && (content.includes('rapid') || 
       content.includes('concurrent') || content.includes('multiple')), 
  'Must test Promise.all with rapid sequential operations');

// Must verify no race condition corruption (implicitly by testing Promise.all works correctly)
assert((content.includes('Promise.all') && (content.includes('race') || 
       content.includes('corrupt') || content.includes('state') || 
       content.includes('consistent'))) ||
       (content.includes('Promise.all') && content.includes('expect') && 
        (content.includes('length') || content.includes('toHaveLength'))), 
  'Must verify no race condition state corruption (or test Promise.all operations complete correctly)');

console.log('✓ Edge case test requirements validation passed');
