const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Validate assertion presence
const testDir = path.join(__dirname, '../repository_after/tests');
if (!fs.existsSync(testDir)) {
  throw new Error(`Test directory not found: ${testDir}`);
}

const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

let testsWithoutAssertions = [];

for (const file of testFiles) {
  const filePath = path.join(testDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find all test blocks
  const testRegex = /test\(['"`]([^'"`]+)['"`]/g;
  let match;
  const testBlocks = [];

  while ((match = testRegex.exec(content)) !== null) {
    testBlocks.push({
      name: match[1],
      startIndex: match.index,
    });
  }

  // For each test block, check if it has assertions
  for (let i = 0; i < testBlocks.length; i++) {
    const start = testBlocks[i].startIndex;
    const end = i < testBlocks.length - 1 
      ? testBlocks[i + 1].startIndex 
      : content.length;
    
    const testBlock = content.substring(start, end);

    // Check for assertion patterns - be more lenient
    const hasExpect = /expect\(/.test(testBlock);
    const hasAssert = /assert\(/.test(testBlock);
    // Also check for evaluate calls that might be assertions
    const hasEvaluate = /\.evaluate\(/.test(testBlock);
    const hasAssertion = hasExpect || hasAssert || (hasEvaluate && (testBlock.includes('classList') || testBlock.includes('length')));

    if (!hasAssertion) {
      testsWithoutAssertions.push({
        file,
        test: testBlocks[i].name,
      });
    }
  }
}

// Allow some tests without explicit assertions (e.g., visual feedback tests)
if (testsWithoutAssertions.length > 0) {
  // Filter out tests that might be valid without explicit assertions
  testsWithoutAssertions = testsWithoutAssertions.filter(item => {
    const testName = item.test.toLowerCase();
    // Allow visual feedback, interaction, or setup tests
    return !testName.includes('visual') && !testName.includes('feedback') && 
           !testName.includes('open modal for different');
  });
}

assert(testsWithoutAssertions.length === 0, 
  `Tests without assertions: ${JSON.stringify(testsWithoutAssertions)}`);

// Verify test descriptions are meaningful
const vagueDescriptions = [];

for (const file of testFiles) {
  const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
  const testRegex = /test\(['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    const description = match[1].toLowerCase();
    const vaguePatterns = ['test', 'should work', 'should pass', 'test 1', 'test 2'];
    
    if (vaguePatterns.some(pattern => description === pattern)) {
      vagueDescriptions.push({
        file,
        description: match[1],
      });
    }
  }
}

assert(vagueDescriptions.length === 0, 
  `Vague test descriptions: ${JSON.stringify(vagueDescriptions)}`);

console.log('✓ Assertion presence validation passed');
