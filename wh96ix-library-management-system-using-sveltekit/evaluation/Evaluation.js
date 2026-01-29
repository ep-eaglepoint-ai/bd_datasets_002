import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = join(process.cwd(), '..', 'evaluation', 'reports');
const BASE_URL = process.env.BASE_URL || 'http://app:5173';

// Ensure reports directory exists
mkdirSync(REPORTS_DIR, { recursive: true });

// Requirements mapping
const REQUIREMENTS = {
  1: {
    id: 1,
    description: 'Admin can add, update, delete, and view books',
    testSuites: ['Requirement 1: Admin can add, update, delete, and view books']
  },
  2: {
    id: 2,
    description: 'System must store book details (title, author, ISBN, category, total copies, available copies)',
    testSuites: ['Requirement 2: System must store book details']
  },
  3: {
    id: 3,
    description: 'Borrowers can search and view available books',
    testSuites: ['Requirement 3: Borrowers can search and view available books']
  },
  4: {
    id: 4,
    description: 'Borrowers can borrow and return books',
    testSuites: ['Requirement 4: Borrowers can borrow and return books']
  },
  5: {
    id: 5,
    description: 'System must assign and track due dates for borrowed books',
    testSuites: ['Requirement 5: System must assign and track due dates']
  },
  6: {
    id: 6,
    description: 'System must identify overdue books',
    testSuites: ['Requirement 6: System must identify overdue books']
  },
  7: {
    id: 7,
    description: 'Users can view borrowing history',
    testSuites: ['Requirement 7: Users can view borrowing history']
  },
  8: {
    id: 8,
    description: 'Authentication and role-based access (Admin / Borrower)',
    testSuites: ['Requirement 8: Authentication and role-based access']
  },
  9: {
    id: 9,
    description: 'Built using SvelteKit framework',
    testSuites: ['Requirement 9: Built using SvelteKit framework']
  },
  10: {
    id: 10,
    description: 'Responsive and user-friendly UI',
    testSuites: ['Requirement 10: Responsive and user-friendly UI']
  },
  11: {
    id: 11,
    description: 'Secure authentication and authorization',
    testSuites: ['Requirement 11: Secure authentication and authorization']
  },
  12: {
    id: 12,
    description: 'Database integration for persistent storage',
    testSuites: ['Requirement 12: Database integration for persistent storage']
  }
};

function parseTestResults(output) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    suites: {},
    tests: []
  };

  // Try to parse JSON output if available
  try {
    // Vitest can output JSON with --reporter=json
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      if (jsonData.testResults) {
        jsonData.testResults.forEach(suite => {
          suite.assertionResults.forEach(test => {
            results.total++;
            if (test.status === 'passed') {
              results.passed++;
            } else {
              results.failed++;
            }
            results.tests.push({
              name: test.fullName || test.title,
              status: test.status,
              suite: suite.name
            });
          });
        });
        return results;
      }
    }
  } catch (e) {
    // Fall through to text parsing
  }

  // Parse text output
  const lines = output.split('\n');
  let currentSuite = null;
  
  for (const line of lines) {
    // Match test results
    if (line.includes('✓') || line.includes('PASS')) {
      results.passed++;
      results.total++;
    } else if (line.includes('✗') || line.includes('FAIL') || line.includes('×')) {
      results.failed++;
      results.total++;
    }
    
    // Match suite names
    const suiteMatch = line.match(/Requirement \d+:/);
    if (suiteMatch) {
      currentSuite = line.trim();
      if (!results.suites[currentSuite]) {
        results.suites[currentSuite] = { passed: 0, failed: 0, total: 0 };
      }
    }
    
    // Match individual tests
    if (line.includes('should') || line.includes('✓') || line.includes('×')) {
      const testName = line.trim();
      if (testName && currentSuite) {
        results.tests.push({
          name: testName,
          status: line.includes('✓') || line.includes('PASS') ? 'passed' : 'failed',
          suite: currentSuite
        });
        if (line.includes('✓') || line.includes('PASS')) {
          results.suites[currentSuite].passed++;
        } else {
          results.suites[currentSuite].failed++;
        }
        results.suites[currentSuite].total++;
      }
    }
  }

  return results;
}

/**
 * Parse Vitest JSON test results file and convert to the format expected by Evaluation.js
 * @param {string} jsonFilePath - Path to the Vitest JSON results file
 * @returns {Object} Parsed test results in the format: { passed, failed, total, suites, tests }
 */
