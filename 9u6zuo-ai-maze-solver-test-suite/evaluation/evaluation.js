// evaluation/evaluation.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Report will be saved to: evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json
const REPORT_BASE_DIR = path.join(__dirname, 'reports');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateEvaluationId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getReportPath() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  const dir = path.join(REPORT_BASE_DIR, dateStr, timeStr);
  ensureDir(dir);
  return path.join(dir, 'report.json');
}

function getGitInfo() {
  let commit = 'unknown';
  let branch = 'unknown';
  try {
    commit = execSync('git rev-parse HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) {
    // Git not available or not a git repo
  }
  return { commit, branch };
}

function getOsRelease() {
  try {
    return execSync('uname -r 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function runJest(version) {
  console.log(`\n📊 Running tests for: ${version.toUpperCase()} version...\n`);
  
  const tempFile = path.join(__dirname, `../.temp_${version}_results.json`);
  let stdout = '';
  
  try {
    stdout = execSync(
      `cd tests && TEST_VERSION=${version} npx jest maze.test.js --json --outputFile="${tempFile}" --no-cache 2>&1`,
      { 
        encoding: 'utf8',
        env: { ...process.env, TEST_VERSION: version }
      }
    );
    console.log(stdout);
  } catch (error) {
    stdout = error.stdout || '';
    console.log(stdout);
  }

  let jestJson = null;
  if (fs.existsSync(tempFile)) {
    const data = fs.readFileSync(tempFile, 'utf8');
    fs.unlinkSync(tempFile);
    try {
      jestJson = JSON.parse(data);
    } catch (e) {
      jestJson = null;
    }
  }
  
  return { jestJson, stdout };
}

function parseResults(jestJson, stdout) {
  const tests = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;

  if (jestJson && jestJson.testResults) {
    jestJson.testResults.forEach(suite => {
      (suite.assertionResults || []).forEach(t => {
        const status = t.status.toUpperCase();
        if (status === 'PASSED') passed++;
        else if (status === 'FAILED') failed++;
        else if (status === 'PENDING' || status === 'SKIPPED') skipped++;

        tests.push({
          name: t.title,
          status: status === 'PASSED' ? 'PASS' : status === 'FAILED' ? 'FAIL' : status,
          duration: ((t.duration || 0) / 1000).toFixed(2) + 's'
        });
      });
    });
  }

  return { tests, passed, failed, errors, skipped, total: tests.length, output: stdout };
}

function checkRequirements(tests) {
  const isPassed = (keyword) => tests.some(t => 
    t.name.toLowerCase().includes(keyword.toLowerCase()) && t.status === 'PASS'
  );

  return {
    maze_generation: isPassed("req 1"),
    boundary_walls: isPassed("req 2"),
    bfs_pathfinding: isPassed("req 3"),
    dfs_pathfinding: isPassed("req 4"),
    astar_pathfinding: isPassed("req 5"),
    unsolvable_handling: isPassed("req 6"),
    path_validity: isPassed("req 7,8,9"),
    player_movement: isPassed("req 10,11,12"),
    game_state: isPassed("req 13,14,15,16"),
    complete_flow: isPassed("req 17"),
    algorithm_switching: isPassed("req 18"),
    jest_framework: isPassed("req 19")
  };
}

function getMetrics(tests, isAfter) {
  const isPassed = (keyword) => tests.some(t => 
    t.name.toLowerCase().includes(keyword.toLowerCase()) && t.status === 'PASS'
  );

  if (!isAfter) {
    return {
      total_files: 0,
      maze_generation_working: false,
      bfs_working: false,
      dfs_working: false,
      astar_working: false,
      path_validation_working: false,
      movement_working: false,
      game_state_working: false
    };
  }

  return {
    total_files: 1,
    maze_generation_working: isPassed("req 1") && isPassed("req 2"),
    bfs_working: isPassed("req 3"),
    dfs_working: isPassed("req 4"),
    astar_working: isPassed("req 5"),
    path_validation_working: isPassed("req 7,8,9"),
    movement_working: isPassed("req 10,11,12"),
    game_state_working: isPassed("req 13,14,15,16")
  };
}

function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🔬 STARTING EVALUATION");
  console.log("=".repeat(60));
  
  const startTime = new Date().toISOString();
  const gitInfo = getGitInfo();

  // Run BEFORE tests (expected: all FAIL)
  const beforeRun = runJest("before");
  const beforeResults = parseResults(beforeRun.jestJson, beforeRun.stdout);

  // Run AFTER tests (expected: all PASS)
  const afterRun = runJest("after");
  const afterResults = parseResults(afterRun.jestJson, afterRun.stdout);

  // Analyze results
  const checklist = checkRequirements(afterResults.tests);
  const allRequirementsMet = Object.values(checklist).every(v => v === true);
  
  const beforeCorrect = beforeResults.total > 0 && beforeResults.passed === 0;
  const afterCorrect = afterResults.total > 0 && afterResults.failed === 0;
  const success = afterCorrect && allRequirementsMet;

  // Build report matching the required structure
  const report = {
    evaluation_metadata: {
      evaluation_id: generateEvaluationId(),
      timestamp: startTime,
      evaluator: "automated_test_suite",
      project: "ai_maze_solver",
      version: "1.0.0"
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      os: os.type().toLowerCase(),
      os_release: getOsRelease(),
      architecture: process.arch,
      hostname: os.hostname(),
      git_commit: gitInfo.commit,
      git_branch: gitInfo.branch
    },
    test_execution: {
      success: success,
      exit_code: 0,
      tests: afterResults.tests,
      summary: {
        total: afterResults.total,
        passed: afterResults.passed,
        failed: afterResults.failed,
        errors: afterResults.errors,
        skipped: afterResults.skipped
      },
      stdout: `Before Repository: ${beforeResults.passed}/${beforeResults.total} passed\nAfter Repository: ${afterResults.passed}/${afterResults.total} passed`,
      stderr: ""
    },
    meta_testing: {
      requirement_traceability: {
        maze_generation: "requirement_1_2",
        pathfinding_bfs: "requirement_3",
        pathfinding_dfs: "requirement_4",
        pathfinding_astar: "requirement_5",
        unsolvable_handling: "requirement_6",
        path_validity: "requirement_7_8_9",
        player_movement: "requirement_10_11_12",
        game_state: "requirement_13_14_15_16",
        game_flow: "requirement_17",
        algorithm_switching: "requirement_18"
      },
      adversarial_testing: {
        buggy_maze_generation: "requirement_1_2",
        buggy_pathfinding: "requirement_3_4_5",
        buggy_movement: "requirement_10_11_12",
        buggy_game_state: "requirement_13_14_15_16"
      },
      edge_case_coverage: {
        unsolvable_maze: "requirement_6",
        wall_collision: "requirement_11",
        boundary_check: "requirement_12",
        win_condition: "requirement_13_14"
      }
    },
    compliance_check: {
      maze_generation_valid: checklist.maze_generation && checklist.boundary_walls,
      bfs_pathfinding_working: checklist.bfs_pathfinding,
      dfs_pathfinding_working: checklist.dfs_pathfinding,
      astar_pathfinding_working: checklist.astar_pathfinding,
      unsolvable_handling_working: checklist.unsolvable_handling,
      path_validity_working: checklist.path_validity,
      movement_working: checklist.player_movement,
      game_state_working: checklist.game_state
    },
    before: {
      metrics: getMetrics(beforeResults.tests, false),
      tests: {
        passed: beforeResults.passed,
        failed: beforeResults.failed,
        total: beforeResults.total,
        success: beforeResults.passed === beforeResults.total && beforeResults.total > 0,
        tests: beforeResults.tests,
        output: beforeResults.output
      }
    },
    after: {
      metrics: getMetrics(afterResults.tests, true),
      tests: {
        passed: afterResults.passed,
        failed: afterResults.failed,
        total: afterResults.total,
        success: afterResults.failed === 0 && afterResults.total > 0,
        tests: afterResults.tests,
        output: afterResults.output
      }
    },
    comparison: {
      maze_generation_fixed: checklist.maze_generation && checklist.boundary_walls,
      pathfinding_fixed: checklist.bfs_pathfinding && checklist.dfs_pathfinding && checklist.astar_pathfinding,
      movement_fixed: checklist.player_movement,
      game_state_fixed: checklist.game_state,
      tests_passing: afterResults.passed,
      test_improvement: afterResults.passed - beforeResults.passed,
      all_requirements_met: allRequirementsMet
    },
    requirements_checklist: checklist,
    final_verdict: {
      success: success,
      total_tests: afterResults.total,
      passed_tests: afterResults.passed,
      failed_tests: afterResults.failed,
      success_rate: afterResults.total > 0 
        ? ((afterResults.passed / afterResults.total) * 100).toFixed(1)
        : "0.0",
      meets_requirements: allRequirementsMet
    }
  };

  // Save report
  const reportPath = getReportPath();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 EVALUATION SUMMARY");
  console.log("=".repeat(60));
  
  console.log(`\n🔴 BEFORE VERSION (Buggy):`);
  console.log(`   Total: ${beforeResults.total} | Failed: ${beforeResults.failed} | Passed: ${beforeResults.passed}`);
  console.log(`   Status: ${beforeCorrect ? "✅ CORRECT (all tests failed as expected)" : "❌ UNEXPECTED (some tests passed)"}`);
  
  console.log(`\n🟢 AFTER VERSION (Fixed):`);
  console.log(`   Total: ${afterResults.total} | Passed: ${afterResults.passed} | Failed: ${afterResults.failed}`);
  console.log(`   Status: ${afterCorrect ? "✅ CORRECT (all tests passed)" : "❌ UNEXPECTED (some tests failed)"}`);
  
  console.log(`\n📊 Requirements: ${Object.values(checklist).filter(v => v).length}/${Object.keys(checklist).length} met`);
  console.log(`\n📁 Report saved to: ${reportPath}`);
  
  console.log("\n" + "=".repeat(60));
  console.log(`🏆 FINAL VERDICT: ${success ? "✅ SUCCESS" : "❌ NEEDS ATTENTION"}`);
  console.log("=".repeat(60) + "\n");

  process.exit(0);
}

main();