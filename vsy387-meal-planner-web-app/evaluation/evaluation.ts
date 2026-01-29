#!/usr/bin/env ts-node
/**
 * Evaluation script for Meal Planner Web App.
 * Runs all tests and generates a detailed report.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResults {
  tests: Record<string, 'PASSED' | 'FAILED'>;
  metrics: {
    total: number;
    passed: number;
    failed: number;
  };
  error: string | null;
}

interface Report {
  timestamp: string;
  after: TestResults;
  success: boolean;
  error: string | null;
}

function runTests(): { output: string; success: boolean } {
  try {
    const output = execSync('npm test -- --verbose 2>&1', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
    return { output, success: true };
  } catch (error: any) {
    return { output: error.stdout || error.message, success: false };
  }
}

function parseTestOutput(output: string): TestResults {
  const tests: Record<string, 'PASSED' | 'FAILED'> = {};
  const lines = output.split('\n');

  for (const line of lines) {
    // Match Jest verbose output: ✓ test name (time)
    const passMatch = line.match(/✓\s+(.+?)(?:\s+\(\d+\s*m?s\))?$/);
    if (passMatch) {
      const testName = passMatch[1].trim();
      tests[testName] = 'PASSED';
    }

    // Match Jest verbose output: ✕ test name (time)
    const failMatch = line.match(/✕\s+(.+?)(?:\s+\(\d+\s*m?s\))?$/);
    if (failMatch) {
      const testName = failMatch[1].trim();
      tests[testName] = 'FAILED';
    }
  }

  const passed = Object.values(tests).filter(v => v === 'PASSED').length;
  const failed = Object.values(tests).filter(v => v === 'FAILED').length;

  return {
    tests,
    metrics: {
      total: passed + failed,
      passed,
      failed,
    },
    error: null,
  };
}

function main(): void {
  console.log('='.repeat(60));
  console.log('Meal Planner Web App - Evaluation');
  console.log('='.repeat(60));
  console.log();

  console.log('Running tests...');
  const { output, success } = runTests();

  const results = parseTestOutput(output);

  console.log(output);
  console.log();
  console.log('='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.metrics.total}`);
  console.log(`Passed: ${results.metrics.passed}`);
  console.log(`Failed: ${results.metrics.failed}`);

  const isSuccess = results.metrics.failed === 0 && results.metrics.total > 0;
  const successRate =
    results.metrics.total > 0
      ? (results.metrics.passed / results.metrics.total) * 100
      : 0;
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Overall: ${isSuccess ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(60));

  // Create report
  const report: Report = {
    timestamp: new Date().toISOString(),
    after: results,
    success: isSuccess,
    error: null,
  };

  // Save report
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const reportDir = path.join('evaluation', dateStr, timeStr);

  fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nReport saved to: ${reportDir}/report.json`);

  process.exit(isSuccess ? 0 : 1);
}

main();
