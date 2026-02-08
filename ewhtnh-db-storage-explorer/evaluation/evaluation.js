const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { randomUUID } = require('crypto')
const os = require('os')

function generateTimestamp() {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-')
  return `${date}/${time}`
}

function getEnvironmentInfo() {
  return {
    node_version: process.version,
    platform: process.platform,
    os: os.type(),
    architecture: os.arch(),
    hostname: os.hostname()
  }
}

function safeIntMatch(line, regex) {
  const m = line.match(regex)
  return m ? parseInt(m[1], 10) : 0
}

function parseJestTextOutput(output) {
  const lines = String(output || '').split('\n')
  const tests = []
  let summary = { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 }

  for (const line of lines) {
    if (line.includes('✓') || line.includes('✗') || line.includes('✔') || line.includes('✖')) {
      const match = line.match(/[✓✔✚✖✗]\s+(.+?)(?:\s+\((\d+)ms\))?/)
      if (match) {
        const [, name, duration] = match
        const status = line.includes('✓') || line.includes('✔') ? 'passed' : 'failed'
        tests.push({ name: name.trim(), status, duration: duration ? parseInt(duration, 10) : null, failureMessages: status === 'failed' ? [line.trim()] : [] })
      }
    }

    if (/\b(PASS|FAIL)\b/.test(line)) {
      const m = line.match(/\b(PASS|FAIL)\b\s+(.+?)\s*\((\d+\.?\d*)\s*s\)/)
      if (m) {
        const [, status, name, duration] = m
        tests.push({ name: name.trim(), status: status === 'PASS' ? 'passed' : 'failed', duration: Math.round(parseFloat(duration) * 1000), failureMessages: status === 'FAIL' ? ['Test suite failed'] : [] })
      }
    }

    if (line.includes('Tests:')) {
      summary.passed += safeIntMatch(line, /(\d+)\s+passed/)
      summary.failed += safeIntMatch(line, /(\d+)\s+failed/)
      summary.skipped += safeIntMatch(line, /(\d+)\s+skipped/)
      const totalMatch = line.match(/(\d+)\s+total/)
      if (totalMatch) summary.total = parseInt(totalMatch[1], 10)
    }

    if (line.includes('Test Suites:')) {
      summary.passed += safeIntMatch(line, /(\d+)\s+passed/)
      summary.failed += safeIntMatch(line, /(\d+)\s+failed/)
    }
  }

  const perTestSum = summary.passed + summary.failed + summary.skipped
  if (summary.total === 0 && perTestSum > 0) summary.total = perTestSum

  return { tests, summary, raw: String(output || '') }
}

function parseJestJsonOutput(jsonString) {
  try {
    const obj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    const tests = []
    let summary = { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 }

    if (Array.isArray(obj.testResults)) {
      for (const suite of obj.testResults) {
        if (Array.isArray(suite.assertionResults)) {
          for (const a of suite.assertionResults) {
            tests.push({
              name: (suite.name ? `${path.basename(suite.name)} › ` : '') + (a.fullName || a.title || a.ancestorTitles?.join(' › ') || ''),
              status: a.status === 'passed' ? 'passed' : 'failed',
              duration: a.duration || null,
              failureMessages: a.failureMessages || []
            })
          }
        }
        summary.passed += safeIntMatch(String(suite.status || ''), /passed/) ? 0 : 0
      }
    }

    if (typeof obj.numTotalTests === 'number') summary.total = obj.numTotalTests
    if (typeof obj.numPassedTests === 'number') summary.passed = obj.numPassedTests
    if (typeof obj.numFailedTests === 'number') summary.failed = obj.numFailedTests
    if (typeof obj.numPendingTests === 'number') summary.skipped = obj.numPendingTests
    if (typeof obj.numTodoTests === 'number') summary.xfailed = obj.numTodoTests

    return { tests, summary, raw: JSON.stringify(obj) }
  } catch (err) {
    return { tests: [], summary: { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 }, raw: String(jsonString || '') }
  }
}

function runCommand(cmd, cwd = '/app') {
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    return { ok: true, out: String(out) }
  } catch (error) {
    const out = (error.stdout || '') + (error.stderr || '') || error.message || ''
    return { ok: false, out: String(out), code: error.status || 1 }
  }
}

