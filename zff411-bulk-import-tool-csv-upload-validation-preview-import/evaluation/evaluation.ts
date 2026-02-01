import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'error';
  duration: number | null;
  error: string | null;
}

interface Metrics {
  timestamp: string;
  execution_time_seconds: number;
  total_tests: number;
  passed: number;
  failed: number;
  pass_rate: number;
  status: 'success' | 'failure' | 'error';
  tests: TestResult[];
  error_logs: string[];
  stdout: string;
  stderr: string;
}

function checkAppRunning(url: string = 'http://localhost:3000', timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
        resolve(res.statusCode !== undefined);
    });

    req.on('error', () => {
        resolve(false);
    });

    req.setTimeout(timeout, () => {
        req.destroy();
        resolve(false);
    });
  });
}

async function runTests(appUrl: string): Promise<Metrics> {
  const startTime = Date.now();
  const output: Partial<Metrics> = {
    tests: [],
    error_logs: [],
    stdout: '',
    stderr: ''
  };

  try {
    // Run playwright tests with JSON reporter
    // We expect it to fail if tests fail, so we catch the error
    const { stdout, stderr } = await execAsync(`npx playwright test --reporter=json`, {
      env: { ...process.env, APP_URL: appUrl }
    }).catch((err: any) => {
        // execAsync throws on non-zero exit code, but we still want the output
        return { stdout: err.stdout, stderr: err.stderr };
    });

    output.stdout = stdout;
    output.stderr = stderr;

    const testResultsRaw = JSON.parse(stdout);
    
    // Transform Playwright JSON report to our format
    // Playwright JSON structure: suites[].specs[].tests[].results[]
    // We flatten this
    
    let passed = 0;
    let failed = 0;
    const tests: TestResult[] = [];

    // Helper to traverse the suite structure
    function processSuite(suite: any) {
        if (suite.specs) {
            for (const spec of suite.specs) {
                const testName = spec.title;
                // Assuming one project/runner per spec usually
                const latestResult = spec.tests[0]?.results[0]; // simplistic view
                
                if (latestResult) {
                    const status = latestResult.status === 'passed' ? 'pass' : 'fail';
                    if (status === 'pass') passed++;
                    else failed++;
                    
                    tests.push({
                        name: testName,
                        status: status,
                        duration: latestResult.duration / 1000 || 0,
                        error: latestResult.error ? latestResult.error.message : null
                    });
                }
            }
        }
        
        if (suite.suites) {
            for (const childSuite of suite.suites) {
                processSuite(childSuite);
            }
        }
    }
    
    processSuite(testResultsRaw);
    
    output.tests = tests;
    output.passed = passed;
    output.failed = failed;
    output.total_tests = passed + failed;

  } catch (error: any) {
    output.error_logs?.push(error.message || String(error));
    // If we completely failed to run/parse
    if (!output.total_tests) {
         output.status = 'error';
    }
  }

  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;

  const total = output.total_tests || 0;
  const passed = output.passed || 0;
  const failed = output.failed || 0;
  
  return {
    timestamp: new Date().toISOString(),
    execution_time_seconds: parseFloat(executionTime.toFixed(3)),
    total_tests: total,
    passed: passed,
    failed: failed,
    pass_rate: total > 0 ? parseFloat(((passed / total) * 100).toFixed(2)) : 0,
    status: (failed === 0 && total > 0) ? 'success' : 'failure',
    tests: output.tests || [],
    error_logs: output.error_logs || [],
    stdout: typeof output.stdout === 'string' ? output.stdout.substring(0, 5000) : '',
    stderr: typeof output.stderr === 'string' ? output.stderr.substring(0, 5000) : ''
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Bulk Import Tool - Evaluation Runner');
  console.log('='.repeat(60));
  console.log();

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  console.log(`Checking if Next.js app is running at ${appUrl}...`);
  const isRunning = await checkAppRunning(appUrl);

  let metrics: Metrics;

  if (!isRunning) {
    console.log(`✗ Next.js app is not running at ${appUrl}`);
    console.log('Please start the app with: cd repository_after && npm run dev');
    
    metrics = {
      timestamp: new Date().toISOString(),
      execution_time_seconds: 0,
      total_tests: 0,
      passed: 0,
      failed: 0,
      pass_rate: 0,
      status: 'error',
      tests: [],
      error_logs: [`Next.js app is not running at ${appUrl}. Start with: cd repository_after && npm run dev`],
      stdout: '',
      stderr: ''
    };
  } else {
    console.log(`✓ Next.js app is running at ${appUrl}`);
    console.log();
    console.log('Running tests...');
    console.log('-'.repeat(60));

    metrics = await runTests(appUrl);
  }

  const scriptDir = __dirname;
  const metricsPath = path.join(scriptDir, 'report.json');
  
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

  console.log();
  console.log('='.repeat(60));
  console.log('EVALUATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${metrics.total_tests}`);
  console.log(`Passed: ${metrics.passed}`);
  console.log(`Failed: ${metrics.failed}`);
  console.log(`Pass Rate: ${metrics.pass_rate}%`);
  console.log(`Execution Time: ${metrics.execution_time_seconds}s`);
  console.log(`Status: ${metrics.status.toUpperCase()}`);
  console.log();
  console.log(`Report saved to: ${metricsPath}`);

  if (metrics.error_logs.length > 0) {
    console.log();
    console.log('Error Logs:');
    for (const error of metrics.error_logs.slice(0, 5)) {
        console.log(`  - ${(error).substring(0, 200)}...`);
    }
  }

  process.exit(metrics.status === 'success' ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
