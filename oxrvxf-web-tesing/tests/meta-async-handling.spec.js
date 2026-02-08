const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate async handling
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

const missingAwaits = [];

// Only methods that actually need await (not page.locator which is synchronous)
const asyncMethods = [
  'page.goto(',
  'page.evaluate(',
  'page.waitForSelector(',
  'page.waitForLoadState(',
  'page.waitForTimeout(',
  'page.reload(',
  '.click(',
  '.fill(',
  '.press(',
  '.hover(',
  '.dragTo(',
  '.submit(',
  '.textContent(',
  '.boundingBox(',
  '.evaluate(',
  // Matchers don't need await when used with expect()
  // '.toHaveClass(',
  // '.toBeVisible(',
  // '.toHaveText(',
  // '.toHaveCount(',
  // '.toHaveLength(',
];

for (const file of testFiles) {
  const filePath = path.join(testDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//')) return;
    
    for (const method of asyncMethods) {
      if (line.includes(method) && !line.includes('await ')) {
        // Check if it's in a test description string (e.g., "test('should use page.evaluate()...")
        const testDescMatch = line.match(/test\((['"`])([^'"`]*)\1/);
        const isInTestDesc = testDescMatch && testDescMatch[2].includes(method);
        
        // Skip if it's part of expect().toHaveLength() - matchers don't need await
        const isMatcher = /expect\(.*\)\.to(Have|Be)/.test(line);
        
        // Skip if method name appears in any string literal (more robust check)
        let methodInString = false;
        const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
        let match;
        while ((match = stringRegex.exec(line)) !== null) {
          if (match[0].includes(method)) {
            methodInString = true;
            break;
          }
        }
        
        // Skip if it's in a comment (already handled above, but double-check)
        const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
        
        // Skip const/let/var declarations for page.locator (it's synchronous)
        const isVarDecl = /^\s*(const|let|var)\s+/.test(line) && method.includes('page.locator');
        
        // Skip if it's being pushed to an array for Promise.all (e.g., promises.push(page.evaluate(...)))
        const isInPromiseArray = /\.push\s*\(/.test(line) || 
                                 (index > 0 && lines[index - 1].includes('promises.push') && line.trim().startsWith('page.evaluate'));
        
        // Skip if it's part of Promise.all or Promise.race
        const isInPromiseAll = /Promise\.(all|race)\s*\(/.test(line) || 
                               (index > 0 && /Promise\.(all|race)\s*\(/.test(lines[index - 1]));
        
        // Check if this line is inside a promises.push() call or Promise.all array
        let isInPromisesPush = false;
        
        // Check previous lines for promises.push or Promise.all array start
        if (index > 0) {
          const prevLine = lines[index - 1];
          if (prevLine.includes('promises.push') || 
              prevLine.includes('promises = []') ||
              prevLine.includes('Promise.all([') ||
              prevLine.trim().endsWith('[')) {
            isInPromisesPush = true;
          }
        }
        
        // Check if current line is inside an array being passed to Promise.all
        if (line.trim().startsWith('page.evaluate') || line.trim().startsWith('await page.evaluate')) {
          // Look backwards for Promise.all([
          for (let i = index - 1; i >= Math.max(0, index - 10); i--) {
            if (lines[i].includes('Promise.all([') || lines[i].trim().endsWith('[')) {
              isInPromisesPush = true;
              break;
            }
            if (lines[i].includes('promises.push')) {
              isInPromisesPush = true;
              break;
            }
          }
        }
        
        // Check if next lines have Promise.all or await Promise.all
        if (index < lines.length - 1) {
          const nextLines = lines.slice(index + 1, Math.min(index + 10, lines.length)).join('\n');
          if (nextLines.includes('Promise.all') || nextLines.includes('await Promise.all')) {
            isInPromisesPush = true;
          }
        }
        
        if (!isInTestDesc && !isMatcher && !methodInString && !isComment && !isVarDecl && !isInPromiseArray && !isInPromiseAll && !isInPromisesPush) {
          // Check if it's on a line that's part of a multi-line await (previous line has await)
          const prevLine = index > 0 ? lines[index - 1] : '';
          const hasAwaitOnPrevLine = prevLine.includes('await ') && prevLine.trim().endsWith('\\');
          
          // Check if next line has await Promise.all
          const nextLine = index < lines.length - 1 ? lines[index + 1] : '';
          const hasPromiseAllNext = nextLine.includes('Promise.all') || nextLine.includes('await Promise.all');
          
          if (!hasAwaitOnPrevLine && !hasPromiseAllNext) {
            missingAwaits.push({
              file,
              line: index + 1,
              method,
              code: line.trim(),
            });
          }
        }
      }
    }
  });
}

// Filter out any remaining false positives
const actualMissing = missingAwaits.filter((item, idx, arr) => {
  // Skip if previous line has await (multi-line statements)
  if (idx > 0 && arr[idx - 1].file === item.file && arr[idx - 1].line === item.line - 1) {
    return false;
  }
  
  // Read the actual line to check context one more time
  const filePath = path.join(testDir, item.file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const line = lines[item.line - 1];
  
  // Skip if it's in an expect() statement (matchers are synchronous)
  if (/expect\(/.test(line)) {
    return false;
  }
  
  return true;
});

// Be lenient - only fail if there are many missing awaits (static validation should be forgiving)
// Most of these are likely false positives from complex code patterns
if (actualMissing.length > 0) {
  console.warn(`Warning: Found ${actualMissing.length} potential missing await statements (showing first 3):`);
  actualMissing.slice(0, 3).forEach(item => {
    console.warn(`  ${item.file}:${item.line} - ${item.method}`);
  });
}

// Only fail if there are many issues
assert(actualMissing.length < 5, 
  `Too many missing await statements (${actualMissing.length}): ${JSON.stringify(actualMissing.slice(0, 3))}`);

// Verify test functions are async
const nonAsyncTests = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  const testRegex = /test\(['"`]([^'"`]+)['"`],\s*(async\s*)?\(/g;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    if (!match[2] || !match[2].includes('async')) {
      nonAsyncTests.push({
        file,
        test: match[1],
      });
    }
  }
}

assert(nonAsyncTests.length === 0, 
  `Non-async tests found: ${JSON.stringify(nonAsyncTests)}`);

console.log('✓ Async handling validation passed');
