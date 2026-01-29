#!/usr/bin/env node
/**
 * Requirement Validation Test
 * Validates that all requirements are fully implemented and tested.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runJestTests() {
  const repoAfter = path.join(__dirname, '..', 'repository_after');
  const originalCwd = process.cwd();
  
  try {
    process.chdir(repoAfter);
    
    try {
      const output = execSync('npm test -- --json', {
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      try {
        const testOutput = JSON.parse(output);
        return {
          success: testOutput.numFailingTests === 0,
          numPassingTests: testOutput.numPassingTests || 0,
          numFailingTests: testOutput.numFailingTests || 0,
          numTotalTests: testOutput.numTotalTests || 0,
          testResults: testOutput.testResults || []
        };
      } catch (e) {
        // If JSON parsing fails, assume tests passed if command succeeded
        return {
          success: true,
          output: output
        };
      }
    } catch (error) {
      let stdout = '';
      let stderr = '';
      if (error.stdout) stdout = error.stdout.toString();
      if (error.stderr) stderr = error.stderr.toString();
      
      return {
        success: false,
        output: stdout,
        error: stderr || error.message || 'Unknown error',
        returncode: error.status || error.code || -1
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Tests timed out after 30 seconds'
    };
  } finally {
    process.chdir(originalCwd);
  }
}

function checkRequirementCoverage(testResults) {
  const requirements = [
    'Requirement 1: Authorization code flow',
    'Requirement 2: PKCE validation rejects mismatched',
    'Requirement 3: Token refresh with valid refresh_token',
    'Requirement 4: Expired refresh token returns 401',
    'Requirement 5: Invalid redirect_uri',
    'Requirement 6: Invalid client credentials',
    'Requirement 7: Unauthorized scope',
    'Requirement 8: Rate limiting blocks 11th request',
    'Requirement 9: Revoked token cannot be used',
    'Requirement 10: Concurrent refresh requests',
    'Requirement 11: Authorization code reuse',
    'Requirement 12: Authorization code older than 10 minutes',
    'Requirement 13: PKCE code_challenge without S256 method',
    'Requirement 14: Each test must be independent',
    'Requirement 15: All tests must complete in under 5 seconds'
  ];
  
  const testFile = path.join(__dirname, '..', 'repository_after', 'tests', 'oauth2.integration.test.ts');
  
  if (!fs.existsSync(testFile)) {
    return {
      all_covered: false,
      missing: requirements,
      error: 'Test file not found'
    };
  }
  
  const testContent = fs.readFileSync(testFile, 'utf8');
  const covered = [];
  const missing = [];
  
  for (const req of requirements) {
    const reqKey = req.split(':')[0] || req;
    const reqNum = reqKey.split(' ')[1];
    if (reqKey.toLowerCase().includes('requirement') && testContent.includes(`Requirement ${reqNum}:`)) {
      covered.push(req);
    } else if (testContent.toLowerCase().includes(reqKey.toLowerCase())) {
      covered.push(req);
    } else {
      missing.push(req);
    }
  }
  
  return {
    all_covered: missing.length === 0,
    covered,
    missing
  };
}

function validateRequirements() {
  console.log('Running requirement validation test...');
  
  const testFile = path.join(__dirname, '..', 'repository_after', 'tests', 'oauth2.integration.test.ts');
  
  if (!fs.existsSync(testFile)) {
    console.log('FAIL: Test file not found');
    return false;
  }
  
  console.log('Running Jest tests...');
  const testResults = runJestTests();
  
  if (!testResults.success) {
    console.log('FAIL: Tests failed to run');
    console.log(`Error: ${testResults.error || 'Unknown error'}`);
    return false;
  }
  
  const numFailing = testResults.numFailingTests || 0;
  if (numFailing > 0) {
    console.log(`FAIL: ${numFailing} test(s) failed`);
    return false;
  }
  
  const coverage = checkRequirementCoverage(testResults);
  if (!coverage.all_covered) {
    console.log(`FAIL: Missing requirement coverage: ${coverage.missing.join(', ')}`);
    return false;
  }
  
  console.log('PASS: All requirements satisfied');
  return true;
}

if (require.main === module) {
  const success = validateRequirements();
  process.exit(success ? 0 : 1);
}

module.exports = { validateRequirements, runJestTests, checkRequirementCoverage };
