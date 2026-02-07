#!/usr/bin/env node

/**
 * Evaluation script for Investment Portfolio Analytics Dashboard implementation
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment information collection
function getEnvironmentInfo() {
  const envInfo = {
    node_version: process.version,
    platform: process.platform,
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname()
  };

  try {
    envInfo.git_commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    envInfo.git_commit = 'unknown';
  }

  try {
    envInfo.git_branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    envInfo.git_branch = 'unknown';
  }

  return envInfo;
}

// Test execution function
function runTests() {
  return new Promise((resolve) => {
    const testProcess = spawn('node', ['test_after.js'], {
      cwd: join(__dirname, '../tests'),
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      // Parse test results from stdout
      const tests = [];
      const lines = stdout.split('\n');
      
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;

      lines.forEach(line => {
        if (line.startsWith('✓')) {
          const testName = line.substring(2).trim();
          tests.push({
            nodeid: `test_${tests.length + 1}`,
            name: testName,
            outcome: 'passed'
          });
          passedTests++;
          totalTests++;
        } else if (line.startsWith('✗')) {
          const testName = line.substring(2).split(':')[0].trim();
          tests.push({
            nodeid: `test_${tests.length + 1}`,
            name: testName,
            outcome: 'failed'
          });
          failedTests++;
          totalTests++;
        }
      });

      // Extract summary from output
      const summaryMatch = stdout.match(/Total tests: (\d+)/);
      const passedMatch = stdout.match(/Passed: (\d+)/);
      const failedMatch = stdout.match(/Failed: (\d+)/);

      if (summaryMatch && passedMatch && failedMatch) {
        totalTests = parseInt(summaryMatch[1]);
        passedTests = parseInt(passedMatch[1]);
        failedTests = parseInt(failedMatch[1]);
      }

      const summary = {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        errors: 0,
        skipped: 0,
        xfailed: 0
      };

      resolve({
        success: code === 0,
        exit_code: code,
        tests,
        summary,
        stdout,
        stderr
      });
    });
  });
}

// Meta-testing validation
function validateMetaTesting() {
  return {
    requirement_traceability: {
      "browser_only_implementation": "test_17",
      "fifo_lot_tracking": "test_3_4_5",
      "six_ui_sections": "test_13_14",
      "no_hardcoded_values": "test_15",
      "performance_optimization": "test_16_22",
      "responsive_design": "test_18",
      "real_computed_data": "test_24"
    },
    adversarial_testing: {
      "performance_stress_test": "test_16",
      "data_variation_test": "test_24", 
      "meta_test_validation": "test_25",
      "error_handling_validation": "test_21"
    },
    edge_case_coverage: {
      "partial_lot_sales": "test_4",
      "stock_split_handling": "test_5",
      "empty_portfolio": "test_21",
      "large_datasets": "test_22"
    }
  };
}

// Main evaluation function
async function main() {
  console.log('🔍 Investment Portfolio Analytics Dashboard - Evaluation');
  console.log('=' .repeat(60));

  const timestamp = new Date().toISOString();
  const evaluationId = crypto.randomBytes(8).toString('hex');

  // Collect environment information
  console.log('📋 Collecting environment information...');
  const environmentInfo = getEnvironmentInfo();

  // Run tests
  console.log('🧪 Running test suite...');
  const testResults = await runTests();

  // Meta-testing validation
  const metaTesting = validateMetaTesting();

  // Create comprehensive report
  const report = {
    evaluation_metadata: {
      evaluation_id: evaluationId,
      timestamp: timestamp,
      evaluator: 'automated_test_suite',
      project: 'investment_portfolio_analytics_dashboard',
      version: '1.0.0'
    },
    environment: environmentInfo,
    test_execution: testResults,
    meta_testing: metaTesting,
    compliance_check: {
      browser_only: testResults.tests.find(t => t.name.includes('No external API calls or server dependencies'))?.outcome === 'passed',
      fifo_logic: testResults.tests.find(t => t.name.includes('FIFO Lot Tracker correctly handles basic operations'))?.outcome === 'passed',
      no_hardcoded_values: testResults.tests.find(t => t.name.includes('Components use computed data, not hardcoded values'))?.outcome === 'passed',
      performance_optimized: testResults.tests.find(t => t.name.includes('Transaction processing scales linearly'))?.outcome === 'passed',
      six_ui_sections: testResults.tests.find(t => t.name.includes('React components have proper JSX structure'))?.outcome === 'passed'
    },
    final_verdict: {
      success: testResults.success,
      total_tests: testResults.summary.total,
      passed_tests: testResults.summary.passed,
      failed_tests: testResults.summary.failed,
      success_rate: testResults.summary.total > 0 ? 
        ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1) : 0,
      meets_requirements: testResults.success && testResults.summary.passed >= 20
    }
  };

  // Create timestamped directory structure
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const reportsDir = join(__dirname, 'reports', dateStr, timeStr);
  
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  // Write report
  const reportPath = join(reportsDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Display results
  console.log('\n📊 Evaluation Results:');
  console.log(`Total Tests: ${report.final_verdict.total_tests}`);
  console.log(`Passed: ${report.final_verdict.passed_tests}`);
  console.log(`Failed: ${report.final_verdict.failed_tests}`);
  console.log(`Success Rate: ${report.final_verdict.success_rate}%`);
  console.log(`Meets Requirements: ${report.final_verdict.meets_requirements ? '✅ YES' : '❌ NO'}`);
  console.log(`\n📁 Report saved to: ${reportPath}`);

  if (!report.final_verdict.success) {
    console.log('\n❌ Evaluation failed - check test output above');
    process.exit(1);
  } else {
    console.log('\n✅ Evaluation completed successfully');
  }
}

// Run evaluation
main().catch(error => {
  console.error('💥 Evaluation failed:', error);
  process.exit(1);
});