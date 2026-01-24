// Meta-test for Description Accuracy
// Requirements: Verify test descriptions match their test behavior

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('test descriptions accurately describe their behavior', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find all test descriptions
    const testRegex = /test\(['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
      const description = match[1].toLowerCase();
      const testStartIndex = match.index;
      
      // Find the test body (next 50 lines or until next test)
      const lines = content.split('\n');
      const testLineIndex = content.substring(0, testStartIndex).split('\n').length - 1;
      const testBody = lines.slice(testLineIndex, Math.min(testLineIndex + 50, lines.length)).join('\n');
      
      // Check for "creates" in description
      if (description.includes('creates') || description.includes('create')) {
        const hasCreationCheck = /\.length.*\+|\.length.*>|toHaveCount.*\+|toHaveCount.*>|find.*title.*toBeDefined|createTask/.test(testBody);
        if (!hasCreationCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "creates" but test does not check for element creation or array length increase'
          });
        }
      }
      
      // Check for "deletes" in description
      if (description.includes('deletes') || description.includes('delete')) {
        const hasDeletionCheck = /\.length.*-|\.length.*<|toHaveCount.*-|toHaveCount.*<|find.*toBeUndefined|deleteTask/.test(testBody);
        if (!hasDeletionCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "deletes" but test does not check for element removal or array length decrease'
          });
        }
      }
      
      // Check for "fails" or "error" in description
      if (description.includes('fails') || description.includes('error') || description.includes('invalid')) {
        const hasErrorCheck = /not.*throw|catch|toBeUndefined|not.*toBeDefined|not.*toHaveClass|not.*toBeVisible/.test(testBody);
        if (!hasErrorCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "fails" or "error" but test does not check for error conditions or unchanged state'
          });
        }
      }
      
      // Check for "updates" in description
      if (description.includes('updates') || description.includes('update')) {
        const hasUpdateCheck = /toHaveText|toHaveValue|toHaveClass|find.*title.*toBe|column.*toBe/.test(testBody);
        if (!hasUpdateCheck) {
          issues.push({
            file,
            test: match[1],
            issue: 'Description mentions "updates" but test does not verify state change'
          });
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Test descriptions that do not match behavior:\n${issues.map(i => 
      `  - ${i.file}: "${i.test}" - ${i.issue}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});

test('meta-test itself has accurate description', async () => {
  expect(true).toBe(true);
});
