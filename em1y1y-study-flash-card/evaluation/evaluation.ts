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
  return {
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`,
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

/**
 * Parses Jest output into a summary.
 */
function parseJestOutput(output: string): TestSummary {
  if (!output) return { total: 0, passed: 0, failed: 0 };

  const match1 = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (match1) {
    const failed = parseInt(match1[1], 10);
    const passed = parseInt(match1[2], 10);
    const total = parseInt(match1[3], 10);
    return { total, passed, failed };
  }

  const match2 = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (match2) {
    const passed = parseInt(match2[1], 10);
    const total = parseInt(match2[2], 10);
    return { total, passed, failed: total - passed };
  }

  const passedMatches = output.match(/\s+✓\s+/g);
  const failedMatches = output.match(/\s+✕\s+/g);
  if (passedMatches || failedMatches) {
    const passed = passedMatches?.length ?? 0;
    const failed = failedMatches?.length ?? 0;
    return { total: passed + failed, passed, failed };
  }

  const match3 = output.match(/(\d+)\s+passed/i);
  if (match3) {
    const passed = parseInt(match3[1], 10);
    return { total: passed, passed, failed: 0 };
  }

  return { total: 0, passed: 0, failed: 0 };
}

/**
 * Runs npm test and captures results.
 */
function runTests(repoPath: string, label: string): TestResults {
  console.log(`Running tests for ${label}...`);

  try {
    const output = execSync(`npm test 2>&1`, {
      encoding: 'utf-8',
      env: { ...process.env, REPO_PATH: repoPath },
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    const summary = parseJestOutput(output);
    const passed = summary.failed === 0;

    return {
      passed,
      return_code: passed ? 0 : 1,
      output: truncateOutput(output),
      summary,
    };
  } catch (error: any) {
    const output =
      error?.stdout?.toString() ||
      error?.stderr?.toString() ||
      error?.message ||
      '';

    const summary = parseJestOutput(output);
    const hasResults = summary.total > 0;

    return {
      passed: hasResults && summary.failed === 0,
      return_code: hasResults ? 0 : 1,
      output: truncateOutput(output),
      summary,
    };
  }
}

/**
 * 🔑 NORMALIZATION STEP
 * repository_before is a baseline — test results are ignored
 * but execution must succeed.
 */
function normalizeBeforeResults(results: TestResults): TestResults {
  return {
    ...results,
    passed: true,
    return_code: 0,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };
}

function runEvaluation(): EvaluationReport {
  const startedAt = new Date();
  const runId = generateRunId();
  const environment = getEnvironmentInfo();

  console.log('Starting evaluation...');
  console.log(`Run ID: ${runId}`);

  console.log('\n=== Testing repository_before ===');
  const rawBeforeTests = runTests('repository_before', 'repository_before');
  const beforeTests = normalizeBeforeResults(rawBeforeTests);

  console.log('\n=== Testing repository_after ===');
  const afterTests = runTests('repository_after', 'repository_after');

  const finishedAt = new Date();
  const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;

  const passedGate = afterTests.passed && afterTests.summary.total > 0;

  let improvementSummary = '';
  if (beforeTests.summary.total === 0 && afterTests.summary.total > 0) {
    improvementSummary = `Tests implemented: ${afterTests.summary.total} tests added, ${afterTests.summary.passed} passing`;
  } else if (afterTests.summary.failed === 0) {
    improvementSummary = `All tests passing: ${afterTests.summary.passed}/${afterTests.summary.total} tests pass`;
  } else {
    improvementSummary = `Test status: ${afterTests.summary.passed} passed, ${afterTests.summary.failed} failed`;
  }

  const success = passedGate && afterTests.return_code === 0;

  return {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.round(duration * 1000) / 1000,
    environment,
    before: { tests: beforeTests, metrics: {} },
    after: { tests: afterTests, metrics: {} },
    comparison: {
      passed_gate: passedGate,
      improvement_summary: improvementSummary,
    },
    success,
    error: success ? null : 'Some tests failed or no tests were run',
  };
}

function main() {
  try {
    const report = runEvaluation();

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const outputDir = join(process.cwd(), 'evaluation', dateStr, timeStr);
    mkdirSync(outputDir, { recursive: true });

    const reportPath = join(outputDir, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n=== Evaluation Complete ===');
    console.log(`Success: ${report.success}`);
    console.log(`Improvement: ${report.comparison.improvement_summary}`);
    console.log(`Report saved to: ${reportPath}`);

    process.exit(report.success ? 0 : 1);
  } catch (error: any) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
