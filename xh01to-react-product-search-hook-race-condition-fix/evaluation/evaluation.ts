#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
  return {
    node_version: process.version,
    platform: os.platform() + '-' + os.arch()
  };
}

function runTests(repo: string): Promise<{ passed: boolean; returnCode: number; output: string }> {
  return new Promise((resolve) => {
    let cwd = ROOT;
    if (repo === 'repository_before') {
      // cd repository_before && npm install && cd .. && npm test
      const installProc = spawn('npm', ['install'], { cwd: path.join(cwd, 'repository_before'), stdio: 'pipe' });
      installProc.on('close', (installCode: number | null) => {
        const testProc = spawn('npm', ['test'], { cwd: cwd, stdio: 'pipe' });
        let output = '';
        testProc.stdout.on('data', (data: Buffer) => output += data.toString());
        testProc.stderr.on('data', (data: Buffer) => output += data.toString());
        testProc.on('close', (code: number | null) => {
          resolve({ passed: code === 0, returnCode: code || 0, output: output.slice(0, 8000) });
        });
      });
    } else {
      const testProc = spawn('npm', ['test'], { cwd: cwd, stdio: 'pipe' });
      let output = '';
      testProc.stdout.on('data', (data: Buffer) => output += data.toString());
      testProc.stderr.on('data', (data: Buffer) => output += data.toString());
      testProc.on('close', (code: number | null) => {
        resolve({ passed: code === 0, returnCode: code || 0, output: output.slice(0, 8000) });
      });
    }
  });
}

function runMetrics(repoPath: string): any {
  // Optional – implement if needed
  return {};
}

async function evaluate(repoName: string) {
  const tests = await runTests(repoName);
  const metrics = runMetrics(path.join(ROOT, repoName));
  return {
    tests,
    metrics
  };
}

export async function run_evaluation() {
  const run_id = uuidv4();
  const start = new Date();
  const before = await evaluate('repository_before');
  const after = await evaluate('repository_after');
  const comparison = {
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

if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => { console.error(err); process.exit(1); });
}