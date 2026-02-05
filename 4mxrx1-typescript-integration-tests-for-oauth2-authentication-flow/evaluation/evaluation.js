#!/usr/bin/env node
/**
 * Evaluation Script
 * Executes both test scripts and generates evaluation report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runRequirementValidationTest() {
  const testsDir = path.join(__dirname, '..', 'tests');
  const validationTest = path.join(testsDir, 'requirement_validation_test.js');
  
  if (!fs.existsSync(validationTest)) {
    return {
      success: false,
      error: 'Requirement validation test not found'
    };
  }
  
  try {
    const result = execSync(`node "${validationTest}"`, {
      encoding: 'utf8',
      timeout: 300000, // Increased to 5 minutes
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return {
      success: true,
      output: result.toString(),
      error: '',
      returncode: 0
    };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';
    const returncode = error.status !== undefined ? error.status : (error.code || -1);
    
    return {
      success: returncode === 0,
      output: stdout,
      error: stderr || error.message || 'Requirement validation test timed out',
      returncode: returncode
    };
  }
}

function runMetaTest() {
  const testsDir = path.join(__dirname, '..', 'tests');
  const metaTest = path.join(testsDir, 'meta_test.js');
  
  if (!fs.existsSync(metaTest)) {
    return {
      success: false,
      error: 'Meta-test not found'
    };
  }
  
  try {
    const result = execSync(`node "${metaTest}"`, {
      encoding: 'utf8',
      timeout: 60000,
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return {
      success: true,
      output: result.toString(),
      error: '',
      returncode: 0
    };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';
    const returncode = error.status !== undefined ? error.status : (error.code || -1);
    
    return {
      success: returncode === 0,
      output: stdout,
      error: stderr || error.message || 'Meta-test timed out',
      returncode: returncode
    };
  }
}

function generateReport() {
  console.log('Running evaluation...');
  
  console.log('Running requirement validation test...');
  const reqTestResult = runRequirementValidationTest();
  
  console.log('Running meta-test...');
  const metaTestResult = runMetaTest();
  
  const overallPass = reqTestResult.success && metaTestResult.success;
  
  // Generate timestamp in format: YYYY-MM-DDTHH-MM-SS-fffZ
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0');
  // Format: 2026-01-29T19-38-54-542Z
  const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}-${milliseconds}Z`;
  const reportDir = path.join(__dirname, 'reports', timestamp);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp,
    requirement_test: {
      result: reqTestResult.success ? 'PASS' : 'FAIL',
      output: reqTestResult.output || '',
      error: reqTestResult.error || '',
      details: {
        returncode: reqTestResult.returncode || -1,
        success: reqTestResult.success
      }
    },
    meta_test: {
      result: metaTestResult.success ? 'PASS' : 'FAIL',
      output: metaTestResult.output || '',
      error: metaTestResult.error || '',
      details: {
        returncode: metaTestResult.returncode || -1,
        success: metaTestResult.success
      }
    },
    overall: {
      status: overallPass ? 'PASS' : 'FAIL',
      requirement_test_passed: reqTestResult.success,
      meta_test_passed: metaTestResult.success
    },
    failure_reasons: []
  };
  
  if (!reqTestResult.success) {
    const errorMsg = reqTestResult.error || 'Unknown error';
    const output = reqTestResult.output || '';
    report.failure_reasons.push(
      `Requirement validation test failed: ${errorMsg}\n${output}`
    );
  }
  
  if (!metaTestResult.success) {
    const errorMsg = metaTestResult.error || 'Unknown error';
    const output = metaTestResult.output || '';
    report.failure_reasons.push(
      `Meta-test failed: ${errorMsg}\n${output}`
    );
  }
  
  const reportFile = path.join(reportDir, 'report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  const latestFile = path.join(__dirname, 'reports', 'latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(report, null, 2));
  
  console.log('\nEvaluation Report:');
  console.log(`  Requirement Test: ${report.requirement_test.result}`);
  console.log(`  Meta-Test: ${report.meta_test.result}`);
  console.log(`  Overall: ${report.overall.status}`);
  console.log(`\nReport saved to: ${reportFile}`);
  
  return report;
}

if (require.main === module) {
  const report = generateReport();
  process.exit(report.overall.status === 'PASS' ? 0 : 1);
}

module.exports = { generateReport, runRequirementValidationTest, runMetaTest };
