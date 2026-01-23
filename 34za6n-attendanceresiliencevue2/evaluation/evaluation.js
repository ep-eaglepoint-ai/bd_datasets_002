#!/usr/bin/env node

/**
 * Evaluation script for Attendance Resilience Vue 2 Application
 * Tests all requirements: state machine, optimistic updates, UI resilience, etc.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function generateRunId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function getEnvironmentInfo() {
  return {
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`
  }
}

function runTests(testPath) {
  try {
    console.log(`Running tests: ${testPath}`)
    
    // Run the test file
    const testOutput = execSync(`node ${testPath}`, { 
      encoding: 'utf8',
      cwd: path.dirname(testPath)
    })
    
    console.log(testOutput)
    
    // Parse test results from output
    const lines = testOutput.split('\n')
    let passed = 0
    let failed = 0
    let total = 0
    
    // Look for test result summary
    for (const line of lines) {
      if (line.includes('Test Results:') || line.includes('UI Test Results:')) {
        const match = line.match(/(\d+)\s+passed,\s+(\d+)\s+failed/)
        if (match) {
          passed += parseInt(match[1])
          failed += parseInt(match[2])
          total += passed + failed
        }
      }
    }
    
    return {
      passed,
      failed,
      total,
      success: failed === 0 && total > 0,
      output: testOutput
    }
    
  } catch (error) {
    console.error(`Test execution failed: ${error.message}`)
    
    // Try to extract some info from error output
    const errorOutput = error.stdout ? error.stdout.toString() : ''
    let passed = 0
    let failed = 1 // At least one failure if we're in catch block
    let total = 1
    
    if (errorOutput.includes('passed') || errorOutput.includes('failed')) {
      const passedMatch = errorOutput.match(/(\d+)\s+passed/)
      const failedMatch = errorOutput.match(/(\d+)\s+failed/)
      
      if (passedMatch) passed = parseInt(passedMatch[1])
      if (failedMatch) failed = parseInt(failedMatch[1])
      total = passed + failed
    }
    
    return {
      passed,
      failed,
      total,
      success: false,
      output: errorOutput,
      error: error.message
    }
  }
}

function analyzeImplementation(repoPath) {
  if (!fs.existsSync(repoPath)) {
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
    // Count files
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

    // Check for specific files and patterns
    const storeFile = path.join(repoPath, 'src/store/modules/attendance.js')
    if (fs.existsSync(storeFile)) {
      vuexStore = true
      const storeContent = fs.readFileSync(storeFile, 'utf8')
      
      // Check for state machine architecture
      if (storeContent.includes('STATUS') && 
          storeContent.includes('IDLE') && 
          storeContent.includes('LOADING') && 
          storeContent.includes('SUCCESS') && 
          storeContent.includes('ERROR')) {
        hasStateMachine = true
      }
      
      // Check for optimistic updates
      if (storeContent.includes('OPTIMISTIC_UPDATE') && 
          storeContent.includes('ROLLBACK')) {
        hasOptimisticUpdates = true
      }
      
      // Check for retry mechanism
      if (storeContent.includes('retryQueue') && 
          storeContent.includes('retryOperation')) {
        hasRetryMechanism = true
      }
      
      // Check for notifications
      if (storeContent.includes('notifications') && 
          storeContent.includes('addNotification')) {
        hasNotifications = true
      }
    }

    // Check for mock API
    const mockApiFile = path.join(repoPath, 'src/services/mockApi.js')
    if (fs.existsSync(mockApiFile)) {
      mockApi = true
    }

    // Check for Vuetify usage
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

  // Get paths
  const rootDir = path.dirname(__dirname)
  const beforePath = null // No before implementation
  const afterPath = path.join(rootDir, 'repository_after')
  const testsPath = path.join(rootDir, 'tests')

  console.log('1. Analyzing BEFORE implementation (baseline)...')
  const beforeMetrics = analyzeImplementation(beforePath)
  const beforeTests = { passed: 0, failed: 0, total: 0, success: false }

  console.log('2. Analyzing AFTER implementation...')
  const afterMetrics = analyzeImplementation(afterPath)

  console.log('3. Running State Machine and Data Integrity Tests...')
  const storeTestPath = path.join(testsPath, 'test_attendance_store.js')
  const storeTestResults = runTests(storeTestPath)

  console.log('4. Running UI Resilience Tests...')
  const uiTestPath = path.join(testsPath, 'test_ui_resilience.js')
  const uiTestResults = runTests(uiTestPath)

  // Combine test results
  const afterTests = {
    passed: storeTestResults.passed + uiTestResults.passed,
    failed: storeTestResults.failed + uiTestResults.failed,
    total: storeTestResults.total + uiTestResults.total,
    success: storeTestResults.success && uiTestResults.success
  }

  console.log('5. Generating evaluation report...')

  const finishTime = new Date().toISOString()
  const success = afterTests.success && 
                  afterMetrics.has_state_machine && 
                  afterMetrics.has_optimistic_updates && 
                  afterMetrics.has_retry_mechanism &&
                  afterMetrics.vuex_store &&
                  afterMetrics.mock_api

  // Create evaluation report
  const report = {
    run_id: runId,
    started_at: startTime,
    finished_at: finishTime,
    environment: getEnvironmentInfo(),
    before: {
      metrics: beforeMetrics,
      tests: beforeTests
    },
    after: {
      metrics: afterMetrics,
      tests: afterTests
    },
    comparison: {
      files_created: afterMetrics.total_files - beforeMetrics.total_files,
      vue_components_created: afterMetrics.vue_components,
      state_machine_implemented: afterMetrics.has_state_machine,
      optimistic_updates_implemented: afterMetrics.has_optimistic_updates,
      retry_mechanism_implemented: afterMetrics.has_retry_mechanism,
      notifications_implemented: afterMetrics.has_notifications,
      vuex_store_implemented: afterMetrics.vuex_store,
      mock_api_implemented: afterMetrics.mock_api,
      vuetify_integration: afterMetrics.vuetify_components,
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
    success
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
  console.log(`Duration: ${((new Date(finishTime) - new Date(startTime)) / 1000).toFixed(2)} seconds`)
  console.log(`Overall Success: ${success ? '✅' : '❌'}`)
  console.log('')
  console.log('BEFORE Implementation:')
  console.log(`  - Success: ❌`)
  console.log(`  - Files: ${beforeMetrics.total_files}`)
  console.log(`  - Tests: ${beforeTests.passed}/${beforeTests.total} passed`)
  console.log('')
  console.log('AFTER Implementation:')
  console.log(`  - Success: ${afterTests.success ? '✅' : '❌'}`)
  console.log(`  - Files: ${afterMetrics.total_files}`)
  console.log(`  - Vue Components: ${afterMetrics.vue_components}`)
  console.log(`  - Tests: ${afterTests.passed}/${afterTests.total} passed`)
  console.log('')
  console.log('REQUIREMENTS CHECKLIST:')
  console.log(`  - State Machine Architecture: ${report.requirements_checklist.state_machine_architecture ? '✅' : '❌'}`)
  console.log(`  - Vuetify Feedback Loops: ${report.requirements_checklist.vuetify_feedback_loops ? '✅' : '❌'}`)
  console.log(`  - Optimistic Updates & Rollback: ${report.requirements_checklist.optimistic_updates_rollback ? '✅' : '❌'}`)
  console.log(`  - Mock API Layer: ${report.requirements_checklist.mock_api_layer ? '✅' : '❌'}`)
  console.log(`  - Data Normalization: ${report.requirements_checklist.data_normalization ? '✅' : '❌'}`)
  console.log(`  - Actionable Retries: ${report.requirements_checklist.actionable_retries ? '✅' : '❌'}`)
  console.log(`  - State Transition Testing: ${report.requirements_checklist.state_transition_testing ? '✅' : '❌'}`)
  console.log(`  - UI Resilience Testing: ${report.requirements_checklist.ui_resilience_testing ? '✅' : '❌'}`)
  console.log(`  - Data Integrity Testing: ${report.requirements_checklist.data_integrity_testing ? '✅' : '❌'}`)
  console.log('')
  console.log(`${success ? '✅' : '❌'} EVALUATION ${success ? 'PASSED' : 'FAILED'}`)
  console.log('')
  console.log(`Results saved to: ${reportPath}`)
  console.log('')

  // Output JSON for automation
  console.log(JSON.stringify(report))

  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}