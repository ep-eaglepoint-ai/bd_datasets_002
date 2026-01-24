// Meta-test for Async Handling
// Requirements: Verify all Playwright actions are properly awaited

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('all Playwright locator actions are properly awaited', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '') {
        continue;
      }
      
      // Check for locator actions without await
      const locatorActions = [
        /\.click\(/,
        /\.fill\(/,
        /\.dragTo\(/,
        /\.press\(/,
        /\.type\(/,
        /\.selectOption\(/,
        /\.check\(/,
        /\.uncheck\(/,
        /\.hover\(/,
        /\.focus\(/,
        /\.blur\(/,
        /\.scrollIntoViewIfNeeded\(/,
        /\.screenshot\(/,
        /\.waitFor\(/,
        /page\.goto\(/,
        /page\.reload\(/,
        /page\.evaluate\(/
      ];
      
      for (const pattern of locatorActions) {
        if (pattern.test(line)) {
          // Check if line has await
          const hasAwait = /^\s*await\s+/.test(line);
          
          // Check if it's in a variable assignment (which might be okay)
          const isAssignment = /^\s*(const|let|var)\s+\w+\s*=/.test(line);
          
          // Check if previous line has await
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          const prevHasAwait = /await\s+$/.test(prevLine);
          
          if (!hasAwait && !isAssignment && !prevHasAwait) {
            // Exception: expect() calls don't need await in some cases
            if (!/expect\(/.test(line)) {
              issues.push({
                file,
                line: i + 1,
                code: trimmed.substring(0, 80)
              });
              break; // Only report once per line
            }
          }
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Potential missing await statements:\n${issues.map(i => 
      `  - ${i.file}:${i.line} - ${i.code}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});

test('all expect assertions on locators are properly handled', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const issues = [];
  
  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for expect() with locator
      if (/expect\(.*page\.locator\(/.test(line) || /expect\(.*\.locator\(/.test(line)) {
        // Check if it uses async matcher or is awaited
        const hasAsyncMatcher = /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText)\(/.test(line);
        const hasAwait = /^\s*await\s+expect/.test(line);
        
        if (!hasAsyncMatcher && !hasAwait) {
          // Check next line for matcher
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextHasMatcher = /\.(toBeVisible|toHaveText|toHaveClass|toHaveCount|toBeFocused|toHaveValue|toBeEnabled|toBeDisabled|toHaveAttribute|toContainText)\(/.test(nextLine);
            if (!nextHasMatcher) {
              issues.push({
                file,
                line: i + 1,
                code: line.trim().substring(0, 80)
              });
            }
          } else {
            issues.push({
              file,
              line: i + 1,
              code: line.trim().substring(0, 80)
            });
          }
        }
      }
    }
  }
  
  if (issues.length > 0) {
    const errorMessage = `Potential unhandled async assertions:\n${issues.map(i => 
      `  - ${i.file}:${i.line} - ${i.code}`
    ).join('\n')}`;
    throw new Error(errorMessage);
  }
  
  expect(issues.length).toBe(0);
});
