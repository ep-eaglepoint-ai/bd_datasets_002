// Meta-test for Description Accuracy
// Requirement 13: Meta-test for description accuracy must use pattern matching on test file contents to verify 
// that test descriptions containing words like "creates" have assertions checking for element creation or array 
// length increases, descriptions containing "deletes" have assertions checking for element removal or array length 
// decreases, and descriptions containing "fails" or "error" have assertions checking for error conditions or 
// unchanged state, flagging misleading descriptions that do not match their test behavior.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('test descriptions containing "creates", "deletes", "fails", or "error" match their test behavior', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find all test descriptions using pattern matching
    const testRegex = /test\(['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
      const description = match[1].toLowerCase();
      const testStartIndex = match.index;
      
      // Find the test body (next 100 lines or until next test)
      const lines = content.split('\n');
      const testLineIndex = content.substring(0, testStartIndex).split('\n').length - 1;
      const testBody = lines.slice(testLineIndex, Math.min(testLineIndex + 100, lines.length)).join('\n');
      
      // Pattern matching: descriptions containing "creates" must have assertions checking for element creation or array length increases
      if (description.includes('creates') || description.includes('create')) {
        const hasCreationCheck = /\.length.*\+|\.length.*>|toHaveCount.*\+|toHaveCount.*>|find.*title.*toBeDefined|createTask|toHaveLength.*\+|toHaveLength.*>/.test(testBody);
        if (!hasCreationCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "creates" but test does not check for element creation or array length increase'
          });
        }
      }
      
      // Pattern matching: descriptions containing "deletes" must have assertions checking for element removal or array length decreases
      if (description.includes('deletes') || description.includes('delete')) {
        const hasDeletionCheck = /\.length.*-|\.length.*<|toHaveCount.*-|toHaveCount.*<|find.*toBeUndefined|deleteTask|toHaveLength.*-|toHaveLength.*<|toBeUndefined/.test(testBody);
        if (!hasDeletionCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "deletes" but test does not check for element removal or array length decrease'
          });
        }
      }
      
      // Pattern matching: descriptions containing "fails" or "error" must have assertions checking for error conditions or unchanged state
      if (description.includes('fails') || description.includes('error') || description.includes('invalid') || description.includes('non-existent') || description.includes('gracefully')) {
        const hasErrorCheck = /not.*throw|catch|toBeUndefined|not.*toBeDefined|not.*toHaveClass|not.*toBeVisible|not.*toHaveText|not.*toHaveCount|unchanged|not.*modified|not.*corrupted/.test(testBody);
        if (!hasErrorCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "fails" or "error" but test does not check for error conditions or unchanged state'
          });
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Misleading test descriptions that do not match their test behavior:\n${issues.map(i => 
      `  - ${i.file}: "${i.test}" - ${i.issue}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});
