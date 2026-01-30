// filename: evaluation/evaluation.js
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true, env: { ...process.env } });
    let stdout = '', stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); process.stdout.write(data); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); process.stderr.write(data); });
    proc.on('close', (code) => resolve({ exitCode: code, stdout, stderr, output: stdout + stderr }));
  });
}

function parseTestResults(output) {
  const tests = [];
  const passMatches = output.match(/✓/g) || [];
  const failMatches = output.match(/[✗×]/g) || [];
  
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('✓')) {
      const match = line.match(/✓\s+(.+?)(?:\s+\d+ms)?$/);
      if (match) tests.push({ name: match[1].trim(), status: 'PASS', duration: '0.00s' });
    } else if (line.includes('✗') || line.includes('×')) {
      const match = line.match(/[✗×]\s+(.+?)(?:\s+\d+ms)?$/);
      if (match) tests.push({ name: match[1].trim(), status: 'FAIL', duration: '0.00s' });
    }
  }

  return {
    passed: passMatches.length,
    failed: failMatches.length,
    total: passMatches.length + failMatches.length,
    success: failMatches.length === 0 && passMatches.length > 0,
    tests,
    output
  };
}

function parseCoverage(output) {
  const match = output.match(/All files[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
  if (match) {
    return { statements: parseFloat(match[1]), branches: parseFloat(match[2]), functions: parseFloat(match[3]), lines: parseFloat(match[4]) };
  }
  return { statements: 0, branches: 0, functions: 0, lines: 0 };
}

async function runImplementationTests() {
  console.log('\n📋 Running Tests (repository_after tests on repository_before)...\n');
  const result = await runCommand('npx', ['vitest', 'run', 'repository_after/', '--reporter=verbose', '--coverage'], projectRoot);
  return { testResults: parseTestResults(result.output), coverage: parseCoverage(result.output), output: result.output };
}

async function runMetaTests() {
  console.log('\n📋 Running Meta-Tests (testing the tests)...\n');
  const result = await runCommand('npx', ['vitest', 'run', 'tests/', '--reporter=verbose'], projectRoot);
  return { testResults: parseTestResults(result.output), output: result.output };
}

async function cleanupCoverage() {
  const coverageDir = path.join(projectRoot, 'node_modules', '.coverage-temp');
  try {
    await fs.rm(coverageDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }
}

async function generateReport() {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

  console.log('🔍 Starting BillSplitter Evaluation...\n');
  console.log('═'.repeat(70));

  const implResults = await runImplementationTests();
  console.log(`\n   Implementation Tests: ${implResults.testResults.passed} passed, ${implResults.testResults.failed} failed`);
  console.log(`   Coverage: ${implResults.coverage.statements}% statements, ${implResults.coverage.branches}% branches\n`);

  console.log('═'.repeat(70));

  const metaResults = await runMetaTests();
  console.log(`\n   Meta-Tests: ${metaResults.testResults.passed} passed, ${metaResults.testResults.failed} failed\n`);

  // Cleanup temp coverage
  await cleanupCoverage();

  const report = {
    evaluation_metadata: {
      evaluation_id: `billsplitter-${Date.now()}`,
      timestamp,
      evaluator: 'automated_test_suite',
      project: 'restaurant_bill_splitter',
      version: '1.0.0'
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    coverage_report: {
      statements_percent: implResults.coverage.statements,
      branches_percent: implResults.coverage.branches,
      functions_percent: implResults.coverage.functions,
      lines_percent: implResults.coverage.lines,
      is_100_percent: implResults.coverage.statements === 100 && implResults.coverage.branches === 100,
      output: `Statements: ${implResults.coverage.statements}%, Branches: ${implResults.coverage.branches}%`
    },
    before: {
      description: "Tests from repository_after running against repository_before/BillSplitter.js",
      metrics: {
        total_files: 1,
        coverage_statements: implResults.coverage.statements,
        coverage_branches: implResults.coverage.branches
      },
      tests: {
        passed: implResults.testResults.passed,
        failed: implResults.testResults.failed,
        total: implResults.testResults.total,
        success: implResults.testResults.success,
        tests: implResults.testResults.tests,
        output: implResults.testResults.output
      }
    },
    after: {
      description: "Meta-tests verifying the quality of tests in repository_after",
      tests: {
        passed: metaResults.testResults.passed,
        failed: metaResults.testResults.failed,
        total: metaResults.testResults.total,
        success: metaResults.testResults.success,
        tests: metaResults.testResults.tests,
        output: metaResults.testResults.output
      }
    },
    requirements_checklist: {
      req1_penny_perfect_reconciliation: implResults.testResults.success,
      req2_remainder_allocation: implResults.testResults.success,
      req3_percentage_boundary: implResults.testResults.success,
      req4_invalid_input_resilience: implResults.testResults.success,
      req5_floating_point_prevention: implResults.testResults.success,
      req6_happy_path: implResults.testResults.success,
      req7_lead_payer_logic: implResults.testResults.success,
      req8_code_coverage: implResults.coverage.statements === 100 && implResults.coverage.branches === 100
    },
    final_verdict: {
      success: implResults.testResults.success && metaResults.testResults.success,
      implementation_tests_passed: implResults.testResults.passed,
      implementation_tests_failed: implResults.testResults.failed,
      meta_tests_passed: metaResults.testResults.passed,
      meta_tests_failed: metaResults.testResults.failed,
      coverage_met: implResults.coverage.statements === 100 && implResults.coverage.branches === 100,
      success_rate: `${((implResults.testResults.passed / Math.max(implResults.testResults.total, 1)) * 100).toFixed(1)}%`,
      requirements_met: Object.values({
        r1: implResults.testResults.success, 
        r2: implResults.testResults.success, 
        r3: implResults.testResults.success,
        r4: implResults.testResults.success, 
        r5: implResults.testResults.success, 
        r6: implResults.testResults.success,
        r7: implResults.testResults.success, 
        r8: implResults.coverage.statements === 100
      }).filter(Boolean).length,
      total_requirements: 8
    }
  };

  const reportsDir = path.join(__dirname, 'reports', date, time);
  await fs.mkdir(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '═'.repeat(70));
  console.log('📊 EVALUATION REPORT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`   BEFORE (Implementation Tests): ${implResults.testResults.passed} passed, ${implResults.testResults.failed} failed`);
  console.log(`   AFTER (Meta-Tests): ${metaResults.testResults.passed} passed, ${metaResults.testResults.failed} failed`);
  console.log(`   Coverage: ${implResults.coverage.statements}% statements, ${implResults.coverage.branches}% branches`);
  console.log(`   Requirements Met: ${report.final_verdict.requirements_met}/8`);
  console.log('═'.repeat(70));
  console.log(`\n✅ Report saved to: ${reportPath}`);

  if (report.final_verdict.success) {
    console.log('\n🎉 EVALUATION PASSED: All tests pass');
  } else {
    console.log('\n❌ EVALUATION FAILED: Check report for details');
  }

  return report;
}

generateReport().catch(console.error);