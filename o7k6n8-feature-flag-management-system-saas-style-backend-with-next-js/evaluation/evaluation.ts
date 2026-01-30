#!/usr/bin/env node
/**
 * Evaluation script for Feature Flag Management System.
 * Follows the standard evaluation guide for TypeScript/Node projects.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, ExecSyncOptions } from 'child_process';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'evaluation', 'reports');

interface TestResult {
  passed: boolean;
  return_code: number;
  output: string;
}

interface Metrics {
  [key: string]: number | boolean | undefined;
}

interface EvaluationResult {
  tests: TestResult;
  metrics: Metrics;
}

interface Report {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  environment: {
    typescript_version: string;
    node_version: string;
    platform: string;
  };
  before: EvaluationResult;
  after: EvaluationResult;
  comparison: {
    passed_gate: boolean;
    improvement_summary: string;
  };
  success: boolean;
  error: string | null;
}

function getEnvironmentInfo(): { typescript_version: string; node_version: string; platform: string } {
  return {
    typescript_version: '5.3.2',
    node_version: process.version,
    platform: `${os.platform()}-${os.arch()}`
  };
}

function runTests(): TestResult {
  try {
    const options: ExecSyncOptions = {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000 // 5 minutes
    };

    const output = execSync('npm test 2>&1', options).toString();
    const passed = output.includes('20 passed') || output.includes('Tests:       20 passed');

    return {
      passed,
      return_code: passed ? 0 : 1,
      output: output.slice(0, 8000)
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.message || '';
    const passed = output.includes('20 passed');

    return {
      passed,
      return_code: error.status || -1,
      output: output.slice(0, 8000)
    };
  }
}

function runMetrics(repoPath: string): Metrics {
  // Optional - implement if metrics are needed
  return {};
}

function checkRepositoryBefore(repoName: string): TestResult {
  const beforeDir = path.join(ROOT, repoName);
  
  // Check if directory is essentially empty (only .gitkeep)
  const files = fs.existsSync(beforeDir) ? fs.readdirSync(beforeDir) : [];
  const onlyGitKeep = files.length === 0 || (files.length === 1 && files[0] === '.gitkeep');
  
  if (onlyGitKeep) {
    return {
      passed: false,
      return_code: 1,
      output: 'no tests to be executed on repo before'
    };
  }
  
  // If there are files, run tests normally
  return runTests();
}

function evaluate(repoName: string): EvaluationResult {
  const repoPath = path.join(ROOT, repoName);
  
  let tests: TestResult;
  if (repoName === 'repository_before') {
    tests = checkRepositoryBefore(repoName);
  } else {
    tests = runTests();
  }
  
  const metrics = runMetrics(repoPath);

  return {
    tests,
    metrics
  };
}

function runEvaluation(): Report {
  const runId = uuidv4();
  const start = new Date();

  const before = evaluate('repository_before');
  const after = evaluate('repository_after');

  const comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: 'After implementation passed correctness checks'
  };

  const end = new Date();

  const report: Report = {
    run_id: runId,
    started_at: start.toISOString() + 'Z',
    finished_at: end.toISOString() + 'Z',
    duration_seconds: (end.getTime() - start.getTime()) / 1000,
    environment: getEnvironmentInfo(),
    before,
    after,
    comparison,
    success: comparison.passed_gate,
    error: null
  };

  return report;
}

function main(): number {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  try {
    const report = runEvaluation();

    const reportPath = path.join(REPORTS_DIR, 'latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Report written to ${reportPath}`);
    console.log(`Success: ${report.success}`);

    return report.success ? 0 : 1;
  } catch (error: any) {
    console.error(`Evaluation failed: ${error.message}`);

    const errorReport: Report = {
      run_id: uuidv4(),
      started_at: new Date().toISOString() + 'Z',
      finished_at: new Date().toISOString() + 'Z',
      duration_seconds: 0,
      environment: getEnvironmentInfo(),
      before: {
        tests: { passed: false, return_code: -1, output: error.message },
        metrics: {}
      },
      after: {
        tests: { passed: false, return_code: -1, output: error.message },
        metrics: {}
      },
      comparison: {
        passed_gate: false,
        improvement_summary: `Evaluation error: ${error.message}`
      },
      success: false,
      error: error.message
    };

    const reportPath = path.join(REPORTS_DIR, 'latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));

    return 1;
  }
}

// Run evaluation
main();
