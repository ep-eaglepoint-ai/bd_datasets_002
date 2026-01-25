#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const TEST_REPO_PATH = process.env.TEST_REPO_PATH || '/app/repository_before';
const isBefore = TEST_REPO_PATH.includes('before');
const TEST_RESULTS_FILE = isBefore 
  ? '/app/tests/test-results-before.json'
  : '/app/tests/test-results-after.json';

const testsDir = __dirname;
const repoPath = path.resolve(TEST_REPO_PATH);
const repoName = isBefore ? 'repository_before' : 'repository_after';

// Build the repository if needed
if (fs.existsSync(path.join(repoPath, 'package.json'))) {
  console.log(`Building ${repoName}...`);
  try {
    execSync('npm install', { cwd: repoPath, stdio: 'inherit' });
    execSync('npm run build', { cwd: repoPath, stdio: 'inherit' });
  } catch (error) {
    // Build failures are acceptable for repository_before
    if (!isBefore) {
      throw error;
    }
  }
}

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
    console.log(`Running tests on ${repoName}`);
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

    // For repository_before, failures are expected (it has bugs), so always exit 0
    // For repository_after, failures indicate problems, so exit 1 on failure
    if (isBefore) {
      console.log('Note: Test failures in repository_before are expected (it contains bugs).');
      process.exit(0);
    } else {
      process.exit(this.results.failed > 0 ? 1 : 0);
    }
  }
}

// Load and run the appropriate test file
const testFile = isBefore ? 'test-inventory-before.js' : 'test-inventory.js';
const testFilePath = path.join(testsDir, testFile);

if (!fs.existsSync(testFilePath)) {
  console.error(`Test file not found: ${testFilePath}`);
  process.exit(1);
}

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
  require(testFilePath);
} catch (error) {
  console.error('Error loading test file:', error);
  throw error;
}

// Run tests
testRunner.run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
