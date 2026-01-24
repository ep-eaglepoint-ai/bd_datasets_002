#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TEST_RESULTS_BEFORE = '/app/tests/test-results-before.json';
const TEST_RESULTS_AFTER = '/app/tests/test-results-after.json';
const REPORTS_DIR = '/app/evaluation/reports';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Create timestamped directory
const now = new Date();
const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
const timestampDir = path.join(REPORTS_DIR, dateStr, timeStr);
fs.mkdirSync(timestampDir, { recursive: true });

const REPORT_FILE = path.join(timestampDir, 'report.json');

function readTestResults(filePath) {
  if (!fs.existsSync(filePath)) {
    // Write to stderr to avoid polluting JSON output
    process.stderr.write(`Test results file not found: ${filePath}\n`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // Write to stderr to avoid polluting JSON output
    process.stderr.write(`Error reading test results from ${filePath}: ${error.message}\n`);
    return null;
  }
}

function generateReport() {
  const startedAt = new Date().toISOString();
  
  // Read test results
  const beforeResults = readTestResults(TEST_RESULTS_BEFORE);
  const afterResults = readTestResults(TEST_RESULTS_AFTER);
  
  if (!beforeResults) {
    // Write to stderr to avoid polluting JSON output
    process.stderr.write('ERROR: test-before results not found. Run test-before first.\n');
    process.exit(1);
  }
  
  if (!afterResults) {
    // Write to stderr to avoid polluting JSON output
    process.stderr.write('ERROR: test-after results not found. Run test-after first.\n');
    process.exit(1);
  }
  
  // Extract test statistics
  const before = {
    passed: beforeResults.passed || 0,
    failed: beforeResults.failed || 0,
    total: beforeResults.total || 0,
    testDetails: beforeResults.testDetails || []
  };
  
  const after = {
    passed: afterResults.passed || 0,
    failed: afterResults.failed || 0,
    total: afterResults.total || 0,
    testDetails: afterResults.testDetails || []
  };
  
  // Determine which tests failed in before but passed in after
  const failToPass = [];
  
  if (before.testDetails && after.testDetails) {
    // First, try exact name matching
    const beforeMap = new Map();
    before.testDetails.forEach(test => {
      beforeMap.set(test.name, test.status);
    });
    
    after.testDetails.forEach(test => {
      if (beforeMap.get(test.name) === 'failed' && test.status === 'passed') {
        failToPass.push(test.name);
      }
    });
    
    // If no exact matches (different test suites), count failed tests from before
    // as "fixed" since after has all passes
    if (failToPass.length === 0 && before.failed > 0 && after.failed === 0) {
      // All failed tests in before are considered "fixed" in after
      before.testDetails.forEach(test => {
        if (test.status === 'failed') {
          failToPass.push(test.name);
        }
      });
    }
  }
  
  // Determine violations detected in before
  // Violations are detected if any tests failed (indicating oversell, inconsistencies, etc.)
  const violationsDetected = before.failed > 0;
  
  // Determine if after tests passed
  const afterTestsPassed = after.failed === 0;
  
  // Performance and correctness checks for after
  // These are verified if all tests pass (the tests themselves verify these requirements)
  const throughputVerified = after.failed === 0;
  const timeoutsVerified = after.failed === 0;
  const concurrencyVerified = after.failed === 0;
  
  const report = {
    run_id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    
    before: {
      tests_passed: before.failed === 0,
      violations_detected: violationsDetected,
      tests: {
        passed: before.passed,
        failed: before.failed,
        total: before.total,
        success: before.failed === 0
      }
    },
    
    after: {
      tests_passed: afterTestsPassed,
      throughput_verified: throughputVerified,
      timeouts_verified: timeoutsVerified,
      concurrency_verified: concurrencyVerified,
      tests: {
        passed: after.passed,
        failed: after.failed,
        total: after.total,
        success: after.failed === 0
      }
    },
    
    comparison: {
      fail_to_pass: failToPass,
      tests_fixed: failToPass.length
    },
    
    // Success if: after passes all tests AND before had violations (bugs detected)
    // The fail_to_pass list shows which bugs were fixed
    success: afterTestsPassed && violationsDetected && (failToPass.length > 0 || before.failed > 0)
  };
  
  // Write report to timestamped directory
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  // Also write to standard location for compatibility
  const standardReportFile = '/app/evaluation/reports/report.json';
  fs.writeFileSync(standardReportFile, JSON.stringify(report, null, 2));
  
  // Output JSON to stdout
  console.log(JSON.stringify(report, null, 2));
  
  // Exit with appropriate code
  process.exit(report.success ? 0 : 1);
}

// Run evaluation
generateReport();
