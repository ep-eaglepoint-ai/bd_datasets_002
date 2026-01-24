// Meta-test for Assertion Presence
// Requirement 9: Meta-test for assertion presence must use Node.js fs module to read each Playwright test file and 
// parse it to verify that every test() block contains at least one expect() call or Playwright assertion method like 
// toBeVisible, toHaveText, or toHaveClass, flagging any tests that would pass vacuously due to missing assertions, 
// and this meta-test must itself fail if a new test is added without assertions.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('every test() block contains at least one expect() call or Playwright assertion method', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse test blocks - handle multi-line test blocks
    const lines = content.split('\n');
    let inTestBlock = false;
    let testBlockStart = -1;
    let testDescription = '';
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts a test block
      const testMatch = line.match(/test\(['"`]([^'"`]+)['"`]/);
      if (testMatch) {
        inTestBlock = true;
        testBlockStart = i;
        testDescription = testMatch[1];
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        continue;
      }
      
      // Track braces to find end of test block
      if (inTestBlock) {
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        
        // Check for expect() calls or Playwright assertion methods
        const hasExpect = /expect\(/.test(line);
        const hasPlaywrightAssertion = /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText|toHaveClass|toMatch|toBe|toEqual|toBeDefined|toBeUndefined|toBeTruthy|toBeFalsy|toHaveLength|toContain|toBeLessThan|toBeGreaterThan)\(/.test(line);
        
        if (hasExpect || hasPlaywrightAssertion) {
          // Found assertion, mark this test as OK
          inTestBlock = false;
          testBlockStart = -1;
          braceCount = 0;
          continue;
        }
        
        // Check if block ends (braceCount returns to 0)
        if (braceCount === 0 && testBlockStart !== -1) {
          // Test block ended without finding assertions
          const blockContent = lines.slice(testBlockStart, i + 1).join('\n');
          const hasAssertionInBlock = /expect\(/.test(blockContent) || 
                                     /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText|toHaveClass|toMatch|toBe|toEqual|toBeDefined|toBeUndefined|toBeTruthy|toBeFalsy|toHaveLength|toContain|toBeLessThan|toBeGreaterThan)\(/.test(blockContent);
          
          if (!hasAssertionInBlock) {
            issues.push({
              file,
              test: testDescription,
              line: testBlockStart + 1
            });
          }
          inTestBlock = false;
          testBlockStart = -1;
          braceCount = 0;
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Tests without assertions found (would pass vacuously):\n${issues.map(i => 
      `  - ${i.file}: "${i.test}" (line ${i.line})`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});
