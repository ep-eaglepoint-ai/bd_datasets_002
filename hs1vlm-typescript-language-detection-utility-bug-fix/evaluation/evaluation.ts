import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as os from 'os';

const ROOT = path.resolve(__dirname, '..');
const REPORTS_BASE = path.join(ROOT, 'evaluation', 'reports');

const OUTPUT_TRUNCATE = 8000;

interface TestResult {
  passed: boolean;
  return_code: number;
  output: string;
}

interface RepoResult {
  tests: TestResult;
  metrics: Record<string, number | boolean>;
}

interface EvaluationReport {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  environment: {
    python_version?: string;
    node_version: string;
    platform: string;
  };
  before: RepoResult;
  after: RepoResult;
  comparison: {
    passed_gate: boolean;
    improvement_summary: string;
  };
  success: boolean;
  error: string | null;
}

function environmentInfo(): EvaluationReport['environment'] {
  return {
    node_version: process.version,
    platform: `${os.platform()}-${os.arch()}`,
  };
}

function runTests(mode: 'before' | 'after'): TestResult {
  const script = mode === 'before' ? 'test:before' : 'test:after';
  const cmd = process.platform === 'win32' ? `npm run ${script}` : 'npm';
  const args = process.platform === 'win32' ? [] : ['run', script];

  try {
    const result = process.platform === 'win32'
      ? spawnSync(cmd, [], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024, shell: true })
      : spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });

    const output = [result.stdout || '', result.stderr || ''].join('\n').trim();
    const truncated = output.length > OUTPUT_TRUNCATE ? output.slice(0, OUTPUT_TRUNCATE) + '\n...[truncated]' : output;

    return {
      passed: result.status === 0,
      return_code: result.status ?? -1,
      output: truncated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      passed: false,
      return_code: -1,
      output: `Test run failed: ${message}`,
    };
  }
}

function runMetrics(_repoPath: string): Record<string, number | boolean> {
  return {};
}

function evaluate(repoName: 'repository_before' | 'repository_after'): RepoResult {
  const repoPath = path.join(ROOT, repoName);
  const tests = runTests(repoName === 'repository_before' ? 'before' : 'after');
  const metrics = runMetrics(repoPath);
  return { tests, metrics };
}

/**
 * Run full evaluation: before + after tests, build report.
 */
export function run_evaluation(): EvaluationReport {
  const runId = randomUUID();
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();

  const before = evaluate('repository_before');
  const after = evaluate('repository_after');

  const finishedAt = new Date();
  const finishedAtIso = finishedAt.toISOString();
  const durationSeconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;

  const passedGate = after.tests.passed;
  const improvementSummary = passedGate
    ? 'After implementation passed correctness tests.'
    : 'After implementation did not pass all correctness tests.';

  return {
    run_id: runId,
    started_at: startedAtIso,
    finished_at: finishedAtIso,
    duration_seconds: Math.round(durationSeconds * 1000) / 1000,
    environment: environmentInfo(),
    before,
    after,
    comparison: {
      passed_gate: passedGate,
      improvement_summary: improvementSummary,
    },
    success: passedGate,
    error: null,
  };
}

/**
 * Create report directory: evaluation/reports/YYYY-MM-DD/HH-mm-ss
 */
function getReportDir(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hr = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return path.join(REPORTS_BASE, `${yyyy}-${mm}-${dd}`, `${hr}-${min}-${sec}`);
}

/**
 * Main entry: write report to evaluation/reports/YYYY-MM-DD/HH-mm-ss/report.json, return exit code.
 */
export function main(): number {
  try {
    const reportDir = getReportDir();
    fs.mkdirSync(reportDir, { recursive: true });

    const report = run_evaluation();
    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    // Also write a stable copy for CI/post-build collectors that look for a JSON
    // directly under the `evaluation/` directory.
    const stableReportPath = path.join(ROOT, 'evaluation', 'report.json');
    fs.writeFileSync(stableReportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`Report written to ${reportPath}`);
    console.log('\n=== Evaluation Summary ===');
    console.log(`Before tests passed: ${report.before.tests.passed}`);
    console.log(`After tests passed: ${report.after.tests.passed}`);
    console.log(`Success: ${report.success}`);
    console.log(`Improvement Summary: ${report.comparison.improvement_summary}`);
    if (report.error) {
      console.log(`Error: ${report.error}`);
    }
    return report.success ? 0 : 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Evaluation failed:', message);
    return 1;
  }
}

if (require.main === module) {
  process.exit(main());
}
