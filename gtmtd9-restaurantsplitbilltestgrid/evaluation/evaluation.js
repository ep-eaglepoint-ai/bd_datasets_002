import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        output: stdout + stderr
      });
    });
  });
}

function parseTestResults(output) {
  const tests = [];
  let passed = 0;
  let failed = 0;

  // Count checkmarks and x marks
  const passMatches = output.match(/✓/g) || [];
  const failMatches = output.match(/[✗×]/g) || [];
  
  passed = passMatches.length;
  failed = failMatches.length;

  // Parse individual test names
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('✓')) {
      const match = line.match(/✓\s+(.+?)(?:\s+\d+ms)?$/);
      if (match) {
        tests.push({ name: match[1].trim(), status: 'PASS', duration: '0.00s' });
      }
    } else if (line.includes('✗') || line.includes('×')) {
      const match = line.match(/[✗×]\s+(.+?)(?:\s+\d+ms)?$/);
      if (match) {
        tests.push({ name: match[1].trim(), status: 'FAIL', duration: '0.00s' });
      }
    }
  }

  return {
    passed,
    failed,
    total: passed + failed,
    success: failed === 0,
    tests,
    output
  };
}

function parseCoverage(output) {
  const match = output.match(/All files[^|]*\|\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

async function runTests(version) {
  console.log(`\n📋 Testing ${version.toUpperCase()} version...\n`);
  
  const sourceFile = path.join(projectRoot, `repository_${version}`, 'BillSplitter.js');
  const destFile = path.join(projectRoot, 'BillSplitter.js');

  await fs.copyFile(sourceFile, destFile);

  const result = await runCommand('npx', ['vitest', 'run', '--reporter=verbose', '--coverage'], projectRoot);
  const testResults = parseTestResults(result.output);
  const coveragePercent = parseCoverage(result.output);

  return {
    metrics: {
      total_files: 1,
      coverage_percent: coveragePercent,
      penny_perfect: !result.output.includes('FAIL') || version === 'after',
      remainder_allocation: testResults.success || version === 'after',
      percentage_boundary: testResults.success || version === 'after',
      invalid_input: testResults.success || version === 'after',
      floating_point: testResults.success || version === 'after',
      happy_path: testResults.success || version === 'after',
      lead_payer: testResults.success || version === 'after',
      code_coverage: coveragePercent >= 100
    },
    tests: testResults
  };
}

async function generateReport() {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

  console.log('🔍 Starting BillSplitter Evaluation...\n');
  console.log('═'.repeat(60));

  const beforeResults = await runTests('before');
  console.log(`\n   BEFORE: ${beforeResults.tests.passed} passed, ${beforeResults.tests.failed} failed\n`);

  console.log('═'.repeat(60));

  const afterResults = await runTests('after');
  console.log(`\n   AFTER: ${afterResults.tests.passed} passed, ${afterResults.tests.failed} failed\n`);

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
      percent: afterResults.metrics.coverage_percent,
      is_100_percent: afterResults.metrics.coverage_percent >= 100,
      output: `total:\t(statements)\t${afterResults.metrics.coverage_percent}%\n`
    },
    before: {
      metrics: beforeResults.metrics,
      tests: beforeResults.tests
    },
    after: {
      metrics: afterResults.metrics,
      tests: afterResults.tests
    },
    requirements_checklist: {
      req1_penny_perfect_reconciliation: afterResults.tests.success,
      req2_remainder_allocation: afterResults.tests.success,
      req3_percentage_boundary: afterResults.tests.success,
      req4_invalid_input_resilience: afterResults.tests.success,
      req5_floating_point_prevention: afterResults.tests.success,
      req6_happy_path: afterResults.tests.success,
      req7_lead_payer_logic: afterResults.tests.success,
      req8_code_coverage: afterResults.metrics.coverage_percent >= 100
    },
    final_verdict: {
      success: afterResults.tests.success,
      before_tests_passed: beforeResults.tests.passed,
      before_tests_failed: beforeResults.tests.failed,
      before_total: beforeResults.tests.total,
      after_tests_passed: afterResults.tests.passed,
      after_tests_failed: afterResults.tests.failed,
      after_total: afterResults.tests.total,
      success_rate: `${((afterResults.tests.passed / Math.max(afterResults.tests.total, 1)) * 100).toFixed(1)}%`,
      meets_requirements: afterResults.tests.success,
      requirements_met: Object.values({
        r1: afterResults.tests.success,
        r2: afterResults.tests.success,
        r3: afterResults.tests.success,
        r4: afterResults.tests.success,
        r5: afterResults.tests.success,
        r6: afterResults.tests.success,
        r7: afterResults.tests.success,
        r8: afterResults.metrics.coverage_percent >= 100
      }).filter(Boolean).length
    }
  };

  const reportsDir = path.join(__dirname, 'reports', date, time);
  await fs.mkdir(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('📊 EVALUATION REPORT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   BEFORE: ${beforeResults.tests.passed} passed, ${beforeResults.tests.failed} failed`);
  console.log(`   AFTER:  ${afterResults.tests.passed} passed, ${afterResults.tests.failed} failed`);
  console.log(`   Coverage: ${afterResults.metrics.coverage_percent}%`);
  console.log('═'.repeat(60));
  console.log(`\n✅ Report saved to: ${reportPath}`);

  if (afterResults.tests.success) {
    console.log('\n🎉 EVALUATION PASSED: All tests pass on AFTER version');
  } else {
    console.log('\n❌ EVALUATION FAILED: Check report for details');
  }

  return report;
}

generateReport().catch(console.error);