/**
 * Evaluation script for Image Sharpener & Cropper Web Application.
 * Runs Vitest tests and generates a report.json with individual test results.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface TestResult {
  [testName: string]: 'PASSED' | 'FAILED';
}

interface Report {
  timestamp: string;
  after: {
    tests: TestResult;
    metrics: {
      total: number;
      passed: number;
      failed: number;
    };
    error: string | null;
  };
  success: boolean;
  error: string | null;
}

function parseVitestOutput(output: string): TestResult {
  const tests: TestResult = {};
  const lines = output.split('\n');

  for (const line of lines) {
    // Match: ✓ test name or × test name
    const passedMatch = line.match(/[✓✔]\s+(.+?)(?:\s+\d+ms)?$/);
    if (passedMatch) {
      let testName = passedMatch[1].trim();
      if (testName.includes(' > ')) {
        testName = testName.split(' > ').pop() || testName;
      }
      tests[testName] = 'PASSED';
      continue;
    }

    const failedMatch = line.match(/[×✗]\s+(.+?)(?:\s+\d+ms)?$/);
    if (failedMatch) {
      let testName = failedMatch[1].trim();
      if (testName.includes(' > ')) {
        testName = testName.split(' > ').pop() || testName;
      }
      tests[testName] = 'FAILED';
    }
  }

  return tests;
}

function countTests(output: string): { passed: number; failed: number } {
  const summaryMatch = output.match(/Tests\s+(\d+)\s+passed/);
  const failedMatch = output.match(/(\d+)\s+failed/);

  const passed = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

  if (passed === 0 && failed === 0) {
    const passCount = (output.match(/[✓✔]/g) || []).length;
    const failCount = (output.match(/[×✗]/g) || []).length;
    return { passed: passCount, failed: failCount };
  }

  return { passed, failed };
}

function main() {
  console.log('============================================================');
  console.log('Image Sharpener & Cropper - Evaluation');
  console.log('============================================================\n');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, '..');

  console.log(' Evaluating repository_after...');

  let output = '';
  let returnCode = 0;
  let error: string | null = null;

  try {
    output = execSync('npm test -- --reporter=verbose', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 300000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: any) {
    output = err.stdout || '';
    output += err.stderr || '';
    returnCode = err.status || 1;
    error = 'Tests failed';
  }

  const testResults = parseVitestOutput(output);
  const counts = countTests(output);
  const total = counts.passed + counts.failed;

  console.log(`    Passed: ${counts.passed}`);
  console.log(`    Failed: ${counts.failed}`);

  // Generate timestamped output directory
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS
  const outputDir = join(__dirname, dateStr, timeStr);
  mkdirSync(outputDir, { recursive: true });

  const report: Report = {
    timestamp: now.toISOString(),
    after: {
      tests: testResults,
      metrics: {
        total,
        passed: counts.passed,
        failed: counts.failed,
      },
      error,
    },
    success: counts.failed === 0 && total > 0,
    error: null,
  };

  const reportPath = join(outputDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n============================================================');
  console.log('EVALUATION SUMMARY');
  console.log('============================================================');
  console.log(`Total: ${total} | Passed: ${counts.passed} | Failed: ${counts.failed}`);
  console.log(`Success Rate: ${total > 0 ? ((counts.passed / total) * 100).toFixed(1) : 0}%`);
  console.log(`Overall: ${report.success ? 'PASS' : 'FAIL'}`);
  console.log('============================================================');
  console.log(`\nReport saved to: ${reportPath}`);

  process.exit(report.success ? 0 : 1);
}

main();
