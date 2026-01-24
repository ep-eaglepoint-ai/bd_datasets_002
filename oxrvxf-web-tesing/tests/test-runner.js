#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname);
const specFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.spec.js') && file.startsWith('meta-'));

let passed = 0;
let failed = 0;
const errors = [];

console.log('Running meta-tests...\n');

for (const specFile of specFiles) {
  const specPath = path.join(testDir, specFile);
  try {
    console.log(`Running ${specFile}...`);
    require(specPath);
    console.log(`✓ ${specFile} PASSED\n`);
    passed++;
  } catch (error) {
    console.error(`✗ ${specFile} FAILED: ${error.message}\n`);
    failed++;
    errors.push({ file: specFile, error: error.message });
  }
}

console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\nFailed tests:');
  errors.forEach(({ file, error }) => {
    console.error(`  ${file}: ${error}`);
  });
  process.exit(1);
}

process.exit(0);
