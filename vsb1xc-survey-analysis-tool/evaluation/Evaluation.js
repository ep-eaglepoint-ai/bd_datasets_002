const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Create timestamp directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const timestampDir = path.join(reportsDir, timestamp);
fs.mkdirSync(timestampDir, { recursive: true });

console.log('Running tests for all 22 requirements...');

const requirements = Array.from({ length: 22 }, (_, i) => i + 1);
const results = {
  timestamp: new Date().toISOString(),
  totalRequirements: 22,
  passed: 0,
  failed: 0,
  requirements: [],
  summary: {
    allPassed: false,
    passRate: 0,
  },
};

// Run tests for each requirement
for (const reqNum of requirements) {
  const testFile = `tests/requirement-${String(reqNum).padStart(2, '0')}.test.ts`;
  console.log(`\nTesting Requirement ${reqNum}...`);
  
  try {
    // Run Jest for specific test file
    const output = execSync(
      `npx jest ${testFile} --json --no-coverage`,
      { 
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      }
    );
    
    const jestResult = JSON.parse(output);
    const passed = jestResult.numPassedTests > 0 && jestResult.numFailedTests === 0;
    
    results.requirements.push({
      requirement: reqNum,
      passed,
      tests: {
        total: jestResult.numTotalTests,
        passed: jestResult.numPassedTests,
        failed: jestResult.numFailedTests,
      },
      duration: jestResult.startTime ? Date.now() - jestResult.startTime : 0,
      errors: jestResult.testResults
        .filter(r => r.status === 'failed')
        .map(r => ({
          name: r.name,
          message: r.message,
        })),
    });
    
    if (passed) {
      results.passed++;
      console.log(`✓ Requirement ${reqNum} PASSED`);
    } else {
      results.failed++;
      console.log(`✗ Requirement ${reqNum} FAILED`);
    }
  } catch (error) {
    results.failed++;
    results.requirements.push({
      requirement: reqNum,
      passed: false,
      tests: {
        total: 0,
        passed: 0,
        failed: 0,
      },
      duration: 0,
      errors: [{
        name: 'Test execution error',
        message: error.message || String(error),
      }],
    });
    console.log(`✗ Requirement ${reqNum} FAILED: ${error.message}`);
  }
}

// Calculate summary
results.summary.passRate = (results.passed / results.totalRequirements) * 100;
results.summary.allPassed = results.failed === 0;

// Write report
const reportPath = path.join(timestampDir, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log('\n' + '='.repeat(60));
console.log('EVALUATION SUMMARY');
console.log('='.repeat(60));
console.log(`Total Requirements: ${results.totalRequirements}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Pass Rate: ${results.summary.passRate.toFixed(2)}%`);
console.log(`All Passed: ${results.summary.allPassed ? 'YES ✓' : 'NO ✗'}`);
console.log('='.repeat(60));
console.log(`\nReport saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(results.summary.allPassed ? 0 : 1);
