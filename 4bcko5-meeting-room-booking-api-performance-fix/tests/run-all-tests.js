import { runTests as runPerformanceTests } from './1-performance-requirements.test.js';
import { runTests as runQueryTests } from './2-query-optimization.test.js';
import { runTests as runBusinessTests } from './3-business-rules.test.js';
import { runTests as runStabilityTests } from './4-stability.test.js';

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('MEETING ROOM BOOKING API - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  
  const allResults = {
    suites: [],
    totalPassed: 0,
    totalFailed: 0,
    totalTests: 0
  };
  
  // Run Performance Tests (Requirements 1-4)
  console.log('\n' + '='.repeat(60));
  console.log('SUITE 1: PERFORMANCE REQUIREMENTS (REQ 1-4)');
  console.log('='.repeat(60));
  const perfResults = await runPerformanceTests();
  allResults.suites.push({ name: 'Performance', ...perfResults });
  allResults.totalPassed += perfResults.passed;
  allResults.totalFailed += perfResults.failed;
  allResults.totalTests += perfResults.total;
  
  // Run Query Optimization Tests (Requirements 5, 6, 10)
  console.log('\n' + '='.repeat(60));
  console.log('SUITE 2: QUERY OPTIMIZATION (REQ 5, 6, 10)');
  console.log('='.repeat(60));
  const queryResults = await runQueryTests();
  allResults.suites.push({ name: 'Query Optimization', ...queryResults });
  allResults.totalPassed += queryResults.passed;
  allResults.totalFailed += queryResults.failed;
  allResults.totalTests += queryResults.total;
  
  // Run Business Rules Tests (Requirements 8, 9)
  console.log('\n' + '='.repeat(60));
  console.log('SUITE 3: BUSINESS RULES & API COMPATIBILITY (REQ 8, 9)');
  console.log('='.repeat(60));
  const businessResults = await runBusinessTests();
  allResults.suites.push({ name: 'Business Rules', ...businessResults });
  allResults.totalPassed += businessResults.passed;
  allResults.totalFailed += businessResults.failed;
  allResults.totalTests += businessResults.total;
  
  // Run Stability Tests (Requirement 7)
  console.log('\n' + '='.repeat(60));
  console.log('SUITE 4: STABILITY & MEMORY (REQ 7)');
  console.log('='.repeat(60));
  const stabilityResults = await runStabilityTests();
  allResults.suites.push({ name: 'Stability', ...stabilityResults });
  allResults.totalPassed += stabilityResults.passed;
  allResults.totalFailed += stabilityResults.failed;
  allResults.totalTests += stabilityResults.total;
  
  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  
  for (const suite of allResults.suites) {
    const status = suite.failed === 0 ? '✓' : '✗';
    console.log(`${status} ${suite.name}: ${suite.passed}/${suite.total} passed`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL: ${allResults.totalPassed}/${allResults.totalTests} tests passed`);
  console.log('='.repeat(60));
  
  if (allResults.totalFailed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('\nFailed tests:');
    for (const suite of allResults.suites) {
      for (const test of suite.tests) {
        if (test.status === 'failed') {
          console.log(`  ✗ ${test.name}`);
          console.log(`    Error: ${test.error}`);
        }
      }
    }
  } else {
    console.log('\n✅ ALL TESTS PASSED!');
  }
  
  return allResults;
}

runAllTests()
  .then(results => {
    // For before repository: exit 0 even with failures (it's the baseline)
    // For after repository: exit 1 if any failures (must pass all tests)
    const isAfterRepo = process.env.API_URL?.includes('5001') || 
                        process.env.API_URL?.includes('after');
    
    if (isAfterRepo) {
      // After repository must pass all tests
      process.exit(results.totalFailed > 0 ? 1 : 0);
    } else {
      // Before repository is baseline - always exit 0
      console.log('\n📝 Note: This is the BEFORE (baseline) repository.');
      console.log('Some test failures are expected and acceptable.');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n❌ Test suite crashed:', error);
    process.exit(1);
  });
