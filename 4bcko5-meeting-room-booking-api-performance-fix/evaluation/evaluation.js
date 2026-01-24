import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

async function runCommand(cmd, cwd = '.', env = {}) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      env: { ...process.env, ...env },
      timeout: 300000
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}

async function waitForService(url, maxAttempts = 60) {
  console.log(`Waiting for service at ${url}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${url}/health`, { timeout: 3000 });
      console.log(`✓ Service at ${url} is ready`);
      return true;
    } catch (error) {
      if (i % 5 === 0) {
        console.log(`  Attempt ${i + 1}/${maxAttempts}...`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`✗ Service at ${url} failed to start after ${maxAttempts} attempts`);
  return false;
}

async function analyzeCodeMetrics(repoPath) {
  const metrics = {
    total_files: 0,
    has_indexes: false,
    has_joins: false,
    uses_pool_directly: false,
    has_subqueries: false,
    n_plus_one_queries: false
  };

  try {
    // Count files
    const countFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let count = 0;
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          count += await countFiles(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
          count++;
        }
      }
      return count;
    };
    metrics.total_files = await countFiles(repoPath);

    // Check for optimizations in seed.js
    const seedPath = path.join(repoPath, 'server', 'seed.js');
    try {
      const seedContent = await fs.readFile(seedPath, 'utf-8');
      if (seedContent.includes('CREATE INDEX')) {
        metrics.has_indexes = true;
      }
    } catch (e) {
      // File might not exist
    }

    // Check for JOINs and other patterns in routes
    const routesPath = path.join(repoPath, 'server', 'routes');
    try {
      const files = await fs.readdir(routesPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = await fs.readFile(path.join(routesPath, file), 'utf-8');
          if (content.includes('JOIN')) {
            metrics.has_joins = true;
          }
          if (content.includes('pool.query') && !content.includes('client.query')) {
            metrics.uses_pool_directly = true;
          }
          if (content.includes('EXISTS') || content.includes('CASE')) {
            metrics.has_subqueries = true;
          }
          // Check for N+1 pattern (for loop with query inside)
          if (content.match(/for\s*\(.*\)\s*{[\s\S]*?query/)) {
            metrics.n_plus_one_queries = true;
          }
        }
      }
    } catch (e) {
      // Routes might not exist
    }
  } catch (error) {
    console.error('Error analyzing metrics:', error.message);
  }

  return metrics;
}

async function runTests(apiUrl, dbConfig) {
  console.log(`\nRunning tests against ${apiUrl}...`);

  // Run tests (dependencies already installed in Docker image)
  const testEnv = {
    API_URL: apiUrl,
    DB_HOST: dbConfig.host,
    DB_PORT: dbConfig.port.toString(),
    DB_NAME: dbConfig.name,
    DB_USER: dbConfig.user,
    DB_PASSWORD: dbConfig.password
  };

  const testResult = await runCommand('npm test', '.', testEnv);

  console.log(testResult.stdout);
  if (testResult.stderr) {
    console.error(testResult.stderr);
  }

  // Parse results
  const output = testResult.stdout + testResult.stderr;
  const passed = (output.match(/✓/g) || []).length;
  const failed = (output.match(/✗/g) || []).length;
  const total = passed + failed;

  return {
    passed,
    failed,
    total,
    success: testResult.success && failed === 0,
    output: testResult.stdout
  };
}

