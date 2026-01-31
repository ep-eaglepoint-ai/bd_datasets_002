/**
 * Evaluation script for Access Service DAL Optimization
 * Runs tests on repository_after and generates report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTests(repoName) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: [],
    error: null
  };

  const projectRoot = path.join(__dirname, '..');

  // Check if repository has implementation
  const implPath = path.join(projectRoot, repoName, 'accessServiceList.dal.ts');
  if (!fs.existsSync(implPath)) {
    results.error = 'No implementation found';
    return results;
  }

  try {
    // Run Jest tests from project root with REPO env variable
    const output = execSync(
      `npm test -- --json --testLocationInResults`,
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test', REPO: repoName },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find Jest JSON output');
    }
    const jsonOutput = JSON.parse(jsonMatch[0]);

    jsonOutput.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        const testName = test.title;
        const isPassed = test.status === 'passed';
        results.tests.push({
          name: testName,
          passed: isPassed
        });
        results.total++;
        if (isPassed) {
          results.passed++;
        } else {
          results.failed++;
        }
      });
    });
  } catch (error) {
    // Try to parse JSON from error output (Jest exits with code 1 on test failures)
    const errorOutput = error.stdout || error.stderr || '';
    const jsonMatch = errorOutput.match(/\{[\s\S]*"testResults"[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const jsonOutput = JSON.parse(jsonMatch[0]);
        jsonOutput.testResults.forEach(suite => {
          suite.assertionResults.forEach(test => {
            const testName = test.title;
            const isPassed = test.status === 'passed';
            results.tests.push({
              name: testName,
              passed: isPassed
            });
            results.total++;
            if (isPassed) {
              results.passed++;
            } else {
              results.failed++;
            }
          });
        });
      } catch (parseError) {
        results.error = `Test execution failed: ${error.message}`;
      }
    } else {
      results.error = `Test execution failed: ${error.message}`;
    }
  }

  return results;
}

function generateReport(afterResults, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    repository_after: {
      passed: afterResults.passed,
      failed: afterResults.failed,
      total: afterResults.total,
      tests: afterResults.tests
    }
  };

  // Save report
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  return report;
}

function main() {
  console.log('='.repeat(60));
  console.log('Quantum-Resistant Cache Optimization - Evaluation');
  console.log('='.repeat(60));

  const projectRoot = path.join(__dirname, '..');

  // Create output directory with timestamp
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const outputDir = path.join(projectRoot, 'evaluation', dateStr, timeStr);
  const outputFile = path.join(outputDir, 'report.json');

  console.log(`\nProject Root: ${projectRoot}`);
  console.log(`Output: ${outputFile}\n`);

  // Run tests on repository_before
  console.log('[repository_before]');
  const beforeResults = runTests('repository_before');
  console.log(`  Total: ${beforeResults.total}, Passed: ${beforeResults.passed}, Failed: ${beforeResults.failed}`);
  if (beforeResults.error) {
    console.log(`  Error: ${beforeResults.error}`);
  }

  // Run tests on repository_after
  console.log('\n[repository_after]');
  const afterResults = runTests('repository_after');
  console.log(`  Total: ${afterResults.total}, Passed: ${afterResults.passed}, Failed: ${afterResults.failed}`);
  if (afterResults.error) {
    console.log(`  Error: ${afterResults.error}`);
  }

  // Generate report (only for repository_after)
  const report = generateReport(afterResults, outputFile);

  // Determine success
  const success = afterResults.failed === 0 && afterResults.total > 0;

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  if (success) {
    const testsFixed = beforeResults.failed;
    console.log(`  PASS: ${testsFixed} tests fixed in repository_after`);
    console.log(`  All ${afterResults.passed} tests now passing`);
  } else if (afterResults.failed > 0) {
    console.log(`  FAIL: ${afterResults.failed} tests still failing in repository_after`);
  } else {
    console.log(`  Result: ${afterResults.passed} tests passing`);
  }

  console.log(`\n  Report saved to: ${outputFile}`);
  console.log('='.repeat(60));

  process.exit(success ? 0 : 1);
}

main();
