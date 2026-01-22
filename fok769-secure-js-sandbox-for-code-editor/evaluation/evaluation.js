/**
 * Evaluation system for secure JS sandbox task.
 * 
 * Runs tests against both repository_before and repository_after,
 * then generates a comparison report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const testsDir = path.join(projectRoot, 'tests');
const evaluationDir = path.join(projectRoot, 'evaluation');
const reportsDir = path.join(evaluationDir, 'reports');

function ensureReportsDir() {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dateDir = path.join(reportsDir, dateStr);
  
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }
  
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
  const timestampDir = path.join(dateDir, timestamp);
  
  if (!fs.existsSync(timestampDir)) {
    fs.mkdirSync(timestampDir, { recursive: true });
  }
  
  return timestampDir;
}

function runTests(repoType, timeout = 300000) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running tests against repository_${repoType}`);
  console.log('='.repeat(60) + '\n');
  
  const env = { ...process.env, TEST_REPO: repoType };
  const cmd = `npm test`;
  
  try {
    const startTime = Date.now();
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      encoding: 'utf8',
      timeout,
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      returncode: 0,
      stdout: result,
      stderr: '',
      tests_passed: true,
      duration
    };
  } catch (error) {
    return {
      success: false,
      returncode: error.status || -1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      tests_passed: false,
      timeout: error.signal === 'SIGTERM'
    };
  }
}

function analyzeTestResults(result, repoType) {
  const analysis = {
    tests_passed: result.tests_passed,
    security_violations: false,
    console_integrity: false,
    ui_freeze_protection: false
  };
  
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = (stdout + stderr).toLowerCase();
  
  // Check for security violations
  if (repoType === 'before') {
    // Before should fail security tests
    analysis.security_violations = !result.tests_passed;
  } else {
    // After should pass security tests
    const securityKeywords = ['localstorage', 'window', 'parent', 'blocked', 'denied'];
    analysis.security_violations = securityKeywords.some(
      keyword => combined.includes(keyword) && combined.includes('error')
    ) && !result.tests_passed;
  }
  
  // Check console integrity
  if (combined.includes('console')) {
    if (repoType === 'after') {
      analysis.console_integrity = result.tests_passed;
    } else {
      analysis.console_integrity = false;
    }
  }
  
  // Check UI freeze protection
  if (combined.includes('timeout') || combined.includes('infinite')) {
    if (repoType === 'after') {
      analysis.ui_freeze_protection = combined.includes('timeout');
    } else {
      analysis.ui_freeze_protection = false;
    }
  }
  
  return analysis;
}

function generateReport(beforeResult, afterResult, beforeAnalysis, afterAnalysis) {
  const report = {
    timestamp: new Date().toISOString(),
    before: {
      tests_passed: beforeResult.tests_passed,
      security_violations: beforeAnalysis.security_violations,
      console_integrity: beforeAnalysis.console_integrity,
      ui_freeze_protection: beforeAnalysis.ui_freeze_protection,
      returncode: beforeResult.returncode || -1
    },
    after: {
      tests_passed: afterResult.tests_passed,
      security_verified: !afterAnalysis.security_violations && afterResult.tests_passed,
      console_integrity: afterAnalysis.console_integrity,
      ui_freeze_protection: afterAnalysis.ui_freeze_protection,
      returncode: afterResult.returncode || -1
    },
    comparison: {
      fail_to_pass: []
    }
  };
  
  // Determine what changed from fail to pass
  if (!beforeResult.tests_passed && afterResult.tests_passed) {
    report.comparison.fail_to_pass.push('all_tests');
  }
  
  if (beforeAnalysis.security_violations && !afterAnalysis.security_violations) {
    report.comparison.fail_to_pass.push('global_access_blocked');
  }
  
  if (!beforeAnalysis.console_integrity && afterAnalysis.console_integrity) {
    report.comparison.fail_to_pass.push('console_restored');
  }
  
  if (!beforeAnalysis.ui_freeze_protection && afterAnalysis.ui_freeze_protection) {
    report.comparison.fail_to_pass.push('infinite_loop_handled');
  }
  
  return report;
}

function main() {
  console.log('Starting evaluation...');
  console.log(`Project root: ${projectRoot}`);
  
  // Ensure reports directory
  const timestampDir = ensureReportsDir();
  
  // Run tests against before
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: Testing repository_before');
  console.log('='.repeat(60));
  const beforeResult = runTests('before');
  const beforeAnalysis = analyzeTestResults(beforeResult, 'before');
  
  // Run tests against after
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Testing repository_after');
  console.log('='.repeat(60));
  const afterResult = runTests('after');
  const afterAnalysis = analyzeTestResults(afterResult, 'after');
  
  // Generate report
  const report = generateReport(beforeResult, afterResult, beforeAnalysis, afterAnalysis);
  
  // Save reports
  const latestPath = path.join(reportsDir, 'latest.json');
  const reportPath = path.join(reportsDir, 'report.json');
  const timestampReportPath = path.join(timestampDir, 'report.json');
  
  [latestPath, reportPath, timestampReportPath].forEach(filePath => {
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  });
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log('\nBefore (repository_before):');
  console.log(`  Tests Passed: ${report.before.tests_passed}`);
  console.log(`  Security Violations: ${report.before.security_violations}`);
  
  console.log('\nAfter (repository_after):');
  console.log(`  Tests Passed: ${report.after.tests_passed}`);
  console.log(`  Security Verified: ${report.after.security_verified}`);
  console.log(`  Console Integrity: ${report.after.console_integrity}`);
  console.log(`  UI Freeze Protection: ${report.after.ui_freeze_protection}`);
  
  console.log('\nImprovements:');
  if (report.comparison.fail_to_pass.length > 0) {
    report.comparison.fail_to_pass.forEach(improvement => {
      console.log(`  ✓ ${improvement}`);
    });
  } else {
    console.log('  (No improvements detected)');
  }
  
  console.log('\nReports saved to:');
  console.log(`  - ${latestPath}`);
  console.log(`  - ${reportPath}`);
  console.log(`  - ${timestampReportPath}`);
  
  // Return appropriate exit code
  if (report.after.tests_passed && report.after.security_verified) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, runTests, analyzeTestResults, generateReport };
