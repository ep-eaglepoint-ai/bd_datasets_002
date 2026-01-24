const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Generate unique evaluation ID
function generateEvaluationId() {
  return Math.random().toString(36).substring(2, 13);
}

// Create evaluation report structure
function createReportStructure() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const reportsDir = path.join(__dirname, 'reports', dateStr, timeStr);
  
  // Create directory structure
  fs.mkdirSync(reportsDir, { recursive: true });
  
  return {
    reportPath: path.join(reportsDir, 'report.json'),
    dateStr,
    timeStr
  };
}

// Run Jest tests and capture output
function runTests(testFile) {
  try {
    const command = `npx jest ${testFile} --json --verbose`;
    console.log(`Running: ${command}`);
    
    const result = execSync(command, { 
      cwd: path.join(__dirname, '..', 'tests'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const jsonResult = JSON.parse(result);
    
    return {
      passed: jsonResult.numPassedTests || 0,
      failed: jsonResult.numFailedTests || 0,
      total: jsonResult.numTotalTests || 0,
      success: jsonResult.success || false,
      testResults: jsonResult.testResults || [],
      output: result
    };
  } catch (error) {
    console.error(`Error running ${testFile}:`, error.message);
    
    // Try to parse JSON from stderr if available
    try {
      const jsonResult = JSON.parse(error.stdout || '{}');
      return {
        passed: jsonResult.numPassedTests || 0,
        failed: jsonResult.numFailedTests || 0,
        total: jsonResult.numTotalTests || 0,
        success: false,
        testResults: jsonResult.testResults || [],
        output: error.stdout || error.message
      };
    } catch (parseError) {
      return {
        passed: 0,
        failed: 0,
        total: 0,
        success: false,
        testResults: [],
        output: error.message
      };
    }
  }
}

// Analyze algorithm metrics for maze solver
function analyzeAlgorithmMetrics(testResults) {
  const metrics = {
    total_files: 2, // App.jsx in before and after
    bfs_algorithm_fixed: false,
    astar_algorithm_fixed: false,
    dfs_algorithm_working: false,
    maze_generation_optimized: false,
    path_validation_working: false,
    performance_improved: false,
    edge_cases_handled: false,
    unsolvable_maze_handling: false
  };

  // Check if testResults is an array of test suites or contains testResults property
  const testSuites = Array.isArray(testResults) ? testResults : (testResults.testResults || []);
  
  testSuites.forEach(testSuite => {
    // Handle both direct test results and nested structure
    const tests = testSuite.assertionResults || testSuite.testResults || [];
    
    tests.forEach(test => {
      const testName = (test.title || test.fullName || '').toLowerCase();
      const testStatus = test.status;
      
      if (testStatus === 'passed') {
        if (testName.includes('bfs')) {
          metrics.bfs_algorithm_fixed = true;
        }
        if (testName.includes('a*') || testName.includes('astar')) {
          metrics.astar_algorithm_fixed = true;
        }
        if (testName.includes('dfs')) {
          metrics.dfs_algorithm_working = true;
        }
        if (testName.includes('maze')) {
          metrics.maze_generation_optimized = true;
        }
        if (testName.includes('path') || testName.includes('valid')) {
          metrics.path_validation_working = true;
        }
        if (testName.includes('performance') || testName.includes('efficient')) {
          metrics.performance_improved = true;
        }
        if (testName.includes('edge') || testName.includes('single') || testName.includes('adjacent')) {
          metrics.edge_cases_handled = true;
        }
        if (testName.includes('unsolvable')) {
          metrics.unsolvable_maze_handling = true;
        }
      }
    });
  });

  return metrics;
}

// Generate comprehensive evaluation report
function generateEvaluationReport() {
  console.log('🔬 Starting AI Maze Solver Evaluation...');
  
  const startTime = new Date();
  const evaluationId = generateEvaluationId();
  const { reportPath } = createReportStructure();
  
  console.log('📊 Running BEFORE version tests (expecting failures)...');
  const beforeResults = runTests('before-version.test.js');
  
  console.log('✅ Running AFTER version tests (expecting passes)...');
  const afterResults = runTests('after-version.test.js');
  
  const finishTime = new Date();
  
  // Analyze metrics
  const beforeMetrics = analyzeAlgorithmMetrics(beforeResults.testResults);
  const afterMetrics = analyzeAlgorithmMetrics(afterResults.testResults);
  
  // Create comprehensive report in the required format
  const report = {
    evaluation_metadata: {
      evaluation_id: evaluationId,
      timestamp: startTime.toISOString(),
      evaluator: "automated_test_suite",
      project: "ai_maze_solver_test_suite",
      version: "1.0.0"
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      os: os.type(),
      os_release: os.release(),
      architecture: process.arch,
      hostname: os.hostname(),
      git_commit: "unknown",
      git_branch: "unknown"
    },
    test_execution: {
      success: afterResults.success && beforeResults.total === 16 && afterResults.total === 16,
      exit_code: afterResults.success ? 0 : 1,
      tests: [],
      summary: {
        total: beforeResults.total + afterResults.total,
        passed: beforeResults.passed + afterResults.passed,
        failed: beforeResults.failed + afterResults.failed,
        errors: 0,
        skipped: 0,
        xfailed: 0
      },
      stdout: `Before Repository: ${beforeResults.passed}/${beforeResults.total} passed\nAfter Repository: ${afterResults.passed}/${afterResults.total} passed`,
      stderr: ""
    },
    meta_testing: {
      requirement_traceability: {
        maze_generation_requirements: "test_1_9_10_11_12",
        pathfinding_algorithms: "test_1_2_3_4_5_6_7_8",
        performance_optimization: "test_13_14_15_16",
        edge_case_handling: "test_9_10_11_12"
      },
      adversarial_testing: {
        bfs_queue_behavior: "test_1_2_3_4",
        astar_heuristic_validation: "test_5_6_7_8",
        maze_generation_consistency: "test_9_10_11_12",
        algorithm_performance: "test_13_14_15_16"
      },
      edge_case_coverage: {
        unsolvable_mazes: "test_9_12",
        single_cell_paths: "test_15_16",
        adjacent_positions: "test_15_16",
        large_datasets: "test_13_14"
      }
    },
    compliance_check: {
      algorithms_optimized: afterMetrics.bfs_algorithm_fixed && afterMetrics.astar_algorithm_fixed,
      maze_generation_fixed: afterMetrics.maze_generation_optimized,
      path_validation_working: afterMetrics.path_validation_working,
      performance_improved: afterMetrics.performance_improved,
      edge_cases_handled: afterMetrics.edge_cases_handled
    },
    before: {
      metrics: {
        total_files: beforeMetrics.total_files,
        bfs_algorithm_working: beforeMetrics.bfs_algorithm_fixed,
        astar_algorithm_working: beforeMetrics.astar_algorithm_fixed,
        dfs_algorithm_working: beforeMetrics.dfs_algorithm_working,
        maze_generation_working: beforeMetrics.maze_generation_optimized,
        path_validation_working: beforeMetrics.path_validation_working,
        performance_optimized: beforeMetrics.performance_improved,
        edge_cases_handled: beforeMetrics.edge_cases_handled,
        unsolvable_maze_handling: beforeMetrics.unsolvable_maze_handling
      },
      tests: {
        passed: beforeResults.passed,
        failed: beforeResults.failed,
        total: beforeResults.total,
        success: beforeResults.success,
        output: beforeResults.output
      }
    },
    after: {
      metrics: {
        total_files: afterMetrics.total_files,
        bfs_algorithm_working: afterMetrics.bfs_algorithm_fixed,
        astar_algorithm_working: afterMetrics.astar_algorithm_fixed,
        dfs_algorithm_working: afterMetrics.dfs_algorithm_working,
        maze_generation_working: afterMetrics.maze_generation_optimized,
        path_validation_working: afterMetrics.path_validation_working,
        performance_optimized: afterMetrics.performance_improved,
        edge_cases_handled: afterMetrics.edge_cases_handled,
        unsolvable_maze_handling: afterMetrics.unsolvable_maze_handling
      },
      tests: {
        passed: afterResults.passed,
        failed: afterResults.failed,
        total: afterResults.total,
        success: afterResults.success,
        output: afterResults.output
      }
    },
    comparison: {
      bfs_algorithm_fixed: afterMetrics.bfs_algorithm_fixed && !beforeMetrics.bfs_algorithm_fixed,
      astar_algorithm_fixed: afterMetrics.astar_algorithm_fixed && !beforeMetrics.astar_algorithm_fixed,
      maze_generation_improved: afterMetrics.maze_generation_optimized && !beforeMetrics.maze_generation_optimized,
      path_validation_improved: afterMetrics.path_validation_working && !beforeMetrics.path_validation_working,
      performance_improved: afterMetrics.performance_improved && !beforeMetrics.performance_improved,
      edge_cases_improved: afterMetrics.edge_cases_handled && !beforeMetrics.edge_cases_handled,
      tests_passing: afterResults.passed,
      test_improvement: afterResults.passed - beforeResults.passed,
      all_requirements_met: afterResults.success && afterResults.total === 16
    },
    requirements_checklist: {
      maze_generation_valid: afterMetrics.maze_generation_optimized,
      maze_boundaries_walls: afterMetrics.maze_generation_optimized,
      bfs_finds_path: afterMetrics.bfs_algorithm_fixed,
      dfs_finds_path: afterMetrics.dfs_algorithm_working,
      astar_finds_path: afterMetrics.astar_algorithm_fixed,
      unsolvable_maze_handling: afterMetrics.unsolvable_maze_handling,
      path_validation: afterMetrics.path_validation_working,
      path_cells_passable: afterMetrics.path_validation_working,
      performance_optimized: afterMetrics.performance_improved,
      edge_cases_handled: afterMetrics.edge_cases_handled,
      jest_framework_used: true
    },
    final_verdict: {
      success: afterResults.success && afterResults.total === 16 && beforeResults.total === 16,
      total_tests: afterResults.total,
      passed_tests: afterResults.passed,
      failed_tests: afterResults.failed,
      success_rate: afterResults.total > 0 ? ((afterResults.passed / afterResults.total) * 100).toFixed(1) : "0.0",
      meets_requirements: afterResults.success && afterResults.total === 16
    }
  };
  
  // Save report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display results
  console.log('\n🎯 EVALUATION RESULTS');
  console.log('=====================');
  console.log(`📁 Report saved: ${reportPath}`);
  console.log(`🕐 Duration: ${finishTime - startTime}ms`);
  console.log('\n📊 TEST SUMMARY:');
  console.log(`   BEFORE: ${beforeResults.passed}/${beforeResults.total} passed (${beforeResults.failed} failed)`);
  console.log(`   AFTER:  ${afterResults.passed}/${afterResults.total} passed (${afterResults.failed} failed)`);
  console.log(`\n✅ Optimization Success: ${report.final_verdict.success ? 'YES' : 'NO'}`);
  console.log(`🔧 Improvements: ${report.comparison.test_improvement} tests fixed`);
  
  return report;
}

// Run evaluation if called directly
if (require.main === module) {
  try {
    generateEvaluationReport();
    process.exit(0);
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { generateEvaluationReport };