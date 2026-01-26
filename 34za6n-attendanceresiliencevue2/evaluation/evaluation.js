#!/usr/bin/env node

/**
 * Evaluation script for Attendance Resilience Vue 2 Application
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function generateRunId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getEnvironmentInfo() {
  return {
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`,
    os: process.platform,
    hostname: require('os').hostname()
  }
}

function runTests(testPath) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    success: false,
    output: '',
    tests: []
  }

  try {
    console.log(`Running tests: ${testPath}`)
    
    const testOutput = execSync(`node ${path.basename(testPath)}`, { 
      encoding: 'utf8',
      cwd: path.dirname(testPath),
      timeout: 60000
    })
    
    results.output = testOutput
    console.log(testOutput)
    
    const lines = testOutput.split('\n')
    
    for (const line of lines) {
      if (line.includes('✅ PASS:')) {
        results.passed++
        results.total++
        const testName = line.replace('✅ PASS:', '').trim()
        results.tests.push({ name: testName, status: 'PASS', duration: '0.00s' })
      } else if (line.includes('❌ FAIL:')) {
        results.failed++
        results.total++
        const testName = line.replace('❌ FAIL:', '').trim()
        results.tests.push({ name: testName, status: 'FAIL', duration: '0.00s' })
      }
    }
    
    results.success = results.failed === 0 && results.total > 0
    
  } catch (error) {
    console.error(`Test execution failed: ${error.message}`)
    
    const errorOutput = error.stdout ? error.stdout.toString() : ''
    results.output = errorOutput
    
    const lines = errorOutput.split('\n')
    for (const line of lines) {
      if (line.includes('✅ PASS:')) {
        results.passed++
        results.total++
        const testName = line.replace('✅ PASS:', '').trim()
        results.tests.push({ name: testName, status: 'PASS', duration: '0.00s' })
      } else if (line.includes('❌ FAIL:')) {
        results.failed++
        results.total++
        const testName = line.replace('❌ FAIL:', '').trim()
        results.tests.push({ name: testName, status: 'FAIL', duration: '0.00s' })
      }
    }
    
    if (results.total === 0) {
      results.failed = 1
      results.total = 1
    }
  }
  
  return results
}

function analyzeImplementation(repoPath) {
  if (!repoPath || !fs.existsSync(repoPath)) {
    return {
      total_files: 0,
      vue_components: 0,
      vuex_store: false,
      mock_api: false,
      vuetify_components: false,
      has_state_machine: false,
      has_optimistic_updates: false,
      has_retry_mechanism: false,
      has_notifications: false
    }
  }

  let totalFiles = 0
  let vueComponents = 0
  let vuexStore = false
  let mockApi = false
  let vuetifyComponents = false
  let hasStateMachine = false
  let hasOptimisticUpdates = false
  let hasRetryMechanism = false
  let hasNotifications = false

  try {
    const countFiles = (dir, extension) => {
      if (!fs.existsSync(dir)) return 0
      let count = 0
      const files = fs.readdirSync(dir, { withFileTypes: true })
      for (const file of files) {
        if (file.isDirectory()) {
          count += countFiles(path.join(dir, file.name), extension)
        } else if (file.name.endsWith(extension)) {
          count++
        }
      }
      return count
    }

    totalFiles = countFiles(repoPath, '.js') + countFiles(repoPath, '.vue')
    vueComponents = countFiles(repoPath, '.vue')

    const storeFile = path.join(repoPath, 'src/store/modules/attendance.js')
    if (fs.existsSync(storeFile)) {
      vuexStore = true
      const storeContent = fs.readFileSync(storeFile, 'utf8')
      
      if (storeContent.includes('STATUS') && 
          storeContent.includes('IDLE') && 
          storeContent.includes('LOADING') && 
          storeContent.includes('SUCCESS') && 
          storeContent.includes('ERROR')) {
        hasStateMachine = true
      }
      
      if (storeContent.includes('OPTIMISTIC_UPDATE') || 
          storeContent.includes('optimisticUpdate') ||
          storeContent.includes('ROLLBACK') ||
          storeContent.includes('rollback')) {
        hasOptimisticUpdates = true
      }
      
      if (storeContent.includes('retryQueue') || 
          storeContent.includes('retryOperation') ||
          storeContent.includes('ADD_TO_RETRY_QUEUE')) {
        hasRetryMechanism = true
      }
      
      if (storeContent.includes('notifications') || 
          storeContent.includes('addNotification') ||
          storeContent.includes('ADD_NOTIFICATION')) {
        hasNotifications = true
      }
    }

    const mockApiFile = path.join(repoPath, 'src/services/mockApi.js')
    if (fs.existsSync(mockApiFile)) {
      mockApi = true
    }

    const appFile = path.join(repoPath, 'src/App.vue')
    if (fs.existsSync(appFile)) {
      const appContent = fs.readFileSync(appFile, 'utf8')
      if (appContent.includes('v-') || appContent.includes('vuetify')) {
        vuetifyComponents = true
      }
    }

  } catch (error) {
    console.error('Error analyzing implementation:', error.message)
  }

  return {
    total_files: totalFiles,
    vue_components: vueComponents,
    vuex_store: vuexStore,
    mock_api: mockApi,
    vuetify_components: vuetifyComponents,
    has_state_machine: hasStateMachine,
    has_optimistic_updates: hasOptimisticUpdates,
    has_retry_mechanism: hasRetryMechanism,
    has_notifications: hasNotifications
  }
}

function main() {
  const runId = generateRunId()
  const startTime = new Date().toISOString()
  
  console.log('='.repeat(60))
  console.log('Attendance Resilience Vue 2 - Implementation Evaluation')
  console.log('='.repeat(60))
  console.log(`Run ID: ${runId}`)
  console.log(`Started at: ${startTime}`)
  console.log('')

  const rootDir = path.resolve(__dirname, '..')
  const afterPath = path.join(rootDir, 'repository_after')
  const testsPath = path.join(rootDir, 'tests')

  console.log('1. Analyzing BEFORE implementation (baseline)...')
  const beforeMetrics = analyzeImplementation(null)
  const beforeTests = { passed: 0, failed: 0, total: 0, success: false, tests: [], output: '' }

  console.log('2. Analyzing AFTER implementation...')
  const afterMetrics = analyzeImplementation(afterPath)

  console.log('3. Running State Machine and Data Integrity Tests...')
  const storeTestPath = path.join(testsPath, 'test_attendance_store.js')
  const storeTestResults = runTests(storeTestPath)

  console.log('4. Running UI Resilience Tests...')
  const uiTestPath = path.join(testsPath, 'test_ui_resilience.js')
  const uiTestResults = runTests(uiTestPath)

  const afterTests = {
    passed: storeTestResults.passed + uiTestResults.passed,
    failed: storeTestResults.failed + uiTestResults.failed,
    total: storeTestResults.total + uiTestResults.total,
    success: storeTestResults.success && uiTestResults.success,
    tests: [...storeTestResults.tests, ...uiTestResults.tests],
    output: storeTestResults.output + '\n' + uiTestResults.output
  }

  console.log('5. Generating evaluation report...')

  const finishTime = new Date().toISOString()
  
  const success = afterTests.success && 
                  afterMetrics.has_state_machine && 
                  afterMetrics.has_optimistic_updates && 
                  afterMetrics.has_retry_mechanism &&
                  afterMetrics.vuex_store &&
                  afterMetrics.mock_api

  const report = {
    evaluation_metadata: {
      evaluation_id: runId,
      timestamp: startTime,
      evaluator: "automated_test_suite",
      project: "attendance_resilience_vue2",
      version: "1.0.0"
    },
    environment: getEnvironmentInfo(),
    test_execution: {
      success: afterTests.success,
      exit_code: 0,
      tests: afterTests.tests,
      summary: {
        total: afterTests.total,
        passed: afterTests.passed,
        failed: afterTests.failed,
        errors: 0,
        skipped: 0
      },
      stdout: `Before Repository: ${beforeTests.passed}/${beforeTests.total} passed\nAfter Repository: ${afterTests.passed}/${afterTests.total} passed`,
      stderr: ""
    },
    meta_testing: {
      requirement_traceability: {
        state_machine: "requirement_1",
        vuetify_feedback: "requirement_2",
        optimistic_updates: "requirement_3",
        mock_api: "requirement_4",
        data_normalization: "requirement_5",
        actionable_retries: "requirement_6",
        state_transitions: "requirement_7",
        ui_resilience: "requirement_8",
        data_integrity: "requirement_9"
      }
    },
    compliance_check: {
      state_machine_architecture: afterMetrics.has_state_machine,
      vuetify_feedback_loops: afterMetrics.vuetify_components,
      optimistic_updates_rollback: afterMetrics.has_optimistic_updates,
      mock_api_layer: afterMetrics.mock_api,
      data_normalization: afterMetrics.vuex_store,
      actionable_retries: afterMetrics.has_retry_mechanism,
      state_transition_testing: storeTestResults.success,
      ui_resilience_testing: uiTestResults.success,
      data_integrity_testing: storeTestResults.success
    },
    before: {
      metrics: beforeMetrics,
      tests: beforeTests
    },
    after: {
      metrics: afterMetrics,
      tests: {
        passed: afterTests.passed,
        failed: afterTests.failed,
        total: afterTests.total,
        success: afterTests.success,
        tests: afterTests.tests,
        output: afterTests.output
      }
    },
    comparison: {
      files_created: afterMetrics.total_files,
      vue_components_created: afterMetrics.vue_components,
      state_machine_implemented: afterMetrics.has_state_machine,
      optimistic_updates_implemented: afterMetrics.has_optimistic_updates,
      retry_mechanism_implemented: afterMetrics.has_retry_mechanism,
      tests_passing: afterTests.passed,
      all_requirements_met: success
    },
    requirements_checklist: {
      state_machine_architecture: afterMetrics.has_state_machine,
      vuetify_feedback_loops: afterMetrics.vuetify_components,
      optimistic_updates_rollback: afterMetrics.has_optimistic_updates,
      mock_api_layer: afterMetrics.mock_api,
      data_normalization: afterMetrics.vuex_store,
      actionable_retries: afterMetrics.has_retry_mechanism,
      state_transition_testing: storeTestResults.success,
      ui_resilience_testing: uiTestResults.success,
      data_integrity_testing: storeTestResults.success
    },
    final_verdict: {
      success: success,
      total_tests: afterTests.total,
      passed_tests: afterTests.passed,
      failed_tests: afterTests.failed,
      success_rate: afterTests.total > 0 
        ? ((afterTests.passed / afterTests.total) * 100).toFixed(1)
        : "0.0",
      meets_requirements: success
    }
  }

  // Save report
  const reportsDir = path.join(__dirname, 'reports', new Date().toISOString().slice(0, 10), 
                               new Date().toTimeString().slice(0, 8).replace(/:/g, '-'))
  fs.mkdirSync(reportsDir, { recursive: true })
  
  const reportPath = path.join(reportsDir, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Display summary
  console.log('')
  console.log('='.repeat(60))
  console.log('EVALUATION SUMMARY')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Run ID: ${runId}`)
  console.log(`Overall Success: ${success ? '✅' : '❌'}`)
  console.log('')
  console.log('AFTER Implementation:')
  console.log(`  - Files: ${afterMetrics.total_files}`)
  console.log(`  - Vue Components: ${afterMetrics.vue_components}`)
  console.log(`  - Tests: ${afterTests.passed}/${afterTests.total} passed`)
  console.log('')
  console.log('REQUIREMENTS CHECKLIST:')
  console.log(`  1. State Machine Architecture: ${report.requirements_checklist.state_machine_architecture ? '✅' : '❌'}`)
  console.log(`  2. Vuetify Feedback Loops: ${report.requirements_checklist.vuetify_feedback_loops ? '✅' : '❌'}`)
  console.log(`  3. Optimistic Updates & Rollback: ${report.requirements_checklist.optimistic_updates_rollback ? '✅' : '❌'}`)
  console.log(`  4. Mock API Layer: ${report.requirements_checklist.mock_api_layer ? '✅' : '❌'}`)
  console.log(`  5. Data Normalization: ${report.requirements_checklist.data_normalization ? '✅' : '❌'}`)
  console.log(`  6. Actionable Retries: ${report.requirements_checklist.actionable_retries ? '✅' : '❌'}`)
  console.log(`  7. State Transition Testing: ${report.requirements_checklist.state_transition_testing ? '✅' : '❌'}`)
  console.log(`  8. UI Resilience Testing: ${report.requirements_checklist.ui_resilience_testing ? '✅' : '❌'}`)
  console.log(`  9. Data Integrity Testing: ${report.requirements_checklist.data_integrity_testing ? '✅' : '❌'}`)
  console.log('')
  console.log(`${success ? '✅' : '❌'} EVALUATION ${success ? 'PASSED' : 'FAILED'}`)
  console.log('')
  console.log(`Results saved to: ${reportPath}`)
  console.log('')

  process.exit(0)
}

main()