const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')

class RBACEvaluator {
  constructor() {
    this.runId = this.generateRunId()
    this.startTime = new Date()
    this.results = {
      before: null,
      after: null,
      comparison: null
    }
  }

  generateRunId() {
    return Math.random().toString(36).substring(2, 10)
  }

  async evaluate() {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('EVALUATION: Hierarchical RBAC with Temporal Role Escalation')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`Run ID: ${this.runId}`)
    console.log(`Started: ${this.startTime.toISOString()}`)
    console.log('')

    try {
      // Test repository_after only (no repository_before for this task)
      console.log('Testing repository_after...')
      this.results.after = await this.runTests('repository_after')
      
      // Generate comparison
      this.results.comparison = {
        before_tests_passed: null,
        after_tests_passed: this.results.after.success,
        before_total: null,
        before_passed: null,
        before_failed: null,
        after_total: this.results.after.summary.total,
        after_passed: this.results.after.summary.passed,
        after_failed: this.results.after.summary.failed
      }

      await this.generateReport()
      
      console.log('───────────────────────────────────────────────────────────────')
      console.log(`VERDICT: ${this.results.after.success ? '✅ SUCCESS' : '❌ FAILURE'}`)
      console.log('───────────────────────────────────────────────────────────────')
      console.log(`Tests: ${this.results.after.summary.passed}/${this.results.after.summary.total} passed`)
      console.log('')
      
      return this.results.after.success ? 0 : 1
    } catch (error) {
      console.log(`❌ EVALUATION FAILED: ${error.message}`)
      return 2
    }
  }

  async runTests(repoPath) {
    try {
      // Set environment variable for repository path
      const env = { ...process.env, REPO_PATH: repoPath }
      
      // Run Jest tests with JSON output to a file, then read it
      const jsonOutputFile = '/tmp/jest-output.json'
      
      try {
        execSync(`npm test -- --json --outputFile=${jsonOutputFile}`, {
          env,
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'inherit'
        })
      } catch (testError) {
        // Jest exits with non-zero on test failure, but JSON file should still be written
      }

      // Read the JSON output file
      if (fs.existsSync(jsonOutputFile)) {
        const jsonContent = fs.readFileSync(jsonOutputFile, 'utf8')
        const testOutput = JSON.parse(jsonContent)
        
        return {
          success: testOutput.success,
          exit_code: testOutput.success ? 0 : 1,
          tests: testOutput.testResults.flatMap(file => 
            file.assertionResults.map(test => ({
              nodeid: `${file.name}::${test.title}`,
              name: test.title,
              outcome: test.status === 'passed' ? 'passed' : 'failed'
            }))
          ),
          summary: {
            total: testOutput.numTotalTests,
            passed: testOutput.numPassedTests,
            failed: testOutput.numFailedTests,
            errors: testOutput.numRuntimeErrorTestSuites,
            skipped: testOutput.numPendingTests
          },
          stdout: jsonContent,
          stderr: ''
        }
      }
      
      // Fallback if JSON file doesn't exist
      return {
        success: false,
        exit_code: 1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
        stdout: '',
        stderr: 'JSON output file not found'
      }
    } catch (error) {
      return {
        success: false,
        exit_code: error.status || 1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
        stdout: error.stdout || '',
        stderr: error.stderr || error.message
      }
    }
  }

  getEnvironmentInfo() {
    let gitCommit = 'unknown'
    let gitBranch = 'unknown'
    
    try {
      gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    } catch (e) {}
    
    try {
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    } catch (e) {}

    return {
      node_version: process.version,
      platform: `${os.type()}-${os.release()}-${os.arch()}`,
      os: os.type(),
      os_release: os.release(),
      architecture: os.arch(),
      hostname: os.hostname(),
      git_commit: gitCommit,
      git_branch: gitBranch
    }
  }

  getDateTimePath() {
    // Format: YYYY-MM-DD/HH-MM-SS
    const date = this.startTime.toISOString().split('T')[0] // YYYY-MM-DD
    const time = this.startTime.toISOString().split('T')[1].substring(0, 8).replace(/:/g, '-') // HH-MM-SS
    return { date, time }
  }

  async generateReport() {
    const endTime = new Date()
    const duration = (endTime - this.startTime) / 1000

    const report = {
      run_id: this.runId,
      started_at: this.startTime.toISOString(),
      finished_at: endTime.toISOString(),
      duration_seconds: duration,
      success: this.results.after.success,
      error: this.results.after.success ? null : 'Some tests failed',
      environment: this.getEnvironmentInfo(),
      results: {
        before: null,
        after: {
          success: this.results.after.success,
          exit_code: this.results.after.exit_code,
          tests: this.results.after.tests,
          summary: this.results.after.summary,
          stdout: this.results.after.stdout,
          stderr: this.results.after.stderr
        },
        comparison: this.results.comparison
      }
    }

    // Create date/time folder structure: evaluation/YYYY-MM-DD/HH-MM-SS/
    const { date, time } = this.getDateTimePath()
    const reportDir = path.join(__dirname, date, time)
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    // Write JSON report
    const reportPath = path.join(reportDir, 'report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    console.log(`Report saved to: ${reportPath}`)
  }
}

// Main execution
async function main() {
  const evaluator = new RBACEvaluator()
  const exitCode = await evaluator.evaluate()
  process.exit(exitCode)
}

if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Evaluation failed: ${error.message}`)
    process.exit(2)
  })
}

module.exports = { RBACEvaluator }
