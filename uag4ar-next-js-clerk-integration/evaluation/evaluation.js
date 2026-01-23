const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Generate timestamp directory path
function getTimestampPath() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // yyyy-mm-dd
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // hh-mm-ss
  return path.join('evaluation', dateStr, timeStr);
}

// Parse the output to extract test results
function parseTestOutput(output, expectedFailure = false) {
  const lines = output ? output.split('\n') : [];
  let passed = 0;
  let failed = 0;
  let xfailed = 0;
  const tests = [];

  // Look for test results in output
  for (const line of lines) {
    if (line.startsWith('✓ ')) {
      passed++;
      const testName = line.substring(2);
      tests.push({
        fullName: testName,
        status: 'passed',
        title: testName.split(': ').pop(),
        failureMessages: [],
        location: { column: 0, line: 0 }
      });
    } else if (line.startsWith('✗ ')) {
      const testName = line.substring(2);
      if (expectedFailure) {
        xfailed++; // Count as xfailed only, not failed
        tests.push({
          fullName: testName,
          status: 'xfailed',
          title: testName.split(': ').pop(),
          failureMessages: [line],
          location: { column: 0, line: 0 }
        });
      } else {
        failed++;
        tests.push({
          fullName: testName,
          status: 'failed',
          title: testName.split(': ').pop(),
          failureMessages: [line],
          location: { column: 0, line: 0 }
        });
      }
    }
  }

  return { passed, failed, xfailed, tests };
}

// Run tests and capture results
function runTests(repoPath, expectedFailure = false) {
  const startTime = new Date();
  let output = '';
  let returnCode = 0;

  try {
    // Check if we're running inside Docker (by checking for .dockerenv file or cgroup)
    const isInDocker = fs.existsSync('/.dockerenv') || fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');

    if (isInDocker) {
      // Running inside container, run tests directly
      output = execSync(`node tests/run-tests.js`, {
        encoding: 'utf8',
        cwd: process.cwd(),
        env: { ...process.env, REPO_PATH: repoPath },
        stdio: 'pipe'
      });
    } else {
      // Running on host, use Docker
      output = execSync(`docker compose run --rm -e REPO_PATH=${repoPath} app npm test`, {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });
    }
  } catch (error) {
    // Capture output even on failure
    output = error.stdout || error.message || '';
    returnCode = error.status || 1;
  }

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;

  const { passed, failed, xfailed, tests } = parseTestOutput(output, expectedFailure);

  // If expectedFailure is true, we consider the run successful if there are failures (which are now xfailures)
  // and no unexpected failures (though strict 'failed' count should be 0 if all were expected).
  // However, often 'xfailed' implies the test suite "passed" in the sense of configuration.
  const isSuccess = failed === 0 && (returnCode === 0 || expectedFailure);

  return {
    passed: isSuccess,
    return_code: expectedFailure ? 0 : returnCode, // Mask return code for expected failure
    output: output,
    summary: {
      numTotalTests: passed + failed + (xfailed || 0),
      numPassedTests: passed,
      numFailedTests: failed,
      numXFailedTests: xfailed || 0,
      numTotalTestSuites: 1,
      numPassedTestSuites: failed === 0 ? 1 : 0,
      numFailedTestSuites: failed > 0 ? 1 : 0
    },
    // Matrix: [passed, failed, xfailed]
    summary_matrix: [[passed, failed, xfailed || 0]],
    tests: tests
  };
}

// Main evaluation function
async function runEvaluation() {
  const runId = uuidv4();
  const startedAt = new Date();

  console.log('Starting evaluation...');

  try {
    // Run tests for repository_before (expect failures)
    const beforeResults = runTests('repository_before', true);

    // Run tests for repository_after
    const afterResults = runTests('repository_after');

    const finishedAt = new Date();
    const durationSeconds = (finishedAt - startedAt) / 1000;

    // Get environment info
    const nodeVersion = process.version;
    const platform = process.platform;

    // Helper to format tests for the report
    const formatTests = (tests) => {
      return tests.map(t => ({
        nodeid: t.fullName,
        name: t.title,
        outcome: t.status,
        message: t.failureMessages.length > 0 ? t.failureMessages.join('\n') : t.title
      }));
    };

    // Helper to format summary
    const formatSummary = (summary) => ({
      total: summary.numTotalTests,
      passed: summary.numPassedTests,
      failed: summary.numFailedTests,
      xfailed: summary.numXFailedTests || 0,
      errors: 0,
      skipped: 0
    });

    // Create report object matching the requested template
    const report = {
      run_id: runId,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_seconds: durationSeconds,
      success: afterResults.passed,
      error: null,
      environment: {
        node_version: nodeVersion,
        platform: platform,
        os: process.platform === 'win32' ? 'Windows_NT' : process.platform, // Approximation
        architecture: process.arch,
        hostname: require('os').hostname()
      },
      results: {
        before: {
          success: beforeResults.passed,
          exit_code: beforeResults.return_code,
          tests: formatTests(beforeResults.tests),
          summary: formatSummary(beforeResults.summary)
        },
        after: {
          success: afterResults.passed,
          exit_code: afterResults.return_code,
          tests: formatTests(afterResults.tests),
          summary: formatSummary(afterResults.summary)
        },
        comparison: {
          before_tests_passed: beforeResults.summary.numPassedTests === beforeResults.summary.numTotalTests && beforeResults.summary.numTotalTests > 0,
          after_tests_passed: afterResults.summary.numPassedTests === afterResults.summary.numTotalTests && afterResults.summary.numTotalTests > 0,
          before_total: beforeResults.summary.numTotalTests,
          before_passed: beforeResults.summary.numPassedTests,
          before_failed: beforeResults.summary.numFailedTests,
          before_xfailed: beforeResults.summary.numXFailedTests || 0,
          after_total: afterResults.summary.numTotalTests,
          after_passed: afterResults.summary.numPassedTests,
          after_failed: afterResults.summary.numFailedTests,
          after_xfailed: afterResults.summary.numXFailedTests || 0
        }
      }
    };

    // Create timestamp directory
    const timestampPath = getTimestampPath();
    fs.mkdirSync(timestampPath, { recursive: true });

    // Write report to file
    const reportPath = path.join(timestampPath, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Evaluation completed successfully. Report saved to: ${reportPath}`);
    console.log(`Tests passed: ${afterResults.summary.numPassedTests}/${afterResults.summary.numTotalTests}`);

  } catch (error) {
    console.error('Evaluation failed:', error.message);

    const finishedAt = new Date();
    const durationSeconds = (finishedAt - startedAt) / 1000;

    const errorReport = {
      run_id: runId,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_seconds: durationSeconds,
      success: false,
      error: error.message,
      environment: {
        node_version: process.version,
        platform: process.platform,
        architecture: process.arch,
        hostname: require('os').hostname()
      },
      results: {
        before: {
          success: false,
          exit_code: 1,
          tests: [],
          summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 }
        },
        after: {
          success: false,
          exit_code: 1,
          tests: [],
          summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 }
        },
        comparison: {
          before_tests_passed: false,
          after_tests_passed: false,
          before_total: 0,
          before_passed: 0,
          before_failed: 0,
          after_total: 0,
          after_passed: 0,
          after_failed: 0
        }
      }
    };

    // Create timestamp directory even for errors
    const timestampPath = getTimestampPath();
    fs.mkdirSync(timestampPath, { recursive: true });

    const reportPath = path.join(timestampPath, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));

    console.log(`Error report saved to: ${reportPath}`);
  }
}

// Run the evaluation
runEvaluation();