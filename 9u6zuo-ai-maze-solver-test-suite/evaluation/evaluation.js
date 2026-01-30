const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); process.stdout.write(d); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });
    proc.on('close', (code) => resolve({ exitCode: code, stdout, stderr, output: stdout + stderr }));
  });
}

function parseJestOutput(output) {
  const lines = output.split('\n');
  const tests = [];
  let passed = 0, failed = 0, skipped = 0;
  
  // Parse individual test lines
  for (const line of lines) {
    // Match test results: PASS or FAIL with test name
    if (line.includes('✓') || line.includes('✕') || line.includes('PASS') || line.includes('FAIL')) {
      const isPassing = line.includes('✓') || line.includes('PASS');
      const testName = line.trim();
      
      if (testName && !testName.startsWith('Test Suites:') && !testName.startsWith('Tests:')) {
        tests.push({
          name: testName,
          status: isPassing ? 'PASS' : 'FAIL',
          duration: '0ms'
        });
      }
    }
  }
  
  // Parse summary
  const summaryMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?(?:,\s+)?(\d+)\s+total/);
  if (summaryMatch) {
    passed = parseInt(summaryMatch[1]) || 0;
    failed = parseInt(summaryMatch[2]) || 0;
    skipped = parseInt(summaryMatch[3]) || 0;
  } else {
    // Count from actual test results
    passed = tests.filter(t => t.status === 'PASS').length;
    failed = tests.filter(t => t.status === 'FAIL').length;
  }
  
  const total = passed + failed + skipped;
  const success = failed === 0 && passed > 0;
  
  return {
    passed,
    failed,
    skipped,
    total,
    success,
    tests,
    output
  };
}

function analyzeRequirementCoverage(output) {
  const requirements = {};
  
  // Check for each requirement in the output
  const reqPatterns = [
    { id: 1, pattern: /Requirement 1.*?Valid maze with passable/i, key: 'req1_maze_generation' },
    { id: 2, pattern: /Requirement 2.*?boundaries.*?walls/i, key: 'req2_boundaries' },
    { id: 3, pattern: /Requirement 3.*?BFS/i, key: 'req3_bfs_pathfinding' },
    { id: 4, pattern: /Requirement 4.*?DFS/i, key: 'req4_dfs_pathfinding' },
    { id: 5, pattern: /Requirement 5.*?A\*/i, key: 'req5_astar_pathfinding' },
    { id: 6, pattern: /Requirement 6.*?unsolvable/i, key: 'req6_unsolvable_handling' },
    { id: 7, pattern: /Requirement 7.*?consecutive/i, key: 'req7_path_validity' },
    { id: 8, pattern: /Requirement 8.*?passable/i, key: 'req8_path_passable' },
    { id: 9, pattern: /Requirement 9.*?starts.*?goal/i, key: 'req9_path_endpoints' },
    { id: 10, pattern: /Requirement 10.*?four directions/i, key: 'req10_player_movement' },
    { id: 11, pattern: /Requirement 11.*?walls/i, key: 'req11_wall_collision' },
    { id: 12, pattern: /Requirement 12.*?bounds/i, key: 'req12_boundary_collision' },
    { id: 13, pattern: /Requirement 13.*?gameWon/i, key: 'req13_win_condition' },
    { id: 14, pattern: /Requirement 14.*?disabled/i, key: 'req14_movement_disabled' },
    { id: 15, pattern: /Requirement 15.*?Player position/i, key: 'req15_player_bounds' },
    { id: 16, pattern: /Requirement 16.*?Goal/i, key: 'req16_goal_bounds' },
    { id: 17, pattern: /Requirement 17.*?Complete/i, key: 'req17_complete_flow' },
    { id: 18, pattern: /Requirement 18.*?switching/i, key: 'req18_algorithm_switching' },
    { id: 19, pattern: /Requirement 19.*?Jest/i, key: 'req19_jest_framework' }
  ];
  
  for (const req of reqPatterns) {
    // Check if requirement section exists and has passing tests
    const reqSection = output.match(new RegExp(`describe\\(['"].*?${req.id}.*?['"],[\\s\\S]*?(?=describe\\(|$)`, 'i'));
    if (reqSection) {
      // Check if this section has any failures
      const sectionText = reqSection[0];
      const hasFailure = sectionText.includes('✕') || sectionText.includes('FAIL');
      requirements[req.key] = !hasFailure;
    } else {
      // Alternative: check if requirement is mentioned and followed by PASS
      const mentioned = output.match(req.pattern);
      if (mentioned) {
        // Look ahead for test results
        const afterMention = output.substring(output.indexOf(mentioned[0]));
        const nextTests = afterMention.substring(0, 1000); // Look at next 1000 chars
        const hasPass = nextTests.includes('✓') || nextTests.includes('PASS');
        const hasFail = nextTests.includes('✕') || nextTests.includes('FAIL');
        requirements[req.key] = hasPass && !hasFail;
      } else {
        requirements[req.key] = false;
      }
    }
  }
  
  return requirements;
}

function calculateMetrics(testResults, requirementCoverage) {
  const metrics = {
    total_tests: testResults.total,
    passed_tests: testResults.passed,
    failed_tests: testResults.failed,
    success_rate: testResults.total > 0 
      ? ((testResults.passed / testResults.total) * 100).toFixed(1) + '%' 
      : '0%',
    ...requirementCoverage
  };
  
  return metrics;
}

