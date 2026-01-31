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

  // Also check for "passed" and "failed" summary
  const summaryMatch = output.match(/(\d+)\s+passed|(\d+)\s+failed/g);
  let passed = passMatches.length;
  let failed = failMatches.length;
  
  if (summaryMatch) {
    summaryMatch.forEach(m => {
      const passedMatch = m.match(/(\d+)\s+passed/);
      const failedMatch = m.match(/(\d+)\s+failed/);
      if (passedMatch) passed = Math.max(passed, parseInt(passedMatch[1]));
      if (failedMatch) failed = Math.max(failed, parseInt(failedMatch[1]));
    });
  }

  return {
    passed,
    failed,
    total: passed + failed,
    success: failed === 0 && passed > 0,
    tests,
    output
  };
}

function parseCoverage(output) {
  // Match coverage table - look for "All files" row
  const match = output.match(/All files[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
  if (match) {
    return { 
      statements: parseFloat(match[1]), 
      branches: parseFloat(match[2]), 
      functions: parseFloat(match[3]), 
      lines: parseFloat(match[4]) 
    };
  }
  
  // Try alternative format
  const stmtMatch = output.match(/Statements\s*:\s*([\d.]+)%/);
  const branchMatch = output.match(/Branches\s*:\s*([\d.]+)%/);
  const funcMatch = output.match(/Functions\s*:\s*([\d.]+)%/);
  const lineMatch = output.match(/Lines\s*:\s*([\d.]+)%/);
  
  return { 
    statements: stmtMatch ? parseFloat(stmtMatch[1]) : 0, 
    branches: branchMatch ? parseFloat(branchMatch[1]) : 0, 
    functions: funcMatch ? parseFloat(funcMatch[1]) : 0, 
    lines: lineMatch ? parseFloat(lineMatch[1]) : 0 
  };
}

async function runImplementationTests() {
  console.log('\n📋 Running Tests (repository_after tests on repository_before)...\n');
  const result = await runCommand('npx', ['vitest', 'run', 'repository_after/', '--reporter=verbose', '--coverage'], projectRoot);
  return { 
    testResults: parseTestResults(result.output), 
    coverage: parseCoverage(result.output), 
    output: result.output,
    exitCode: result.exitCode
  };
}

async function runMetaTests() {
  console.log('\n📋 Running Meta-Tests (testing the tests with actual execution)...\n');
  const result = await runCommand('npx', ['vitest', 'run', 'tests/', '--reporter=verbose'], projectRoot);
  return { 
    testResults: parseTestResults(result.output), 
    output: result.output,
    exitCode: result.exitCode
  };
}

async function cleanupCoverage() {
  const coverageDir = path.join(projectRoot, 'node_modules', '.coverage-temp');
  try {
    await fs.rm(coverageDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }
}

function checkRequirements(implResults, metaResults) {
  const cov = implResults.coverage;
  const hasFullCoverage = cov.statements === 100 && cov.branches === 100;
  const implPassed = implResults.testResults.success;
  const metaPassed = metaResults.testResults.success;
  
  return {
    req1_penny_perfect_reconciliation: implPassed && metaPassed,
    req2_remainder_allocation: implPassed && metaPassed,
    req3_percentage_boundary: implPassed && metaPassed,
    req4_invalid_input_resilience: implPassed && metaPassed,
    req5_floating_point_prevention: implPassed && metaPassed,
    req6_happy_path: implPassed && metaPassed,
    req7_lead_payer_logic: implPassed && metaPassed,
    req8_code_coverage: hasFullCoverage
  };
}

async function generateReport() {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

  console.log('🔍 Starting BillSplitter Evaluation...\n');
  console.log('═'.repeat(70));

  const implResults = await runImplementationTests();
  console.log(`\n   Implementation Tests: ${implResults.testResults.passed} passed, ${implResults.testResults.failed} failed`);
  console.log(`   Coverage: ${implResults.coverage.statements}% statements, ${implResults.coverage.branches}% branches`);
  console.log(`   Coverage: ${implResults.coverage.functions}% functions, ${implResults.coverage.lines}% lines\n`);

  console.log('═'.repeat(70));

  const metaResults = await runMetaTests();
  console.log(`\n   Meta-Tests: ${metaResults.testResults.passed} passed, ${metaResults.testResults.failed} failed\n`);

  await cleanupCoverage();

  const requirements = checkRequirements(implResults, metaResults);
  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  const hasFullCoverage = implResults.coverage.statements === 100 && implResults.coverage.branches === 100;

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
      is_100_percent: hasFullCoverage,
      meets_requirement_8: hasFullCoverage,
      details: `Statements: ${implResults.coverage.statements}%, Branches: ${implResults.coverage.branches}%, Functions: ${implResults.coverage.functions}%, Lines: ${implResults.coverage.lines}%`
    },
    implementation_tests: {
      description: "Tests from repository_after running against repository_before/BillSplitter.js",
      passed: implResults.testResults.passed,
      failed: implResults.testResults.failed,
      total: implResults.testResults.total,
      success: implResults.testResults.success,
      exit_code: implResults.exitCode,
      tests: implResults.testResults.tests
    },
    meta_tests: {
      description: "Meta-tests that ACTUALLY RUN splitBill to verify test correctness",
      passed: metaResults.testResults.passed,
      failed: metaResults.testResults.failed,
      total: metaResults.testResults.total,
      success: metaResults.testResults.success,
      exit_code: metaResults.exitCode,
      tests: metaResults.testResults.tests
    },
    requirements_checklist: requirements,
    final_verdict: {
      success: implResults.testResults.success && metaResults.testResults.success && hasFullCoverage,
      implementation_tests_passed: implResults.testResults.passed,
      implementation_tests_failed: implResults.testResults.failed,
      meta_tests_passed: metaResults.testResults.passed,
      meta_tests_failed: metaResults.testResults.failed,
      coverage_statements: implResults.coverage.statements,
      coverage_branches: implResults.coverage.branches,
      coverage_met: hasFullCoverage,
      success_rate: `${((implResults.testResults.passed / Math.max(implResults.testResults.total, 1)) * 100).toFixed(1)}%`,
      requirements_met: requirementsMet,
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
  console.log(`   Implementation Tests: ${implResults.testResults.passed} passed, ${implResults.testResults.failed} failed`);
  console.log(`   Meta-Tests (with actual execution): ${metaResults.testResults.passed} passed, ${metaResults.testResults.failed} failed`);
  console.log(`   Coverage: Statements ${implResults.coverage.statements}% | Branches ${implResults.coverage.branches}%`);
  console.log(`   Coverage: Functions ${implResults.coverage.functions}% | Lines ${implResults.coverage.lines}%`);
  console.log(`   Requirements Met: ${requirementsMet}/8`);
  
  if (!hasFullCoverage) {
    console.log(`   ⚠️  Requirement 8 NOT MET: Need 100% statement/branch coverage`);
    console.log(`      Current: ${implResults.coverage.statements}% statements, ${implResults.coverage.branches}% branches`);
  }
  
  console.log('═'.repeat(70));
  console.log(`\n✅ Report saved to: ${reportPath}`);

  if (report.final_verdict.success) {
    console.log('\n🎉 EVALUATION PASSED: All tests pass with 100% coverage');
    console.log('   ✓ Implementation tests verify splitBill behavior');
    console.log('   ✓ Meta-tests ACTUALLY RUN splitBill to prove correctness');
    console.log('   ✓ 100% code coverage achieved');
  } else {
    console.log('\n❌ EVALUATION INCOMPLETE: Check report for details');
    if (!implResults.testResults.success) console.log('   - Implementation tests have failures');
    if (!metaResults.testResults.success) console.log('   - Meta tests have failures');
    if (!hasFullCoverage) console.log('   - Coverage requirement not met (need 100% statements and branches)');
  }

  return report;
}

generateReport().catch(console.error);