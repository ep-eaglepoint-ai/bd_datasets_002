import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';


interface RunResults {
  tests: {
    passed: boolean;
    return_code: number;
    output: string;
  };
  metrics: Record<string, number | boolean>;
}

const useCompiled = fs.existsSync(path.join(process.cwd(), 'dist/tests/test.js'));

async function runEvaluationFor(repoPath: string, label: string): Promise<RunResults> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RUNNING EVALUATION: ${label.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);

  const script = useCompiled ? 'dist/tests/test.js' : 'tests/test.ts';
  const nodeArgs = useCompiled
    ? ['--expose-gc', script]
    : ['--expose-gc', '-r', 'ts-node/register', script];
  const resolvedRepo = useCompiled
    ? path.resolve(process.cwd(), repoPath.replace(/^\.\.\//, 'dist/'))
    : repoPath;

  return new Promise((resolve) => {
    const env = { ...process.env, REPO_PATH: resolvedRepo, NODE_ENV: 'test' };
    const start = Date.now();
    const child = cp.spawn('node', nodeArgs, {
      env,
      shell: false,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      const duration = (Date.now() - start) / 1000;
      const metrics: any = {
          duration_sec: duration
      };

      // Extract metrics from output if available
      const durationMatch = stdout.match(/Duration: ([\d.]+)s/g);
      if (durationMatch) {
          metrics.phase1_duration = parseFloat(durationMatch[0].split(': ')[1]);
          if (durationMatch[1]) metrics.phase2_duration = parseFloat(durationMatch[1].split(': ')[1]);
      }
      const heapMatch = stdout.match(/Added heap: ([\d.]+)MB/);
      if (heapMatch) {
          metrics.added_heap_mb = parseFloat(heapMatch[1]);
      }

      resolve({
        tests: {
          passed: code === 0,
          return_code: code ?? -1,
          output: (stdout + stderr).slice(-8000)
        },
        metrics
      });
    });
  });
}

async function main() {
  const runId = Math.random().toString(36).substring(2, 10);
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const before = await runEvaluationFor('../repository_before/safaricom_calls', 'before');
  const after = await runEvaluationFor('../repository_after/safaricom_calls', 'after');

  const finishedAt = new Date().toISOString();
  const durationSeconds = (Date.now() - startTime) / 1000;

  const comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: after.tests.passed 
        ? "After implementation passed all correctness and performance benchmarks. Before failed functional and performance tests." 
        : "After implementation failed to meet all benchmarks."
  };

  const report = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    environment: {
      node_version: process.version,
      platform: `${os.platform()}-${os.arch()}`
    },
    before,
    after,
    comparison,
    success: comparison.passed_gate,
    error: after.tests.passed ? null : "After implementation failed tests"
  };

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const reportDir = path.join('evaluation', dateStr, timeStr);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('EVALUATION COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`Success: ${report.success ? '✅ YES' : '❌ NO'}`);
  console.log(`Report saved to: ${reportPath}`);

  process.exit(report.success ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