function runTests() {
  // Primary attempt: run through npm test (standard)
  const primary = runCommand('cd repository_after && npm test --silent')
  const parsedPrimary = parseJestTextOutput(primary.out)

  // If primary produced reasonable data (some tests or totals), return it
  if ((parsedPrimary.summary.total > 0) || parsedPrimary.tests.length > 0) {
    return { success: primary.ok, exit_code: primary.ok ? 0 : primary.code || 1, tests: parsedPrimary.tests, summary: parsedPrimary.summary, raw_output: parsedPrimary.raw }
  }

  // Fallback 1: run jest directly with JSON output (preferred)
  const fallbackJson = runCommand('cd repository_after && npx --no-install jest --json --outputFile=jest-output.json || npx jest --json')
  // If a file was produced, try to read it
  let jestJsonRaw = fallbackJson.out
  try {
    const candidatePath = path.join('/app', 'repository_after', 'jest-output.json')
    if (fs.existsSync(candidatePath)) {
      jestJsonRaw = fs.readFileSync(candidatePath, 'utf8')
      // cleanup the temporary file
      try { fs.unlinkSync(candidatePath) } catch (_) {}
    }
  } catch (_) {}

  const parsedJson = parseJestJsonOutput(jestJsonRaw)
  if (parsedJson.summary.total > 0 || parsedJson.tests.length > 0) {
    return { success: fallbackJson.ok, exit_code: fallbackJson.ok ? 0 : fallbackJson.code || 1, tests: parsedJson.tests, summary: parsedJson.summary, raw_output: parsedJson.raw }
  }

  // Fallback 2: list tests to see if Jest can find any tests
  const listCmd = runCommand('cd repository_after && npx --no-install jest --listTests --json || npx jest --listTests --json')
  let listResults = []
  try { listResults = JSON.parse(listCmd.out || '[]') } catch (_) { listResults = [] }
  if (Array.isArray(listResults) && listResults.length > 0) {
    // create synthetic summary saying tests found but not executed
    return {
      success: false,
      exit_code: 0,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 },
      raw_output: `Found test files but no run output.\nFiles:\n${listResults.join('\n')}`
    }
  }

  // As last resort, return the primary raw output (likely the npm header) for transparency
  return { success: primary.ok, exit_code: primary.ok ? 0 : primary.code || 1, tests: parsedPrimary.tests, summary: parsedPrimary.summary, raw_output: parsedPrimary.raw }
}

function main() {
  const startTime = Date.now()
  const startedAt = new Date().toISOString()
  const runId = randomUUID()

  console.log(`Starting evaluation with run ID: ${runId}`)

  try {
    const environment = getEnvironmentInfo()

    console.log('Running tests...')
    const afterResults = runTests()

    const comparison = {
      after_tests_passed: afterResults.success,
      after_total: afterResults.summary.total,
      after_passed: afterResults.summary.passed,
      after_failed: afterResults.summary.failed,
      after_xfailed: afterResults.summary.xfailed
    }

    const finishedAt = new Date().toISOString()
    const durationSeconds = (Date.now() - startTime) / 1000

    const report = {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_seconds: durationSeconds,
      success: afterResults.success,
      error: afterResults.success ? null : 'Tests failed or no tests executed',
      environment,
      results: {
        after: afterResults,
        comparison
      }
    }

    const timestamp = generateTimestamp()
    const reportDir = `/app/evaluation/${timestamp}`
    fs.mkdirSync(reportDir, { recursive: true })

    const reportPath = path.join(reportDir, 'report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    console.log(`Evaluation completed.`)
    console.log(`Report saved to: ${reportPath}`)
    console.log(`Tests: ${afterResults.summary.total} total, ${afterResults.summary.passed} passed, ${afterResults.summary.failed} failed`)

  } catch (error) {
    const finishedAt = new Date().toISOString()
    const durationSeconds = (Date.now() - startTime) / 1000

    const errorReport = {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_seconds: durationSeconds,
      success: false,
      error: error.message || 'Unknown error occurred',
      environment: getEnvironmentInfo(),
      results: {
        after: { success: false, exit_code: 1, tests: [], summary: { total: 0, passed: 0, failed: 0, xfailed: 0, errors: 0, skipped: 0 }, raw_output: '' },
        comparison: { after_tests_passed: false, after_total: 0, after_passed: 0, after_failed: 0, after_xfailed: 0 }
      }
    }

    const timestamp = generateTimestamp()
    const reportDir = `/app/evaluation/${timestamp}`
    fs.mkdirSync(reportDir, { recursive: true })

    const reportPath = path.join(reportDir, 'report.json')
    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2))

    console.error(`Evaluation failed: ${error.message}`)
    console.error(`Error report saved to: ${reportPath}`)

    process.exit(1)
  }
}

main()