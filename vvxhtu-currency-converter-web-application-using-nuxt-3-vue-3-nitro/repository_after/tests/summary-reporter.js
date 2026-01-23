/**
 * Custom Jest reporter that only outputs the summary
 * Suppresses all error details, stack traces, and verbose output
 */
class SummaryReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const { numFailedTests, numPassedTests, numTotalTests, numFailedTestSuites, numPassedTestSuites, numTotalTestSuites } = results;
    
    const time = ((results.testResults.reduce((acc, r) => acc + (r.perfStats?.runtime || 0), 0)) / 1000).toFixed(3);

    console.log('');
    console.log(`Test Suites: ${numFailedTestSuites > 0 ? numFailedTestSuites + ' failed, ' : ''}${numPassedTestSuites > 0 ? numPassedTestSuites + ' passed, ' : ''}${numTotalTestSuites} total`);
    console.log(`Tests:       ${numFailedTests > 0 ? numFailedTests + ' failed, ' : ''}${numPassedTests > 0 ? numPassedTests + ' passed, ' : ''}${numTotalTests} total`);
    console.log(`Snapshots:   0 total`);
    console.log(`Time:        ${time} s`);
  }
}

module.exports = SummaryReporter;