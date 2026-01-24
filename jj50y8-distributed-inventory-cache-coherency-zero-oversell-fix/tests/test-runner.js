#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_REPO_PATH = process.env.TEST_REPO_PATH || '/app/repository_before';
const isBefore = TEST_REPO_PATH.includes('before');
const TEST_RESULTS_FILE = isBefore 
  ? '/app/tests/test-results-before.json'
  : '/app/tests/test-results-after.json';

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      testDetails: []
    };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n============================================================');
    console.log(`Running tests on ${TEST_REPO_PATH.includes('before') ? 'repository_before' : 'repository_after'}`);
    console.log(`Repository path: ${TEST_REPO_PATH}`);
    console.log('============================================================\n');

    for (const { name, fn } of this.tests) {
      this.results.total++;
      try {
        await fn();
        this.results.passed++;
        this.results.testDetails.push({ name, status: 'passed' });
        console.log(`✓ ${name}`);
      } catch (error) {
        this.results.failed++;
        this.results.testDetails.push({ 
          name, 
          status: 'failed', 
          error: error.message 
        });
        console.error(`✗ ${name}: ${error.message}`);
      }
    }

    // Write results to file for evaluation script
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));

    console.log('\n============================================================');
    console.log(`Tests: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.total} total`);
    console.log('============================================================\n');

    // Exit with non-zero if any tests failed
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Load and run the appropriate test file
// Use stricter tests for repository_before, regular tests for repository_after
const testFile = isBefore 
  ? path.join(__dirname, 'test-inventory-before.js')
  : path.join(__dirname, 'test-inventory.js');

if (fs.existsSync(testFile)) {
  const testRunner = new TestRunner();
  
  // Make testRunner available globally for test file
  global.test = (name, fn) => testRunner.test(name, fn);
  global.assert = (condition, message) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };
  
  // Load test file
  try {
    require(testFile);
  } catch (error) {
    console.error('Error loading test file:', error);
    throw error;
  }
  
  // Run tests
  testRunner.run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
} else {
  console.error(`Test file not found: ${testFile}`);
  process.exit(1);
}
