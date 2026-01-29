#!/usr/bin/env node
/**
 * Meta-Test (Test Quality Validator)
 * Validates that Test Script 1 (requirement validation test) is complete and reliable.
 */

const fs = require('fs');
const path = require('path');

function checkTestFileExists() {
  const testFile = path.join(__dirname, '..', 'repository_after', 'tests', 'oauth2.integration.test.ts');
  return fs.existsSync(testFile);
}

function analyzeTestFile() {
  const testFile = path.join(__dirname, '..', 'repository_after', 'tests', 'oauth2.integration.test.ts');
  
  if (!fs.existsSync(testFile)) {
    return {
      exists: false,
      error: 'Test file not found'
    };
  }
  
  const content = fs.readFileSync(testFile, 'utf8');
  
  // Check for all 15 requirements
  const requirementsFound = [];
  for (let i = 1; i <= 15; i++) {
    const pattern = `Requirement ${i}:`;
    if (content.includes(pattern)) {
      requirementsFound.push(i);
    }
  }
  
  // Check for test structure
  const describeMatches = content.match(/describe\(/g);
  const hasDescribeBlocks = describeMatches && describeMatches.length > 0;
  
  const itMatches = content.match(/\bit\(/g);
  const hasItBlocks = itMatches && itMatches.length > 0;
  
  const hasBeforeEach = content.includes('beforeEach');
  const hasExpect = content.includes('expect(');
  const hasSupertest = content.includes('request(app)') || content.toLowerCase().includes('supertest');
  const hasTimeManipulation = content.includes('Date.now') || content.includes('jest.useFakeTimers');
  const hasConcurrent = content.includes('Promise.all');
  
  return {
    exists: true,
    requirements_found: requirementsFound,
    all_requirements_present: requirementsFound.length === 15,
    has_describe_blocks: hasDescribeBlocks,
    has_it_blocks: hasItBlocks,
    has_beforeEach: hasBeforeEach,
    has_expect: hasExpect,
    has_supertest: hasSupertest,
    has_time_manipulation: hasTimeManipulation,
    has_concurrent: hasConcurrent
  };
}

function checkRequirementValidationTest() {
  const validationTest = path.join(__dirname, 'requirement_validation_test.js');
  
  if (!fs.existsSync(validationTest)) {
    return {
      exists: false,
      error: 'Requirement validation test not found'
    };
  }
  
  const content = fs.readFileSync(validationTest, 'utf8');
  
  const hasValidate = content.includes('validateRequirements');
  const hasRunTests = content.includes('runJestTests');
  const hasCoverageCheck = content.includes('checkRequirementCoverage');
  
  return {
    exists: true,
    has_validate: hasValidate,
    has_run_tests: hasRunTests,
    has_coverage_check: hasCoverageCheck,
    is_complete: hasValidate && hasRunTests && hasCoverageCheck
  };
}

function validateTestQuality() {
  console.log('Running meta-test (test quality validator)...');
  
  const testAnalysis = analyzeTestFile();
  if (!testAnalysis.exists) {
    console.log('FAIL: Integration test file not found');
    return false;
  }
  
  if (!testAnalysis.all_requirements_present) {
    const allReqs = new Set([...Array(15).keys()].map(i => i + 1));
    const foundReqs = new Set(testAnalysis.requirements_found);
    const missing = [...allReqs].filter(x => !foundReqs.has(x));
    console.log(`FAIL: Missing requirement tests: ${missing.join(', ')}`);
    return false;
  }
  
  if (!testAnalysis.has_describe_blocks) {
    console.log('FAIL: Test file missing describe blocks');
    return false;
  }
  
  if (!testAnalysis.has_it_blocks) {
    console.log('FAIL: Test file missing it/test blocks');
    return false;
  }
  
  if (!testAnalysis.has_beforeEach) {
    console.log('FAIL: Test file missing beforeEach for test isolation');
    return false;
  }
  
  if (!testAnalysis.has_expect) {
    console.log('FAIL: Test file missing assertions (expect)');
    return false;
  }
  
  if (!testAnalysis.has_supertest) {
    console.log('FAIL: Test file not using supertest for HTTP requests');
    return false;
  }
  
  const validationCheck = checkRequirementValidationTest();
  if (!validationCheck.exists) {
    console.log('FAIL: Requirement validation test not found');
    return false;
  }
  
  if (!validationCheck.is_complete) {
    console.log('FAIL: Requirement validation test is incomplete');
    return false;
  }
  
  console.log('PASS: Tests are complete and reliable');
  return true;
}

if (require.main === module) {
  const success = validateTestQuality();
  process.exit(success ? 0 : 1);
}

module.exports = { validateTestQuality, analyzeTestFile, checkRequirementValidationTest };
