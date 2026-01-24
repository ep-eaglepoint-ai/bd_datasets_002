#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname);
const specFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js'));

let passed = 0;
let failed = 0;
const errors = [];

console.log('Validating test files...\n');

// Basic validation: check if test files are valid
for (const specFile of specFiles) {
  const specPath = path.join(testDir, specFile);
  try {
    const content = fs.readFileSync(specPath, 'utf-8');
    
    // Check if file has test structure
    const hasTestDescribe = /test\.describe|describe\(/.test(content);
    const hasTestCases = /test\(/.test(content);
    const hasExpect = /expect\(/.test(content);
    
    if (!hasTestDescribe) {
      throw new Error('Missing test.describe or describe block');
    }
    
    if (!hasTestCases) {
      throw new Error('No test cases found');
    }
    
    if (!hasExpect) {
      throw new Error('No expect assertions found');
    }
    
    // Check if file uses Playwright correctly (static check)
    const hasPageEvaluate = content.includes('page.evaluate');
    const hasPageGoto = content.includes('page.goto');
    
    // Basic syntax validation - try to require it (will catch syntax errors)
    try {
      // Just check syntax, don't execute
      require('vm').createScript(content, specPath);
    } catch (syntaxError) {
      throw new Error(`Syntax error: ${syntaxError.message}`);
    }
    
    console.log(`✓ ${specFile} is valid`);
    passed++;
  } catch (error) {
    console.error(`✗ ${specFile} validation failed: ${error.message}`);
    failed++;
    errors.push({ file: specFile, error: error.message });
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\nFailed validations:');
  errors.forEach(({ file, error }) => {
    console.error(`  ${file}: ${error}`);
  });
  process.exit(1);
}

console.log('\n✓ All test files are valid');
process.exit(0);