function buildRequirementsChecklist(beforeCoverage, afterParsed) {
  return {
    ...beforeCoverage,
    meta_tests_passed: afterParsed.success
  };
}

async function generateReport() {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

  console.log('🔍 Starting AI Maze Solver Evaluation...\n');
  console.log('═'.repeat(70));

  // Run BEFORE tests
  console.log('\n📋 Running BEFORE Tests (repository_after tests)...\n');
  const beforeResults = await runCommand('npm', ['test'], path.join(projectRoot, 'repository_after'));
  const beforeParsed = parseJestOutput(beforeResults.output);
  const beforeReqCoverage = analyzeRequirementCoverage(beforeResults.output);
  const beforeMetrics = calculateMetrics(beforeParsed, beforeReqCoverage);
  
  console.log(`\n   BEFORE: ${beforeParsed.passed} passed, ${beforeParsed.failed} failed, ${beforeParsed.total} total`);

  console.log('\n' + '═'.repeat(70));

  // Run AFTER tests
  console.log('\n📋 Running AFTER Tests (Meta-Tests)...\n');
  const afterResults = await runCommand('npm', ['test'], path.join(projectRoot, 'tests'));
  const afterParsed = parseJestOutput(afterResults.output);
  const afterReqCoverage = {}; // Meta-tests don't have numbered requirements
  const afterMetrics = calculateMetrics(afterParsed, afterReqCoverage);
  
  console.log(`\n   AFTER: ${afterParsed.passed} passed, ${afterParsed.failed} failed, ${afterParsed.total} total`);

  // Build requirements checklist
  const requirementsChecklist = buildRequirementsChecklist(beforeReqCoverage, afterParsed);
  const requirementsMet = Object.values(requirementsChecklist).filter(Boolean).length;
  const totalRequirements = Object.keys(requirementsChecklist).length;

  // Build comprehensive report
  const report = {
    evaluation_metadata: {
      evaluation_id: `maze-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      evaluator: 'automated_test_suite',
      project: 'ai_maze_solver',
      version: '1.0.0',
      framework: 'jest',
      language: 'javascript'
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    before: {
      description: 'Tests from repository_after verifying maze solver implementation',
      metrics: beforeMetrics,
      tests: {
        passed: beforeParsed.passed,
        failed: beforeParsed.failed,
        skipped: beforeParsed.skipped || 0,
        total: beforeParsed.total,
        success: beforeParsed.success,
        tests: beforeParsed.tests
      },
      output: beforeParsed.output
    },
    after: {
      description: 'Meta-tests verifying test suite quality',
      metrics: afterMetrics,
      tests: {
        passed: afterParsed.passed,
        failed: afterParsed.failed,
        skipped: afterParsed.skipped || 0,
        total: afterParsed.total,
        success: afterParsed.success,
        tests: afterParsed.tests
      },
      output: afterParsed.output
    },
    requirements_checklist: requirementsChecklist,
    final_verdict: {
      success: beforeParsed.success && afterParsed.success,
      total_tests: beforeParsed.total + afterParsed.total,
      passed_tests: beforeParsed.passed + afterParsed.passed,
      failed_tests: beforeParsed.failed + afterParsed.failed,
      success_rate: ((beforeParsed.passed + afterParsed.passed) / (beforeParsed.total + afterParsed.total) * 100).toFixed(1) + '%',
      meets_requirements: requirementsMet === totalRequirements,
      requirements_met: requirementsMet,
      total_requirements: totalRequirements,
      before_tests: {
        passed: beforeParsed.passed,
        failed: beforeParsed.failed,
        total: beforeParsed.total
      },
      after_tests: {
        passed: afterParsed.passed,
        failed: afterParsed.failed,
        total: afterParsed.total
      }
    }
  };

  // Save report
  const reportsDir = path.join(__dirname, 'reports', date, time);
  await fs.mkdir(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Display summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 EVALUATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`   BEFORE Tests: ${beforeParsed.passed}/${beforeParsed.total} passed`);
  console.log(`   AFTER Tests:  ${afterParsed.passed}/${afterParsed.total} passed`);
  console.log(`   Requirements: ${requirementsMet}/${totalRequirements} met`);
  console.log(`   Success Rate: ${report.final_verdict.success_rate}`);
  console.log('═'.repeat(70));
  console.log(`\n📁 Report saved to: ${reportPath}`);

  // Show requirement details
  console.log('\n📋 Requirements Status:');
  Object.entries(requirementsChecklist).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    console.log(`   ${status} ${key}`);
  });

  if (report.final_verdict.success && report.final_verdict.meets_requirements) {
    console.log('\n🎉 EVALUATION PASSED - All tests passed and requirements met!');
  } else if (report.final_verdict.success) {
    console.log('\n⚠️  EVALUATION PARTIAL - Tests passed but some requirements not met');
  } else {
    console.log('\n❌ EVALUATION FAILED - Some tests failed');
    console.log(`   Failed tests: ${report.final_verdict.failed_tests}`);
  }

  return report;
}

// Run evaluation
generateReport()
  .then(report => {
    process.exit(report.final_verdict.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Evaluation error:', error);
    process.exit(1);
  });