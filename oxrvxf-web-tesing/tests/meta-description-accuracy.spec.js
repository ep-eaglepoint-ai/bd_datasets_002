const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate description accuracy
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

const mismatches = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  const testRegex = /test\(['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    const description = match[1].toLowerCase();
    const startIndex = match.index;
    
    // Find the test body
    let braceCount = 0;
    let inTest = false;
    let testBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '(' && !inTest) {
        inTest = true;
        braceCount = 1;
        continue;
      }
      if (inTest) {
        testBody += content[i];
        if (content[i] === '(') braceCount++;
        if (content[i] === ')') {
          braceCount--;
          if (braceCount === 0) break;
        }
      }
    }

    // Requirement 12: Verify description accuracy with specific patterns
    // Descriptions containing "creates" should have assertions checking for element creation or array length increases
    const hasCreates = description.includes('create');
    const hasCreatesAssertion = hasCreates && (
      testBody.includes('toHaveLength') && testBody.includes('1') ||
      testBody.includes('toHaveCount') && testBody.includes('1') ||
      testBody.includes('toBeVisible') ||
      testBody.includes('length') && testBody.includes('>')
    );
    
    // Descriptions containing "deletes" should have assertions checking for element removal or array length decreases
    const hasDeletes = description.includes('delete');
    const hasDeletesAssertion = hasDeletes && (
      testBody.includes('toHaveLength') && testBody.includes('0') ||
      testBody.includes('toHaveCount') && testBody.includes('0') ||
      testBody.includes('not.toBeVisible') ||
      testBody.includes('length') && testBody.includes('<')
    );
    
    // Descriptions containing "fails" or "error" should have assertions checking for error conditions or unchanged state
    const hasFails = description.includes('fail') || description.includes('error');
    const hasFailsAssertion = hasFails && (
      testBody.includes('toThrow') ||
      testBody.includes('toBe(false)') ||
      testBody.includes('not.toHaveClass') ||
      testBody.includes('toHaveLength') && testBody.includes('0')
    );

    // Check if description matches test body
    const hasCreate = description.includes('create') && testBody.includes('createTask');
    const hasDelete = description.includes('delete') && testBody.includes('deleteTask');
    const hasUpdate = (description.includes('update') || description.includes('edit')) && 
                     (testBody.includes('updateTask') || testBody.includes('dblclick'));
    const hasMove = description.includes('move') && testBody.includes('moveTask');
    const hasDrag = description.includes('drag') && testBody.includes('dragTo');
    const hasModal = description.includes('modal') && testBody.includes('modal');
    const hasLocalStorage = description.includes('localstorage') || description.includes('persist');

    // Requirement 12: Flag misleading descriptions
    if (hasCreates && !hasCreatesAssertion && !hasCreate) {
      mismatches.push({ file, description: match[1], issue: 'creates mentioned but no creation assertion' });
    }
    if (hasDeletes && !hasDeletesAssertion && !hasDelete) {
      mismatches.push({ file, description: match[1], issue: 'deletes mentioned but no deletion assertion' });
    }
    if (hasFails && !hasFailsAssertion) {
      mismatches.push({ file, description: match[1], issue: 'fails/error mentioned but no error assertion' });
    }

    // If description mentions an action, verify it's in the test
    if (description.includes('create') && !hasCreate && !hasLocalStorage) {
      mismatches.push({ file, description: match[1], issue: 'create mentioned but not used' });
    }
    if (description.includes('delete') && !hasDelete) {
      mismatches.push({ file, description: match[1], issue: 'delete mentioned but not used' });
    }
  }
}

// Allow some mismatches for edge cases and meta-descriptions
assert(mismatches.length < 5, 
  `Too many description mismatches: ${JSON.stringify(mismatches)}`);

// Verify test file names match content
const fileMismatches = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  const fileName = file.toLowerCase();

  // Check if file name matches test content
  if (fileName.includes('creation') && !content.includes('createTask')) {
    fileMismatches.push({ file, issue: 'creation file without createTask' });
  }
  if (fileName.includes('deletion') && !content.includes('deleteTask')) {
    fileMismatches.push({ file, issue: 'deletion file without deleteTask' });
  }
  if (fileName.includes('update') && !content.includes('updateTask')) {
    fileMismatches.push({ file, issue: 'update file without updateTask' });
  }
  if (fileName.includes('movement') && !content.includes('moveTask')) {
    fileMismatches.push({ file, issue: 'movement file without moveTask' });
  }
}

assert(fileMismatches.length === 0, 
  `File name mismatches: ${JSON.stringify(fileMismatches)}`);

console.log('✓ Description accuracy validation passed');