function parseVitestJsonResults(jsonFilePath) {
  try {
    const jsonContent = readFileSync(jsonFilePath, 'utf-8');
    const vitestResults = JSON.parse(jsonContent);

    const results = {
      passed: vitestResults.numPassedTests || 0,
      failed: vitestResults.numFailedTests || 0,
      total: vitestResults.numTotalTests || 0,
      suites: {},
      tests: []
    };

    // Process each test suite
    if (vitestResults.testResults && Array.isArray(vitestResults.testResults)) {
      vitestResults.testResults.forEach((suite) => {
        if (suite.assertionResults && Array.isArray(suite.assertionResults)) {
          suite.assertionResults.forEach((test) => {
            const status = test.status === 'passed' ? 'passed' : 'failed';
            const fullName = test.fullName || test.title || '';
            
            // Extract suite name from ancestorTitles or use the test file name
            let suiteName = '';
            if (test.ancestorTitles && test.ancestorTitles.length > 0) {
              // Find the requirement in ancestorTitles (e.g., "Requirement 1: ...")
              const requirementTitle = test.ancestorTitles.find(title => 
                /Requirement \d+:/.test(title)
              );
              if (requirementTitle) {
                suiteName = requirementTitle;
              } else {
                // Use the last ancestor title as suite name
                suiteName = test.ancestorTitles[test.ancestorTitles.length - 1];
              }
            } else {
              // Fallback to file name without extension
              suiteName = suite.name ? suite.name.replace(/\.(test|spec)\.(js|ts)$/, '') : 'Unknown';
            }

            // Initialize suite if it doesn't exist
            if (!results.suites[suiteName]) {
              results.suites[suiteName] = { passed: 0, failed: 0, total: 0 };
            }

            // Add test to results
            results.tests.push({
              name: fullName,
              status: status,
              suite: suiteName
            });

            // Update suite counts
            results.suites[suiteName].total++;
            if (status === 'passed') {
              results.suites[suiteName].passed++;
            } else {
              results.suites[suiteName].failed++;
            }
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error(`Error parsing Vitest JSON results from ${jsonFilePath}:`, error.message);
    return null;
  }
}

function evaluateRequirements(testResults) {
  const evaluation = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    requirements: [],
    summary: {
      total: 12,
      passed: 0,
      failed: 0,
      passRate: 0
    }
  };

  // Evaluate each requirement
  for (const [reqId, req] of Object.entries(REQUIREMENTS)) {
    const reqEval = {
      id: parseInt(reqId),
      description: req.description,
      status: 'failed',
      tests: [],
      passedTests: 0,
      failedTests: 0,
      totalTests: 0,
      details: ''
    };

    // Find tests for this requirement
    // Instead of relying on the parsed suite name (which can vary across reporters),
    // we match using the requirement tag in the full test name, e.g.
    // "Requirement 1: Admin can add, update, delete, and view books"
    const requirementTag = `Requirement ${req.id}:`;

    const relevantTests = testResults.tests.filter((test) => {
      const name = (test.name || '').toString();
      return name.includes(requirementTag);
    });

    reqEval.totalTests = relevantTests.length;
    reqEval.passedTests = relevantTests.filter(t => t.status === 'passed').length;
    reqEval.failedTests = relevantTests.filter(t => t.status === 'failed').length;
    reqEval.tests = relevantTests;

    // Determine requirement status
    // A requirement passes if at least 80% of its tests pass
    if (reqEval.totalTests > 0) {
      const passRate = (reqEval.passedTests / reqEval.totalTests) * 100;
      reqEval.status = passRate >= 80 ? 'passed' : 'failed';
      reqEval.details = `${reqEval.passedTests}/${reqEval.totalTests} tests passed (${passRate.toFixed(1)}%)`;
    } else {
      reqEval.status = 'failed';
      reqEval.details = 'No tests found for this requirement';
    }

    evaluation.requirements.push(reqEval);

    if (reqEval.status === 'passed') {
      evaluation.summary.passed++;
    } else {
      evaluation.summary.failed++;
    }
  }

  evaluation.summary.passRate = (evaluation.summary.passed / evaluation.summary.total) * 100;

  return evaluation;
}

function generateReport(evaluation, testResults) {
  // Derive meta-test summary (tests that are NOT tied to any requirement)
  const metaTests = testResults.tests.filter((t) => !/Requirement \d+:/.test(t.name));
  const metaPassed = metaTests.filter((t) => t.status === 'passed').length;
  const metaFailed = metaTests.filter((t) => t.status === 'failed').length;

  const report = {
    instanceId: 'WH96IX',
    timestamp: new Date().toISOString(),
    testResults: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: testResults.total > 0 
        ? ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
        : '0%'
    },
    requirements: evaluation.requirements.map(req => ({
      id: req.id,
      description: req.description,
      status: req.status,
      testResults: {
        total: req.totalTests,
        passed: req.passedTests,
        failed: req.failedTests,
        passRate: req.totalTests > 0 
          ? ((req.passedTests / req.totalTests) * 100).toFixed(2) + '%'
          : '0%'
      },
      details: req.details
    })),
    summary: {
      totalRequirements: evaluation.summary.total,
      passedRequirements: evaluation.summary.passed,
      failedRequirements: evaluation.summary.failed,
      overallPassRate: evaluation.summary.passRate.toFixed(2) + '%',
      allRequirementsMet: evaluation.summary.failed === 0
    },
    metaTests: {
      total: metaTests.length,
      passed: metaPassed,
      failed: metaFailed,
      passRate: metaTests.length > 0
        ? ((metaPassed / metaTests.length) * 100).toFixed(2) + '%'
        : '0%',
      details: metaTests.map((t) => ({
        name: t.name,
        status: t.status,
        suite: t.suite
      }))
    },
    comparison: {
      before: null, // Can be populated if comparing with previous results
      after: {
        passed: evaluation.summary.passed,
        failed: evaluation.summary.failed,
        passRate: evaluation.summary.passRate
      }
    }
  };

  return report;
}

async function main() {
  console.log('Starting evaluation...');
  console.log(`Base URL: ${BASE_URL}`);

  try {
    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), '..', 'evaluation', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    
    // Run tests
    console.log('Running tests...');
    let testOutput = '';
    try {
      testOutput = execSync(
        `npm run test 2>&1`,
        { 
          encoding: 'utf-8',
          cwd: process.cwd(),
          env: { ...process.env, BASE_URL }
        }
      );
      console.log('Tests completed');
    } catch (error) {
      // Tests may have failed, but we still want to parse results
      testOutput = error.stdout?.toString() || error.message || '';
      console.log('Tests completed with some failures (this is expected if requirements are not met)');
    }

    console.log('Parsing test results...');
    
    // Try to read JSON results file first
    const jsonResultsPath = join(reportsDir, 'test-results.json');
    let testResults = null;
    
    if (existsSync(jsonResultsPath)) {
      console.log('Reading JSON test results file...');
      testResults = parseVitestJsonResults(jsonResultsPath);
    }
    
    // Fallback to text parsing if JSON file doesn't exist or parsing failed
    if (!testResults || testResults.total === 0) {
      console.log('Falling back to text parsing...');
      testResults = parseTestResults(testOutput);
    }

    if (!testResults || testResults.total === 0) {
      throw new Error('No test results found. Tests may have failed to run.');
    }
    
    console.log(`Test Results: ${testResults.passed} passed, ${testResults.failed} failed, ${testResults.total} total`);

    // Evaluate requirements
    console.log('Evaluating requirements...');
    const evaluation = evaluateRequirements(testResults);

    // Generate report
    console.log('Generating report...');
    const report = generateReport(evaluation, testResults);

    // Create timestamped directory: evaluation/reports/<timestamp>/report.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = join(REPORTS_DIR, timestamp);
    mkdirSync(runDir, { recursive: true });

    const reportPath = join(runDir, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${reportPath}`);

    // Also save/update a flat latest report for convenience
    const latestReportPath = join(REPORTS_DIR, 'latest-evaluation-report.json');
    writeFileSync(latestReportPath, JSON.stringify(report, null, 2));
    console.log(`Latest report saved to: ${latestReportPath}`);

    // Print summary
    console.log('\n=== EVALUATION SUMMARY ===');
    console.log(`Total Requirements: ${report.summary.totalRequirements}`);
    console.log(`Passed: ${report.summary.passedRequirements}`);
    console.log(`Failed: ${report.summary.failedRequirements}`);
    console.log(`Overall Pass Rate: ${report.summary.overallPassRate}`);
    console.log(`All Requirements Met: ${report.summary.allRequirementsMet ? 'YES' : 'NO'}`);
    console.log('\n=== REQUIREMENT DETAILS ===');
    report.requirements.forEach(req => {
      console.log(`\nRequirement ${req.id}: ${req.description}`);
      console.log(`  Status: ${req.status.toUpperCase()}`);
      console.log(`  Tests: ${req.testResults.passed}/${req.testResults.total} passed (${req.testResults.passRate})`);
      console.log(`  Details: ${req.details}`);
    });

    // Exit with appropriate code
    process.exit(report.summary.allRequirementsMet ? 0 : 1);

  } catch (error) {
    console.error('Evaluation failed:', error.message);
    console.error(error.stack);
    
    // Generate error report
    const errorReport = {
      instanceId: 'WH96IX',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      requirements: Object.values(REQUIREMENTS).map(req => ({
        id: req.id,
        description: req.description,
        status: 'error',
        details: 'Evaluation failed before tests could run'
      })),
      summary: {
        totalRequirements: 12,
        passedRequirements: 0,
        failedRequirements: 12,
        overallPassRate: '0%',
        allRequirementsMet: false
      }
    };

    const errorReportPath = join(REPORTS_DIR, `evaluation-error-${Date.now()}.json`);
    writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));
    
    process.exit(1);
  }
}

main();
