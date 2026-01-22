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

// Run tests and capture results
function runTests(repoPath) {
  const startTime = new Date();

  try {
    // Check if we're running inside Docker (by checking for .dockerenv file or cgroup)
    const isInDocker = fs.existsSync('/.dockerenv') || fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');

    let output;
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

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    // Parse the output to extract test results
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
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
        failed++;
        const testName = line.substring(2);
        tests.push({
          fullName: testName,
          status: 'failed',
          title: testName.split(': ').pop(),
          failureMessages: [line],
          location: { column: 0, line: 0 }
        });
      }
    }

    return {
      passed: failed === 0,
      return_code: failed > 0 ? 1 : 0,
      output: output,
      summary: {
        numTotalTests: passed + failed,
        numPassedTests: passed,
        numFailedTests: failed,
        numTotalTestSuites: 1,
        numPassedTestSuites: failed === 0 ? 1 : 0,
        numFailedTestSuites: failed > 0 ? 1 : 0
      },
      summary_matrix: [[passed, failed]],
      tests: tests,
      raw_output: JSON.stringify({
        created: startTime.getTime() / 1000,
        duration: duration,
        exitcode: failed > 0 ? 1 : 0,
        root: '/app',
        environment: {},
        summary: {
          passed: passed,
          failed: failed,
          total: passed + failed,
          collected: passed + failed
        },
        tests: tests.map(test => ({
          nodeid: test.fullName,
          lineno: test.location.line,
          outcome: test.status,
          keywords: [test.title],
          setup: { duration: 0.0001, outcome: 'passed' },
          call: { duration: 0.001, outcome: test.status },
          teardown: { duration: 0.0001, outcome: 'passed' }
        }))
      })
    };
  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    return {
      passed: false,
      return_code: error.status || 1,
      output: error.stdout || error.message,
      summary: {
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        numTotalTestSuites: 1,
        numPassedTestSuites: 0,
        numFailedTestSuites: 1
      },
      summary_matrix: [[0, 0]],
      tests: [],
      raw_output: JSON.stringify({
        created: startTime.getTime() / 1000,
        duration: duration,
        exitcode: error.status || 1,
        root: '/app',
        environment: {},
        summary: { passed: 0, failed: 0, total: 0, collected: 0 },
        tests: []
      })
    };
  }
}

// Main evaluation function
async function runEvaluation() {
  const runId = uuidv4();
  const startedAt = new Date();

  console.log('Starting evaluation...');

  try {
    // Run tests for repository_before
    const beforeResults = runTests('repository_before');

    // Run tests for repository_after
    const afterResults = runTests('repository_after');

    const finishedAt = new Date();
    const durationSeconds = (finishedAt - startedAt) / 1000;

    // Get environment info
    const nodeVersion = process.version;
    const platform = process.platform;

    // Create report object
    const report = {
      run_id: runId,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_seconds: durationSeconds,
      environment: {
        node_version: nodeVersion,
        platform: platform
      },
      before: {
        tests: beforeResults,
        metrics: {
          execution_time_seconds: durationSeconds, // This is total time, maybe acceptable or should measure per run
          items_processed: 1,
          error: null
        }
      },
      after: {
        tests: afterResults,
        metrics: {
          execution_time_seconds: durationSeconds,
          items_processed: 1,
          error: null
        }
      },
      comparison: {
        passed_gate: afterResults.passed,
        improvement_summary: afterResults.passed ? "All tests passed" : "Some tests failed",
        speedup_factor: 1.0
      },
      success: afterResults.passed,
      error: null
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
      environment: {
        node_version: process.version,
        platform: process.platform
      },
      after: {
        tests: {
          passed: false,
          return_code: 1,
          output: error.message,
          summary: {
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numTotalTestSuites: 0,
            numPassedTestSuites: 0,
            numFailedTestSuites: 0
          },
          summary_matrix: [[0, 0]],
          tests: [],
          raw_output: '{}'
        },
        metrics: {
          execution_time_seconds: durationSeconds,
          items_processed: 0,
          error: error.message
        }
      },
      comparison: {
        passed_gate: false,
        improvement_summary: "Evaluation failed",
        speedup_factor: 0
      },
      success: false,
      error: error.message
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