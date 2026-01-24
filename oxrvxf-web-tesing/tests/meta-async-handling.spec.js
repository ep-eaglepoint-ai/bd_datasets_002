// Meta-test for Async Handling
// Requirement 11: Meta-test for async handling must scan all test files and verify that every Playwright locator 
// action like click(), fill(), and dragTo() is preceded by await, and that every expect assertion on a locator uses 
// an async matcher or is properly awaited, flagging any potential race conditions from missing awaits that could 
// cause flaky tests.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('every Playwright locator action is awaited and every expect assertion on locator uses async matcher or is awaited', async () => {
  const testDir = path.join(__dirname, '../repository_after/tests');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.js'));
  
  const actionIssues = [];
  const assertionIssues = [];
  
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
      
      // Check for Playwright locator actions: click(), fill(), dragTo()
      const locatorActions = [
        { pattern: /\.click\(/, name: 'click()' },
        { pattern: /\.fill\(/, name: 'fill()' },
        { pattern: /\.dragTo\(/, name: 'dragTo()' },
        { pattern: /\.press\(/, name: 'press()' },
        { pattern: /\.type\(/, name: 'type()' },
        { pattern: /\.selectOption\(/, name: 'selectOption()' },
        { pattern: /\.check\(/, name: 'check()' },
        { pattern: /\.uncheck\(/, name: 'uncheck()' },
        { pattern: /\.hover\(/, name: 'hover()' },
        { pattern: /\.focus\(/, name: 'focus()' },
        { pattern: /\.blur\(/, name: 'blur()' },
        { pattern: /\.dblclick\(/, name: 'dblclick()' }
      ];
      
      for (const action of locatorActions) {
        if (action.pattern.test(line)) {
          // Check if line has await
          const hasAwait = /^\s*await\s+/.test(line);
          
          // Check if it's in a variable assignment (which might be okay if chained)
          const isAssignment = /^\s*(const|let|var)\s+\w+\s*=/.test(line);
          
          // Check if previous line has await (multi-line statement)
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          const prevHasAwait = /await\s+$/.test(prevLine);
          
          if (!hasAwait && !isAssignment && !prevHasAwait) {
            actionIssues.push({
              file,
              line: i + 1,
              action: action.name,
              code: trimmed.substring(0, 80)
            });
            break; // Only report once per line
          }
        }
      }
      
      // Check for expect() with locator (page.locator or .locator)
      if (/expect\(.*(page\.locator|\.locator)\(/.test(line)) {
        // Check if it uses async matcher (toBeVisible, toHaveText, toHaveClass, etc.)
        const asyncMatchers = [
          'toBeVisible', 'toHaveText', 'toHaveClass', 'toHaveCount', 
          'toBeFocused', 'toHaveValue', 'toBeEnabled', 'toBeDisabled', 
          'toHaveAttribute', 'toContainText'
        ];
        const hasAsyncMatcher = asyncMatchers.some(matcher => 
          new RegExp(`\\.${matcher}\\(`).test(line)
        );
        
        // Check if expect is awaited
        const hasAwait = /^\s*await\s+expect/.test(line);
        
        // Check next line for async matcher (multi-line)
        let nextHasMatcher = false;
        if (i + 1 < lines.length && !hasAsyncMatcher) {
          const nextLine = lines[i + 1];
          nextHasMatcher = asyncMatchers.some(matcher => 
            new RegExp(`\\.${matcher}\\(`).test(nextLine)
          );
        }
        
        if (!hasAsyncMatcher && !hasAwait && !nextHasMatcher) {
          assertionIssues.push({
            file,
            line: i + 1,
            code: line.trim().substring(0, 80)
          });
        }
      }
    }
  }
  
  const allIssues = [...actionIssues, ...assertionIssues];
  
  if (allIssues.length > 0) {
    const errorMessage = `Potential race conditions from missing await statements or unhandled async assertions:\n${
      actionIssues.length > 0 ? `Actions missing await:\n${actionIssues.map(i => 
        `  - ${i.file}:${i.line} - ${i.action} missing await: ${i.code}`
      ).join('\n')}\n` : ''
    }${
      assertionIssues.length > 0 ? `Assertions missing async handling:\n${assertionIssues.map(i => 
        `  - ${i.file}:${i.line} - ${i.code}`
      ).join('\n')}` : ''
    }`;
    throw new Error(errorMessage);
  }
  
  expect(allIssues.length).toBe(0);
});
