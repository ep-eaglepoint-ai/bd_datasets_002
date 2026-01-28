#!/usr/bin/env node
/**
 * Evaluation runner for CSV Dataset Explorer
 * 
 * This evaluation script:
 * - Runs Jest tests on the tests/ folder
 * - Collects individual test results with pass/fail status
 * - Generates structured reports with environment metadata
 * 
 * Run with:
 * npm run evaluate
 * or
 * node evaluation/evaluation.ts [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  nodeid: string;
  name: string;
  outcome: 'passed' | 'failed' | 'error' | 'skipped';
  duration?: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
}

interface TestRunResult {
  success: boolean;
  exit_code: number;
  tests: TestResult[];
  summary: TestSummary;
  stdout: string;
  stderr: string;
  duration?: number;
}

interface GitInfo {
  git_commit: string;
  git_branch: string;
}

interface EnvironmentInfo extends GitInfo {
  node_version: string;
  npm_version: string;
  platform: string;
  os: string;
  os_release: string;
  architecture: string;
  hostname: string;
  jest_version: string;
  typescript_version: string;
}

interface EvaluationReport {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  success: boolean;
  error?: string;
  environment: EnvironmentInfo;
  results: TestRunResult;
}

function generateRunId(): string {
  return uuidv4().substring(0, 8);
}

function getGitInfo(): GitInfo {
  const gitInfo: GitInfo = {
    git_commit: 'unknown',
    git_branch: 'unknown'
  };

  try {
    const commit = execSync('git rev-parse HEAD', { 
      encoding: 'utf8', 
      timeout: 5000 
    }).trim().substring(0, 8);
    gitInfo.git_commit = commit;
  } catch (error) {
    // Git not available or not in a git repository
  }

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
      encoding: 'utf8', 
      timeout: 5000 
    }).trim();
    gitInfo.git_branch = branch;
  } catch (error) {
    // Git not available or not in a git repository
  }

  return gitInfo;
}

function getPackageVersion(packageName: string): string {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return packageJson.dependencies?.[packageName] || 
           packageJson.devDependencies?.[packageName] || 
           'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function getEnvironmentInfo(): EnvironmentInfo {
  const gitInfo = getGitInfo();
  
  let npmVersion = 'unknown';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf8', timeout: 5000 }).trim();
  } catch (error) {
    // npm not available
  }

  return {
    node_version: process.version,
    npm_version: npmVersion,
    platform: os.platform(),
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    jest_version: getPackageVersion('jest'),
    typescript_version: getPackageVersion('typescript'),
    ...gitInfo
  };
}

function parseJestOutput(output: string): TestResult[] {
  const tests: TestResult[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Match Jest test result lines with checkmarks and crosses
    // Examples:
    // ✓ should render basic header without dataset info (76 ms)
    // ✗ should handle save action failure (25 ms)
    
    const passMatch = trimmedLine.match(/^✓\s+(.+?)\s+\((\d+)\s*ms\)/);
    const failMatch = trimmedLine.match(/^✗\s+(.+?)(?:\s+\((\d+)\s*ms\))?/);
    
    if (passMatch) {
      const [, testName, duration] = passMatch;
      tests.push({
        nodeid: testName,
        name: testName,
        outcome: 'passed',
        duration: parseInt(duration, 10)
      });
    } else if (failMatch) {
      const [, testName, duration] = failMatch;
      tests.push({
        nodeid: testName,
        name: testName,
        outcome: 'failed',
        duration: duration ? parseInt(duration, 10) : undefined
      });
    }
  }
  
  // If we couldn't parse individual tests, extract from summary
  if (tests.length === 0) {
    const testSuiteMatch = output.match(/Test Suites:\s*(?:(\d+)\s*failed,\s*)?(\d+)\s*passed,\s*(\d+)\s*total/);
    const testMatch = output.match(/Tests:\s*(?:(\d+)\s*failed,\s*)?(\d+)\s*passed,\s*(\d+)\s*total/);
    
    if (testMatch) {
      const failed = testMatch[1] ? parseInt(testMatch[1], 10) : 0;
      const passed = parseInt(testMatch[2], 10);
      const total = parseInt(testMatch[3], 10);
      
      // Create summary entries based on actual test results
      for (let i = 0; i < passed; i++) {
        tests.push({
          nodeid: `passed-test-${i + 1}`,
          name: `Test ${i + 1}`,
          outcome: 'passed'
        });
      }
      
      for (let i = 0; i < failed; i++) {
        tests.push({
          nodeid: `failed-test-${i + 1}`,
          name: `Failed Test ${i + 1}`,
          outcome: 'failed'
        });
      }
    }
  }
  
  return tests;
}

function runJestTests(): Promise<TestRunResult> {
  return new Promise((resolve) => {
    console.log('\n' + '='.repeat(60));
    console.log('RUNNING JEST TESTS');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    
    // Run Jest with verbose output
    const jestProcess = spawn('npm', ['test', '--', '--verbose', '--passWithNoTests'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    jestProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    jestProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    jestProcess.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Parse test results
      const tests = parseJestOutput(stdout + stderr);
      
      // Calculate summary
      const passed = tests.filter(t => t.outcome === 'passed').length;
      const failed = tests.filter(t => t.outcome === 'failed').length;
      const errors = tests.filter(t => t.outcome === 'error').length;
      const skipped = tests.filter(t => t.outcome === 'skipped').length;
      const total = tests.length;
      
      console.log(`\nResults: ${passed} passed, ${failed} failed, ${errors} errors, ${skipped} skipped (total: ${total})`);
      
      // Print individual test results
      for (const test of tests) {
        const statusIcon = {
          'passed': '✅',
          'failed': '❌',
          'error': '💥',
          'skipped': '⏭️'
        }[test.outcome] || '❓';
        
        console.log(`  ${statusIcon} ${test.name}: ${test.outcome}`);
      }
      
      resolve({
        success: code === 0,
        exit_code: code || 0,
        tests,
        summary: {
          total,
          passed,
          failed,
          errors,
          skipped
        },
        stdout: stdout.length > 3000 ? stdout.slice(-3000) : stdout,
        stderr: stderr.length > 1000 ? stderr.slice(-1000) : stderr,
        duration
      });
    });
    
    jestProcess.on('error', (error) => {
      resolve({
        success: false,
        exit_code: -1,
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          errors: 1,
          skipped: 0
        },
        stdout: '',
        stderr: error.message
      });
    });
    
    // Set timeout
    setTimeout(() => {
      jestProcess.kill();
      resolve({
        success: false,
        exit_code: -1,
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          errors: 1,
          skipped: 0
        },
        stdout: '',
        stderr: 'Test execution timed out'
      });
    }, 120000); // 2 minutes timeout
  });
}

function generateOutputPath(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const outputDir = path.join('evaluation', 'reports', dateStr, timeStr);
  
  // Create directory if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });
  
  return path.join(outputDir, 'report.json');
}

async function runEvaluation(): Promise<TestRunResult> {
  console.log('\n' + '='.repeat(60));
  console.log('CSV DATASET EXPLORER EVALUATION');
  console.log('='.repeat(60));
  
  // Run Jest tests
  const results = await runJestTests();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTest Results:`);
  console.log(`  Overall: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Tests: ${results.summary.passed}/${results.summary.total} passed`);
  console.log(`  Duration: ${results.duration?.toFixed(2)}s`);
  
  return results;
}

async function main(): Promise<number> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const customOutput = outputIndex !== -1 && args[outputIndex + 1] ? args[outputIndex + 1] : null;
  
  // Generate run ID and timestamps
  const runId = generateRunId();
  const startedAt = new Date();
  
  console.log(`Run ID: ${runId}`);
  console.log(`Started at: ${startedAt.toISOString()}`);
  
  let results: TestRunResult;
  let success = false;
  let errorMessage: string | undefined;
  
  try {
    results = await runEvaluation();
    success = results.success;
    errorMessage = success ? undefined : 'Some tests failed';
  } catch (error) {
    console.error(`\nERROR: ${error}`);
    console.error(error);
    
    results = {
      success: false,
      exit_code: -1,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 1,
        skipped: 0
      },
      stdout: '',
      stderr: String(error)
    };
    success = false;
    errorMessage = String(error);
  }
  
  const finishedAt = new Date();
  const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;
  
  // Collect environment information
  const environment = getEnvironmentInfo();
  
  // Build report
  const report: EvaluationReport = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.round(duration * 1000) / 1000,
    success,
    error: errorMessage,
    environment,
    results
  };
  
  // Determine output path
  const outputPath = customOutput || generateOutputPath();
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Write report
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  // Create a very obvious test report for the platform
  const platformReport = {
    testResults: report.results,
    summary: report.results.summary,
    success: report.success,
    timestamp: report.finished_at,
    runId: report.run_id
  };
  
  // Write to multiple standard locations for platform compatibility
  const reportFiles = [
    'TEST-REPORT.json',
    'test-report.json',
    'report.json', 
    'test-results.json',
    'junit-results.json',
    'evaluation-report.json',
    'EVALUATION-RESULTS.json'
  ];
  
  reportFiles.forEach(filename => {
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  });
  
  // Also create a reports directory with the report
  const reportsDir = 'reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(reportsDir, 'TEST-REPORT.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'report.json'), JSON.stringify(report, null, 2));
  
  console.log(`\n✅ Report saved to: ${outputPath}`);
  console.log(`✅ Platform reports saved to multiple locations:`);
  reportFiles.forEach(filename => {
    console.log(`   - ${filename}`);
  });
  console.log(`   - reports/TEST-REPORT.json`);
  console.log(`   - reports/report.json`);
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Run ID: ${runId}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Success: ${success ? '✅ YES' : '❌ NO'}`);
  
  return success ? 0 : 1;
}

// Run if this file is executed directly
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  runEvaluation,
  generateRunId,
  getEnvironmentInfo,
  parseJestOutput,
  runJestTests
};