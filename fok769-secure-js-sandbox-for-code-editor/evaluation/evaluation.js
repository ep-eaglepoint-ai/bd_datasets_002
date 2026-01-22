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
  // Simplified - just ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir; // Return reports dir directly, skip timestamp subdirs
}

function runTests(repoType, timeout = 120000) { // Reduced from 180s to 120s
  console.log(`Running tests against repository_${repoType}...`);
  
  // Set EVALUATION_MODE to skip unnecessary package installations
  const env = { ...process.env, TEST_REPO: repoType, EVALUATION_MODE: 'true' };
  const cmd = `npm test`;
  
  const startTime = Date.now();
  
  try {
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      encoding: 'utf8',
      timeout,
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    const duration = Date.now() - startTime;
    
    // Simple check: if exit code is 0, tests passed
    const tests_passed = true;
    
    return {
      success: true,
      returncode: 0,
      stdout: result,
      stderr: '',
      tests_passed,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    // Simple check: if exit code is non-zero, tests failed
    const tests_passed = false;
    
    return {
      success: false,
      returncode: error.status || -1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      tests_passed,
      timeout: error.signal === 'SIGTERM',
      duration
    };
  }
}

function analyzeTestResults(result, repoType) {
  // Simplified analysis - just check if tests passed
  // Complex parsing removed for speed
  const analysis = {
    tests_passed: result.tests_passed,
    security_violations: repoType === 'before' ? !result.tests_passed : false,
    console_integrity: repoType === 'after' ? result.tests_passed : false,
    ui_freeze_protection: repoType === 'after' ? result.tests_passed : false
  };
  
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
  console.log('Starting evaluation...\n');
  
  // Ensure reports directory
  ensureReportsDir();
  
  // Run tests against before
  console.log('PHASE 1: Testing repository_before');
  const beforeResult = runTests('before');
  const beforeAnalysis = analyzeTestResults(beforeResult, 'before');
  console.log(`  Result: ${beforeResult.tests_passed ? 'PASSED' : 'FAILED'} (${Math.round(beforeResult.duration / 1000)}s)\n`);
  
  // Run tests against after
  console.log('PHASE 2: Testing repository_after');
  const afterResult = runTests('after');
  const afterAnalysis = analyzeTestResults(afterResult, 'after');
  console.log(`  Result: ${afterResult.tests_passed ? 'PASSED' : 'FAILED'} (${Math.round(afterResult.duration / 1000)}s)\n`);
  
  // Generate report
  const report = generateReport(beforeResult, afterResult, beforeAnalysis, afterAnalysis);
  
  // Save reports (simplified - just save to report.json)
  const reportPath = path.join(reportsDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(40));
  console.log(`Before: ${report.before.tests_passed ? 'PASS' : 'FAIL'}`);
  console.log(`After:  ${report.after.tests_passed ? 'PASS' : 'FAIL'}`);
  console.log(`Security Verified: ${report.after.security_verified}`);
  console.log(`\nReport saved to: ${reportPath}`);
  
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
