#!/usr/bin/env ts-node

// @ts-nocheck

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

interface TestResult {
  passed: boolean;
  returnCode: number;
  output: string;
}

interface Metrics {
  [key: string]: any;
}

interface RepoResult {
  tests: TestResult;
  metrics: Metrics;
}

interface Comparison {
  passed_gate: boolean;
  improvement_summary: string;
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
  before: RepoResult;
  after: RepoResult;
  comparison: Comparison;
  success: boolean;
  error: null;
}

function environmentInfo(): { node_version: string; platform: string } {
  return {
    node_version: process.version,
    platform: os.platform() + '-' + os.arch()
  };
}

function runTests(repo: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const cwd = ROOT;
    const env = { ...process.env, REPO: repo === 'repository_before' ? 'before' : 'after' };
    if (repo === 'repository_before') {
      // cd repository_before && npm install && cd .. && npm test
      const installProc = spawn('npm', ['install'], { cwd: path.join(cwd, 'repository_before'), stdio: 'pipe', env });
      installProc.on('close', (installCode: number | null) => {
        const testProc = spawn('npm', ['test'], { cwd: cwd, stdio: 'pipe', env });
        let output = '';
        testProc.stdout?.on('data', (data: Buffer) => output += data.toString());
        testProc.stderr?.on('data', (data: Buffer) => output += data.toString());
        testProc.on('close', (code: number | null) => {
          const processedOutput = processTestOutput(output);
          resolve({ passed: code === 0, returnCode: code || 0, output: processedOutput });
        });
      });
    } else {
      const testProc = spawn('npm', ['test'], { cwd: cwd, stdio: 'pipe', env });
      let output = '';
      testProc.stdout?.on('data', (data: Buffer) => output += data.toString());
      testProc.stderr?.on('data', (data: Buffer) => output += data.toString());
      testProc.on('close', (code: number | null) => {
        const processedOutput = processTestOutput(output);
        resolve({ passed: code === 0, returnCode: code || 0, output: processedOutput });
      });
    }
  });
}

function processTestOutput(output: string): string {
  const lines = output.split('\n');
  const summaryLines = lines.filter(line =>
    line.trim().startsWith('Test Suites:') ||
    line.trim().startsWith('Tests:') ||
    line.trim().startsWith('Snapshots:') ||
    line.trim().startsWith('Time:')
  );
  return summaryLines.join('\n');
}

function runMetrics(repoPath: string): Metrics {
  // Optional – implement if needed
  return {};
}

async function evaluate(repoName: string): Promise<RepoResult> {
  const tests = await runTests(repoName);
  const metrics = runMetrics(path.join(ROOT, repoName));
  return {
    tests,
    metrics
  };
}

async function run_evaluation(): Promise<EvaluationReport> {
  const run_id = uuidv4();
  const start = new Date();
  const before = await evaluate('repository_before');
  const after = await evaluate('repository_after');
  const comparison: Comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: after.tests.passed ? "After implementation passed correctness tests" : "After implementation failed correctness tests"
  };
  const end = new Date();
  return {
    run_id,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: (end.getTime() - start.getTime()) / 1000,
    environment: environmentInfo(),
    before,
    after,
    comparison,
    success: comparison.passed_gate,
    error: null
  };
}

async function main(): Promise<number> {
  if (!fs.existsSync(REPORTS)) {
    fs.mkdirSync(REPORTS, { recursive: true });
  }
  const report = await run_evaluation();
  const path_report = path.join(REPORTS, 'latest.json');
  fs.writeFileSync(path_report, JSON.stringify(report, null, 2));
  console.log(`Report written to ${path_report}`);
  if (report.success) {
    console.log('Evaluation succeeded');
  } else {
    console.log('Evaluation failed');
  }
  return report.success ? 0 : 1;
}

// Run main if this is the entry point
if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => { console.error(err); process.exit(1); });
}