import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { arch, platform as _platform, release, type } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..");
const REPORTS_DIR = join(ROOT, "evaluations", "reports");

const runId = Math.random().toString(36).substring(2, 10);
const startedAt = new Date().toISOString();

const ensureReportsDir = () => {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
};

const runCommand = (cwd, command) => {
  try {
    const output = execSync(command, { cwd, stdio: "pipe" });
    return { passed: true, return_code: 0, output: output.toString() };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    return {
      passed: false,
      return_code: error.status ?? 1,
      output: (stdout + stderr).slice(0, 8000),
    };
  }
};

const formatJestResults = (results) => {
  if (!results) {
    return {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      testResults: [],
    };
  }
  return {
    numTotalTests: results.numTotalTests,
    numPassedTests: results.numPassedTests,
    numFailedTests: results.numFailedTests,
    numPendingTests: results.numPendingTests,
    testResults: results.testResults.map((suite) => ({
      name: suite.name,
      status: suite.status,
      summary: suite.summary,
      assertionResults: suite.assertionResults.map((test) => ({
        fullName: test.fullName,
        status: test.status,
        title: test.title,
        duration: test.duration,
        failureMessages: test.failureMessages,
      })),
    })),
  };
};

const runRepoTests = (repoName) => {
  const repoPath = join(ROOT, repoName);

  const frontendReportPath = join(REPORTS_DIR, `${repoName}_frontend_results.json`);
  const backendReportPath = join(REPORTS_DIR, `${repoName}_backend_results.json`);

  const frontendCmd = `npm run test:frontend -- --json --outputFile=${frontendReportPath}`;
  const backendCmd = `npm run test:backend -- --json --outputFile=${backendReportPath}`;

  const frontend = runCommand(repoPath, frontendCmd);
  const backend = runCommand(repoPath, backendCmd);

  const frontendResults = existsSync(frontendReportPath) ? JSON.parse(readFileSync(frontendReportPath, "utf-8")) : null;
  const backendResults = existsSync(backendReportPath) ? JSON.parse(readFileSync(backendReportPath, "utf-8")) : null;

  if (existsSync(frontendReportPath)) unlinkSync(frontendReportPath);
  if (existsSync(backendReportPath)) unlinkSync(backendReportPath);

  const passed = frontend.passed && backend.passed;

  return {
    tests: {
      passed,
      return_code: passed ? 0 : frontend.return_code || backend.return_code,
      output: ["=== Frontend Tests ===", frontend.output, "=== Backend Tests ===", backend.output]
        .join("\n")
        .slice(0, 8000),
    },
    metrics: {
      frontend: formatJestResults(frontendResults),
      backend: formatJestResults(backendResults),
      summary: {
        totalTests: (frontendResults?.numTotalTests ?? 0) + (backendResults?.numTotalTests ?? 0),
        totalPasses: (frontendResults?.numPassedTests ?? 0) + (backendResults?.numPassedTests ?? 0),
        totalFailures: (frontendResults?.numFailedTests ?? 0) + (backendResults?.numFailedTests ?? 0),
      },
    },
  };
};

const runEvaluation = () => {
  ensureReportsDir();

  const before = runRepoTests("repository_before");
  const after = runRepoTests("repository_after");

  const finishedAt = new Date().toISOString();
  const durationSeconds = (new Date(finishedAt) - new Date(startedAt)) / 1000;

  const comparison = {
    passed_gate: after.tests.passed,
    improvement_summary: after.tests.passed
      ? "After implementation passed correctness tests."
      : "After implementation failed correctness tests.",
  };

  const report = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    environment: {
      node_version: process.version,
      platform: _platform(),
      os: type(),
      os_release: release(),
      architecture: arch(),
    },
    before,
    after,
    comparison,
    success: comparison.passed_gate,
    error: null,
  };

  const reportPath = join(REPORTS_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
};

const main = () => {
  const report = runEvaluation();
  if (!report.success) {
    process.exit(1);
  }
  process.exit(0);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runEvaluation };
