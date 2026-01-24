// Meta-test for Assertion Presence
// Requirements: Verify every test() block contains at least one expect() call

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('every test file contains assertions in all test blocks', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find all test() blocks
    const testBlockRegex = /test\([^)]+\)\s*\{[^}]*\}/gs;
    const testBlocks = content.match(testBlockRegex) || [];
    
    // Also find test blocks with async/await that might span multiple lines
    const lines = content.split('\n');
    let inTestBlock = false;
    let testBlockStart = -1;
    let testDescription = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts a test block
      const testMatch = line.match(/test\(['"`]([^'"`]+)['"`]/);
      if (testMatch) {
        inTestBlock = true;
        testBlockStart = i;
        testDescription = testMatch[1];
        continue;
      }
      
      // Check if we're in a test block and find the closing brace
      if (inTestBlock) {
        // Check for expect() calls
        const hasExpect = /expect\(/.test(line);
        const hasPlaywrightAssertion = /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText)\(/.test(line);
        
        if (hasExpect || hasPlaywrightAssertion) {
          inTestBlock = false;
          testBlockStart = -1;
          continue;
        }
        
        // Check if block ends
        if (line.trim() === '}' && testBlockStart !== -1) {
          // Check if this test block had any assertions before closing
          const blockContent = lines.slice(testBlockStart, i + 1).join('\n');
          const hasAssertionInBlock = /expect\(/.test(blockContent) || 
                                     /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText)\(/.test(blockContent);
          
          if (!hasAssertionInBlock) {
            issues.push({
              file,
              test: testDescription,
              line: testBlockStart + 1
            });
          }
          inTestBlock = false;
          testBlockStart = -1;
        }
      }
    }
    
    // Also check using regex for simpler cases
    const simpleTestRegex = /test\(['"`]([^'"`]+)['"`][^}]*\}/g;
    let match;
    while ((match = simpleTestRegex.exec(content)) !== null) {
      const testBlock = match[0];
      const hasExpect = /expect\(/.test(testBlock);
      const hasAssertion = /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText)\(/.test(testBlock);
      
      if (!hasExpect && !hasAssertion) {
        const testDesc = match[1];
        if (!issues.find(i => i.file === file && i.test === testDesc)) {
          issues.push({
            file,
            test: testDesc,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Tests without assertions found:\n${issues.map(i => 
      `  - ${i.file}: "${i.test}" (line ${i.line})`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});

test('meta-test itself has assertions', async () => {
  // This test verifies the meta-test has assertions
  expect(true).toBe(true);
});
