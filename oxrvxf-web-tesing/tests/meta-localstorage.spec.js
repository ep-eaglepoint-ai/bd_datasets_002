const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate localStorage persistence tests meet requirement 5
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const persistenceTestFile = path.join(testDir, 'localstorage-persistence.spec.js');

if (!fs.existsSync(persistenceTestFile)) {
  throw new Error('localstorage-persistence.spec.js not found');
}

const content = fs.readFileSync(persistenceTestFile, 'utf-8');

// Requirement 5: Must pre-populate localStorage before reload
assert(content.includes('localStorage') && (content.includes('setItem') || content.includes('pre-populate')), 
  'Must pre-populate localStorage before page.reload()');

// Must verify DOM matches persisted state after reload
assert(content.includes('reload') && (content.includes('DOM') || content.includes('locator') || 
       content.includes('render') || content.includes('visible')), 
  'Must verify DOM matches persisted state after reload');

// Must test corrupted JSON handling
assert(content.includes('corrupted') || content.includes('malformed') || 
       (content.includes('invalid') && content.includes('json')) ||
       (content.includes('invalid json') || content.includes('corrupted')), 
  'Must test corrupted/malformed JSON in localStorage');

// Must verify graceful fallback for corrupted data
assert(content.includes('fallback') || content.includes('graceful') || 
       content.includes('catch') || content.includes('try') || 
       content.includes('does not crash') || content.includes('still renders'), 
  'Must verify graceful fallback for corrupted localStorage');

// Must test empty localStorage initialization
assert(content.includes('empty') && content.includes('localStorage') || 
       content.includes('clear') && content.includes('default'), 
  'Must test empty localStorage initializes with default tasks');

// Must verify localStorage after every state-modifying action
assert(content.includes('page.evaluate') && content.includes('localStorage') && 
       (content.includes('createTask') || content.includes('deleteTask') || 
        content.includes('updateTask') || content.includes('moveTask')), 
  'Must verify localStorage after state-modifying actions');

console.log('✓ LocalStorage persistence test requirements validation passed');
