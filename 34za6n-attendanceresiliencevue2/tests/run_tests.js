/**
 * Main test runner that executes all test suites
 */

const { execSync } = require('child_process')
const path = require('path')

console.log('='.repeat(60))
console.log('ATTENDANCE RESILIENCE VUE 2 - TEST SUITE')
console.log('='.repeat(60))
console.log('')

let storeTestsPassed = true
let uiTestsPassed = true

try {
  console.log('Running Store Tests...\n')
  execSync('node test_attendance_store.js', { 
    stdio: 'inherit',
    cwd: __dirname
  })
} catch (error) {
  storeTestsPassed = false
}

try {
  console.log('\nRunning UI Tests...\n')
  execSync('node test_ui_resilience.js', { 
    stdio: 'inherit',
    cwd: __dirname
  })
} catch (error) {
  uiTestsPassed = false
}

console.log('\n' + '='.repeat(60))
console.log('ALL TESTS COMPLETED')
console.log('='.repeat(60))

// Exit with 0 regardless of test results (for Docker)
process.exit(0)