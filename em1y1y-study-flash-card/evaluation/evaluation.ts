#!/usr/bin/env tsx
/**
 * Evaluation runner for Flash Card Study App.
 *
 * This evaluation script:
 * - Runs tests on the solution implementation
 * - Verifies all acceptance criteria are met
 * - Generates structured reports with test results
 *
 * Run with:
 *    docker compose run --rm app npm run evaluation
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
}

interface TestResults {
  passed: boolean;
  return_code: number;
  output: string;
  summary: TestSummary;
}

interface EvaluationReport {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  environment: {
    node_version: string;
    platform: string;
  };
  before: {
    tests: TestResults;
    metrics: Record<string, any>;
  };
  after: {
    tests: TestResults;
    metrics: Record<string, any>;
  };
  comparison: {
    passed_gate: boolean;
    improvement_summary: string;
  };
  success: boolean;
  error: string | null;
}

function generateRunId(): string {
  return randomUUID();
}

function getEnvironmentInfo() {
  const nodeVersion = process.version;
  const platform = `${process.platform}-${process.arch}`;
  return {
    node_version: nodeVersion,
    platform: platform,
  };
}

function truncateOutput(output: string, maxLines: number = 50): string {
  if (!output) return '';
  const lines = output.split('\n');
  if (lines.length <= maxLines) return output;
  const half = Math.floor(maxLines / 2);
  return [
    ...lines.slice(0, half),
    `... (${lines.length - maxLines} lines truncated) ...`,
    ...lines.slice(-half),
  ].join('\n');
}

function parseJestOutput(output: string): TestSummary {
  if (!output) return { total: 0, passed: 0, failed: 0 };

  // Parse Jest output to extract test counts
  // Format: "Tests: 6 failed, 118 passed, 124 total"
  const totalMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (totalMatch) {
    const failed = parseInt(totalMatch[1], 10);
    const passed = parseInt(totalMatch[2], 10);
    const total = parseInt(totalMatch[3], 10);
    return { total, passed, failed };
  }

  // Alternative format: "Tests: 118 passed, 124 total"
  const altMatch1 = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (altMatch1) {
    const passed = parseInt(altMatch1[1], 10);
    const total = parseInt(altMatch1[2], 10);
    return { total, passed, failed: total - passed };
  }

  // Format: "Tests: 22 passed, 22 total"
  const altMatch2 = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (altMatch2) {
    const passed = parseInt(altMatch2[1], 10);
    const total = parseInt(altMatch2[2], 10);
    return { total, passed, failed: total - passed };
  }

  // Count test results from output: "✓ should ..." or "✕ should ..."
  const passedMatches = output.match(/\s+✓\s+/g);
  const failedMatches = output.match(/\s+✕\s+/g);
  if (passedMatches || failedMatches) {
    const passed = passedMatches ? passedMatches.length : 0;
    const failed = failedMatches ? failedMatches.length : 0;
    const total = passed + failed;
    if (total > 0) {
      return { total, passed, failed };
    }
  }

  // Another format: "22 passed"
  const altMatch3 = output.match(/(\d+)\s+passed/i);
  if (altMatch3) {
    const passed = parseInt(altMatch3[1], 10);
    return { total: passed, passed, failed: 0 };
  }

  return { total: 0, passed: 0, failed: 0 };
}

function runTests(repoPath: string, label: string): TestResults {
  console.log(`Running tests for ${label}...`);

  try {
    const env = { ...process.env, REPO_PATH: repoPath };
    const output = execSync(
      `npm test 2>&1`,
      {
        encoding: 'utf-8',
        env,
        cwd: process.cwd(),
        stdio: 'pipe',
      }
    );

    const summary = parseJestOutput(output);
    const passed = summary.failed === 0 && summary.total > 0;

    return {
      passed,
      return_code: passed ? 0 : 1,
      output: truncateOutput(output),
      summary,
    };
  } catch (error: any) {
    // Jest exits with non-zero on failures, but we still want the output
    // Try to get output from different sources
    let output = '';
    if (error.stdout) {
      output = error.stdout.toString();
    } else if (error.stderr) {
      output = error.stderr.toString();
    } else if (error.output) {
      output = Array.isArray(error.output) ? error.output.join('\n') : error.output.toString();
    } else if (error.message) {
      output = error.message;
    }
    
    const summary = parseJestOutput(output);
    
    // If we got test results, consider it a successful run even if some failed
    const hasResults = summary.total > 0;
    
    return {
      passed: summary.failed === 0 && hasResults,
      return_code: hasResults ? 0 : (error.status || 1),
      output: truncateOutput(output),
      summary,
    };
  }
}

function runEvaluation(): EvaluationReport {
  const startedAt = new Date();
  const runId = generateRunId();
  const environment = getEnvironmentInfo();

  console.log('Starting evaluation...');
  console.log(`Run ID: ${runId}`);
  console.log(`Environment: ${JSON.stringify(environment, null, 2)}`);

  // Run tests against repository_before
  console.log('\n=== Testing repository_before ===');
  const beforeTests = runTests('repository_before', 'repository_before');

  // Run tests against repository_after
  console.log('\n=== Testing repository_after ===');
  const afterTests = runTests('repository_after', 'repository_after');

  const finishedAt = new Date();
  const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;

  // Determine if evaluation passed
  const passedGate = afterTests.passed && afterTests.summary.total > 0;
  
  let improvementSummary = '';
  if (beforeTests.summary.total === 0 && afterTests.summary.total > 0) {
    improvementSummary = `Tests implemented: ${afterTests.summary.total} tests added, ${afterTests.summary.passed} passing`;
  } else if (beforeTests.summary.failed > 0 && afterTests.summary.failed === 0) {
    improvementSummary = `All tests passing: ${afterTests.summary.passed}/${afterTests.summary.total} tests pass`;
  } else if (afterTests.summary.failed === 0) {
    improvementSummary = `All tests passing: ${afterTests.summary.passed}/${afterTests.summary.total} tests pass`;
  } else {
    improvementSummary = `Test status: ${afterTests.summary.passed} passed, ${afterTests.summary.failed} failed out of ${afterTests.summary.total} total`;
  }

  const success = passedGate && afterTests.return_code === 0;

  const report: EvaluationReport = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.round(duration * 1000) / 1000,
    environment,
    before: {
      tests: beforeTests,
      metrics: {},
    },
    after: {
      tests: afterTests,
      metrics: {},
    },
    comparison: {
      passed_gate: passedGate,
      improvement_summary: improvementSummary,
    },
    success,
    error: success ? null : 'Some tests failed or no tests were run',
  };

  return report;
}

function main() {
  try {
    const report = runEvaluation();

    // Create output directory (format: YYYY-MM-DD/HH-MM-SS)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].split('.')[0].replace(/:/g, '-'); // HH-MM-SS
    
    // Use process.cwd() to get the project root, then navigate to evaluation folder
    const evaluationDir = join(process.cwd(), 'evaluation');
    const outputDir = join(evaluationDir, dateStr, timeStr);
    
    console.log(`Creating output directory: ${outputDir}`);
    mkdirSync(outputDir, { recursive: true });

    // Write report
    const reportPath = join(outputDir, 'report.json');
    const reportContent = JSON.stringify(report, null, 2);
    writeFileSync(reportPath, reportContent, 'utf-8');

    console.log('\n=== Evaluation Complete ===');
    console.log(`Report saved to: ${reportPath}`);
    console.log(`Success: ${report.success}`);
    console.log(`Tests: ${report.after.tests.summary.passed}/${report.after.tests.summary.total} passed`);
    console.log(`Improvement: ${report.comparison.improvement_summary}`);

    // Print report to stdout
    console.log('\n=== Full Report ===');
    console.log(reportContent);

    process.exit(report.success ? 0 : 1);
  } catch (error: any) {
    console.error('Evaluation failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
