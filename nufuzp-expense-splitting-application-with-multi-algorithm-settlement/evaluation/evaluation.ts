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

  const repoAbsolute = path.resolve(process.cwd(), repoPath);
  const testsPath = path.resolve(process.cwd(), 'tests');

  return new Promise((resolve) => {

    // Copy tests to repo to ensure vitest finds them and aliases work
    const repoTestsPath = path.join(repoAbsolute, 'tests');
    if (!fs.existsSync(repoTestsPath)) {
        fs.mkdirSync(repoTestsPath, { recursive: true });
    }
    
    // Simple copy of files from tests to repo/tests
    const testFiles = fs.readdirSync(testsPath);
    for (const file of testFiles) {
        if (file.endsWith('.test.ts')) {
            fs.copyFileSync(path.join(testsPath, file), path.join(repoTestsPath, file));
        }
    }

    const command = 'npx';
    const args = [
      'vitest', 
      'run', 
      '--root', 
      repoAbsolute
    ];

    const env = { ...process.env, REPO_PATH: repoAbsolute, NODE_ENV: 'test' };
    const start = Date.now();
    
    const child = cp.spawn(command, args, {
      env,
      shell: true,
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
      const calculationMatch = stdout.match(/Calculation of (\d+) expenses for (\d+) members took ([\d.]+)ms/);
      if (calculationMatch) {
          metrics.benchmark_duration_ms = parseFloat(calculationMatch[3]);
          metrics.expense_count = parseInt(calculationMatch[1]);
          metrics.member_count = parseInt(calculationMatch[2]);
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

  // Run evaluation for the final implementation
  const result = await runEvaluationFor('./repository_after', 'after');

  const finishedAt = new Date().toISOString();
  const durationSeconds = (Date.now() - startTime) / 1000;

  const report = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    environment: {
      node_version: process.version,
      platform: `${os.platform()}-${os.arch()}`
    },
    result,
    success: result.tests.passed,
    error: result.tests.passed ? null : "Implementation failed tests"
  };

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const reportsBaseDir = path.join(process.cwd(), 'evaluation', 'reports');
  const reportDir = path.join(reportsBaseDir, dateStr, timeStr);  
  
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
