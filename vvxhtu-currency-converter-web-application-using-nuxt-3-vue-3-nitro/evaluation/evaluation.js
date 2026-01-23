/**
 * Evaluation script for Currency Converter
 * Runs tests on repository_after and generates report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTests(repoPath) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: {},
    error: null
  };

  // Check if repository has implementation
  const implPath = path.join(repoPath, 'currencyConverter.ts');
  if (!fs.existsSync(implPath)) {
    results.error = 'No implementation found';
    return results;
  }

  try {
    // Run Jest tests
    const output = execSync(
      `cd ${repoPath} && npm test -- --ci --json --testLocationInResults`,
      { 
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' },
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
        const status = test.status === 'passed' ? 'PASSED' : 'FAILED';
        results.tests[testName] = status;
        results.total++;
        if (status === 'PASSED') {
          results.passed++;
        } else {
          results.failed++;
        }
      });
    });
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const jsonMatch = errorOutput.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const jsonOutput = JSON.parse(jsonMatch[0]);
        jsonOutput.testResults.forEach(suite => {
          suite.assertionResults.forEach(test => {
            const testName = test.title;
            const status = test.status === 'passed' ? 'PASSED' : 'FAILED';
            results.tests[testName] = status;
            results.total++;
            if (status === 'PASSED') {
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

function main() {
  console.log('='.repeat(60));
  console.log('Currency Converter - Evaluation');
  console.log('='.repeat(60));

  const projectRoot = path.join(__dirname, '..');
  const repoAfter = path.join(projectRoot, 'repository_after');

  // Create output directory with timestamp
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const outputDir = path.join(projectRoot, 'evaluation', dateStr, timeStr);
  const outputFile = path.join(outputDir, 'report.json');

  console.log(`\n📂 Project Root: ${projectRoot}`);
  console.log(`📄 Output: ${outputFile}\n`);

  // Run tests on repository_after
  console.log('🔍 Evaluating repository_after...');
  const afterResults = runTests(repoAfter);
  console.log(`   ✓ Passed: ${afterResults.passed}`);
  console.log(`   ✗ Failed: ${afterResults.failed}`);
  if (afterResults.error) {
    console.log(`   ⚠ Error: ${afterResults.error}`);
  }

  // Generate report
  const report = {
    timestamp: now.toISOString(),
    repository_after: {
      tests: afterResults.tests,
      metrics: {
        total: afterResults.total,
        passed: afterResults.passed,
        failed: afterResults.failed
      },
      error: afterResults.error
    },
    success: afterResults.failed === 0 && afterResults.total > 0
  };

  // Save report
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${afterResults.total}`);
  console.log(`Passed: ${afterResults.passed}`);
  console.log(`Failed: ${afterResults.failed}`);
  console.log(`Success Rate: ${((afterResults.passed / afterResults.total) * 100).toFixed(1)}%`);
  console.log(`Overall: ${report.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log('='.repeat(60));

  process.exit(report.success ? 0 : 1);
}

main();