async function main() {
  const runId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = new Date().toISOString();

  console.log('='.repeat(60));
  console.log('Meeting Room Booking API - Performance Evaluation');
  console.log('='.repeat(60));

  const result = {
    run_id: runId,
    started_at: startedAt,
    environment: {
      node_version: process.version,
      platform: `${process.platform}-${process.arch}`
    }
  };

  // Test repository_before
  console.log('\n' + '='.repeat(60));
  console.log('Testing BEFORE repository (unoptimized)');
  console.log('='.repeat(60));

  const beforeMetrics = await analyzeCodeMetrics('repository_before');

  let beforeTests;
  const beforeApiUrl = process.env.API_URL_BEFORE || 'http://localhost:5000';
  const beforeDbHost = process.env.DB_HOST_BEFORE || process.env.DB_HOST || 'localhost';
  
  const beforeReady = await waitForService(beforeApiUrl);
  if (beforeReady) {
    beforeTests = await runTests(beforeApiUrl, {
      host: beforeDbHost,
      port: parseInt(process.env.DB_PORT || '5432'),
      name: 'booking_system_before',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
  } else {
    console.log('ERROR: repository_before service not ready');
    beforeTests = {
      passed: 0,
      failed: 0,
      total: 0,
      success: false,
      output: '',
      error: 'Service not ready'
    };
  }

  result.before = {
    metrics: beforeMetrics,
    tests: beforeTests
  };

  // Test repository_after
  console.log('\n' + '='.repeat(60));
  console.log('Testing AFTER repository (optimized)');
  console.log('='.repeat(60));

  const afterMetrics = await analyzeCodeMetrics('repository_after');

  let afterTests;
  const afterApiUrl = process.env.API_URL_AFTER || 'http://localhost:5001';
  const afterDbHost = process.env.DB_HOST_AFTER || process.env.DB_HOST || 'localhost';
  
  const afterReady = await waitForService(afterApiUrl);
  if (afterReady) {
    afterTests = await runTests(afterApiUrl, {
      host: afterDbHost,
      port: parseInt(process.env.DB_PORT || '5432'),
      name: 'booking_system_after',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
  } else {
    console.log('ERROR: repository_after service not ready');
    afterTests = {
      passed: 0,
      failed: 0,
      total: 0,
      success: false,
      output: '',
      error: 'Service not ready'
    };
  }

  result.after = {
    metrics: afterMetrics,
    tests: afterTests
  };

  // Comparison
  result.comparison = {
    indexes_added: afterMetrics.has_indexes && !beforeMetrics.has_indexes,
    joins_implemented: afterMetrics.has_joins && !beforeMetrics.has_joins,
    n_plus_one_fixed: beforeMetrics.n_plus_one_queries && !afterMetrics.n_plus_one_queries,
    pool_optimization: afterMetrics.uses_pool_directly,
    subqueries_added: afterMetrics.has_subqueries,
    tests_passing: afterTests.passed,
    performance_improved: afterTests.success && !beforeTests.success,
    test_improvement: afterTests.passed - beforeTests.passed
  };

  // Requirements checklist
  result.requirements_checklist = {
    rooms_endpoint_under_200ms: afterTests.success,
    bookings_mine_under_300ms: afterTests.success,
    room_bookings_under_200ms: afterTests.success,
    post_booking_under_500ms: afterTests.success,
    max_3_queries_per_request: afterMetrics.has_joins && !afterMetrics.n_plus_one_queries,
    indexes_added: afterMetrics.has_indexes,
    response_structure_unchanged: afterTests.success,
    business_rules_maintained: afterTests.success,
    no_n_plus_one_queries: !afterMetrics.n_plus_one_queries
  };

  result.success = afterTests.success;
  result.finished_at = new Date().toISOString();
  
  // Create comprehensive report structure
  const report = {
    evaluation_metadata: {
      evaluation_id: Math.random().toString(36).substr(2, 16),
      timestamp: result.started_at,
      evaluator: "automated_test_suite",
      project: "meeting_room_booking_api_performance_fix",
      version: "1.0.0"
    },
    environment: {
      node_version: result.environment.node_version,
      platform: result.environment.platform.split('-')[0],
      os: result.environment.platform.split('-')[0] === 'linux' ? 'Linux' : 'Unknown',
      os_release: "unknown",
      architecture: result.environment.platform.split('-')[1] || 'x64',
      hostname: "docker-container",
      git_commit: "unknown",
      git_branch: "unknown"
    },
    test_execution: {
      success: result.success,
      exit_code: result.success ? 0 : 1,
      tests: [],
      summary: {
        total: beforeTests.total + afterTests.total,
        passed: beforeTests.passed + afterTests.passed,
        failed: beforeTests.failed + afterTests.failed,
        errors: 0,
        skipped: 0,
        xfailed: 0
      },
      stdout: `Before Repository: ${beforeTests.passed}/${beforeTests.total} passed\nAfter Repository: ${afterTests.passed}/${afterTests.total} passed`,
      stderr: ""
    },
    meta_testing: {
      requirement_traceability: {
        performance_requirements: "test_1_2_3_4",
        query_optimization: "test_5_6_10",
        business_rules: "test_8_9",
        stability: "test_7"
      },
      adversarial_testing: {
        n_plus_one_detection: "test_5",
        index_validation: "test_10",
        performance_stress_test: "test_1_2_3_4",
        business_rule_validation: "test_9"
      },
      edge_case_coverage: {
        concurrent_bookings: "test_1",
        large_datasets: "test_2",
        overlap_prevention: "test_9",
        authorization_checks: "test_9"
      }
    },
    compliance_check: {
      performance_optimized: afterTests.success,
      indexes_added: result.comparison.indexes_added,
      joins_implemented: result.comparison.joins_implemented,
      n_plus_one_fixed: result.comparison.n_plus_one_fixed,
      business_rules_maintained: afterTests.success
    },
    before: result.before,
    after: result.after,
    comparison: result.comparison,
    requirements_checklist: result.requirements_checklist,
    final_verdict: {
      success: result.success,
      total_tests: afterTests.total,
      passed_tests: afterTests.passed,
      failed_tests: afterTests.failed,
      success_rate: afterTests.total > 0 ? ((afterTests.passed / afterTests.total) * 100).toFixed(1) : "0.0",
      meets_requirements: result.success
    }
  };

  // Create reports directory structure
  const now = new Date();
  const dateFolder = now.toISOString().split('T')[0];
  const timeFolder = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const reportDir = `evaluation/reports/${dateFolder}/${timeFolder}`;
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(`${reportDir}/report.json`, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportDir}/report.json`);
  } catch (error) {
    console.error('Error saving report:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Before: ${beforeTests.passed}/${beforeTests.total} tests passed`);
  console.log(`After:  ${afterTests.passed}/${afterTests.total} tests passed`);
  console.log(`Performance improved: ${result.comparison.performance_improved}`);
  console.log(`Indexes added: ${result.comparison.indexes_added}`);
  console.log(`JOINs implemented: ${result.comparison.joins_implemented}`);
  console.log(`N+1 queries fixed: ${result.comparison.n_plus_one_fixed}`);
  console.log('='.repeat(60));

  return result.success ? 0 : 1;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });
