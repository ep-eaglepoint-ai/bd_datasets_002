class SimpleReporter {
  onRunStart() {
    console.log("\nRunning tests...");
  }

  onTestResult(test, testResult) {
    testResult.testResults.forEach((result) => {
      if (result.status === "passed") {
        console.log(`  ✓ ${result.title}`);
      } else if (result.status === "failed") {
        console.log(`  ✕ ${result.title}`);
      } else {
        console.log(`  ○ ${result.title}`);
      }
    });
  }

  onRunComplete(contexts, results) {
    if (results.numFailedTests > 0) {
      console.log(
        `\nTests: ${results.numFailedTests} failed, ${results.numPassedTests} passed, ${results.numTotalTests} total`,
      );
    } else {
      console.log(
        `\nTests: ${results.numPassedTests} passed, ${results.numTotalTests} total`,
      );
    }
  }
}

module.exports = SimpleReporter;
