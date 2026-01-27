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

async function runEvaluationFor(repoPath: string, label: string): Promise<RunResults> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RUNNING EVALUATION: ${label.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);

  return new Promise((resolve) => {

    const start = Date.now();
    // Use npm test which is already configured for the project
    const child = cp.spawn('npm', ['test'], {
      env: { ...process.env, NODE_ENV: 'test', REPO_PATH: repoPath },
      shell: true,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      const duration = (Date.now() - start) / 1000;
      const metrics: any = {
          duration_sec: duration
      };

      // Extract metrics from output if available (e.g., from Vitest report)
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      
      if (passMatch) metrics.tests_passed = parseInt(passMatch[1]);
      if (failMatch) metrics.tests_failed = parseInt(failMatch[1]);

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

  // For this fullstack project, we only evaluate the final implementation in repository_after.
  const after = await runEvaluationFor('./repository_after', 'after');

  const finishedAt = new Date().toISOString();
  const durationSeconds = (Date.now() - startTime) / 1000;

  const comparison = {
    passed_gate: after.tests.passed,
    summary: after.tests.passed 
        ? "Implementation passed all correctness and security benchmarks." 
        : "Implementation failed to meet all benchmarks."
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
    after,
    comparison,
    success: comparison.passed_gate,
    error: after.tests.passed ? null : "Implementation failed tests"
  };

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const reportDir = path.join('evaluation', 'reports', dateStr, timeStr);  
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

