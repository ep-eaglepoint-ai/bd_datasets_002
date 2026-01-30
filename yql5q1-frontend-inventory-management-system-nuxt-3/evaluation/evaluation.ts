import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface TestResult {
  nodeid: string;
  name: string;
  outcome: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  note?: string;
  error?: string;
}

interface TestRunResult {
  success: boolean;
  exit_code: number;
  tests: TestResult[];
  summary: TestSummary;
  stdout: string;
  stderr: string;
}

interface ComparisonResult {
  before_tests_passed: boolean;
  after_tests_passed: boolean;
  after_all_tests_passed: boolean;
  before_total: number;
  before_passed: number;
  before_failed: number;
  after_total: number;
  after_passed: number;
  after_failed: number;
}

interface EvaluationResults {
  before: TestRunResult;
  after: TestRunResult;
  comparison: ComparisonResult;
}

interface EnvironmentInfo {
  node_version: string;
  platform: string;
  os: string;
  os_release: string;
  architecture: string;
  hostname: string;
  git_commit: string;
  git_branch: string;
}

interface Report {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  success: boolean;
  error: string | null;
  environment: EnvironmentInfo;
  results: EvaluationResults | null;
}

function generateRunId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getGitInfo(): { git_commit: string; git_branch: string } {
  const gitInfo = { git_commit: "unknown", git_branch: "unknown" };

  try {
    const commitResult = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    gitInfo.git_commit = commitResult.trim().substring(0, 8);
  } catch {
    // Ignore errors
  }

  try {
    const branchResult = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    gitInfo.git_branch = branchResult.trim();
  } catch {
    // Ignore errors
  }

  return gitInfo;
}

function getEnvironmentInfo(): EnvironmentInfo {
  const gitInfo = getGitInfo();

  return {
    node_version: process.version,
    platform: `${os.type()}-${os.release()}-${os.arch()}`,
    os: os.type(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    git_commit: gitInfo.git_commit,
    git_branch: gitInfo.git_branch,
  };
}

function parseVitestJson(jsonPath: string): { summary: TestSummary; tests: TestResult[] } {
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  const tests: TestResult[] = [];
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const files = data.testResults ?? data.results ?? [];
  for (const file of files) {
    const assertions = file.assertionResults ?? file.assertions ?? [];
    for (const assertion of assertions) {
      total += 1;

      const status = assertion.status || assertion.outcome || "unknown";
      if (status === "passed") passed += 1;
      else if (status === "failed") failed += 1;
      else if (status === "skipped" || status === "pending") skipped += 1;

      const name = assertion.title || assertion.fullName || "unknown";
      const ancestor = assertion.ancestorTitles || assertion.ancestor || [];
      const fullName = Array.isArray(ancestor) ? [...ancestor, name].join(" > ") : name;

      tests.push({
        nodeid: fullName,
        name,
        outcome: status,
      });
    }
  }

  return {
    summary: {
      total,
      passed,
      failed,
      errors: 0,
      skipped,
    },
    tests,
  };
}

function runVitestTests(repositoryPath: string, label: string): TestRunResult {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RUNNING TESTS: ${label.toUpperCase()}`);
  console.log("=".repeat(60));

  const projectRoot = path.resolve(__dirname, "..");
  const repositoryFullPath = path.join(projectRoot, repositoryPath);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "vitest-json-"));
  const outputFile = path.join(outputDir, "results.json");

  const env = { ...process.env };

  // Step 1: Prepare Nuxt (generates .nuxt directory and tsconfig.json)
  console.log("Preparing Nuxt (generating .nuxt directory)...");
  try {
    const prepareResult = spawnSync("npx", ["nuxt", "prepare"], {
      cwd: repositoryFullPath,
      env,
      encoding: "utf-8",
      timeout: 60000,
    });
    
    if (prepareResult.status !== 0) {
      console.log(`Warning: nuxt prepare exited with code ${prepareResult.status}`);
      console.log(`stdout: ${prepareResult.stdout}`);
      console.log(`stderr: ${prepareResult.stderr}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Warning: Failed to run nuxt prepare: ${errorMessage}`);
  }

  // Step 2: Run tests
  const cmd = [
    "npx",
    "vitest",
    "run",
    "--reporter=json",
    `--outputFile=${outputFile}`,
  ];

  try {
    const result = spawnSync(cmd[0], cmd.slice(1), {
      cwd: repositoryFullPath,
      env,
      encoding: "utf-8",
      timeout: 120000,
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    if (!fs.existsSync(outputFile)) {
      return {
        success: false,
        exit_code: result.status || -1,
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          errors: 0,
          skipped: 0,
          error: "Vitest JSON output not found",
        },
        stdout: stdout.length > 3000 ? stdout.slice(-3000) : stdout,
        stderr: stderr.length > 1000 ? stderr.slice(-1000) : stderr,
      };
    }

    const { summary, tests } = parseVitestJson(outputFile);

    console.log(`\nResults: ${summary.passed} passed, ${summary.failed} failed (total: ${summary.total})`);
    for (const test of tests) {
      const statusIcon = test.outcome === "passed" ? "✅" : test.outcome === "skipped" ? "⏭️" : "❌";
      console.log(`  ${statusIcon} ${test.nodeid}`);
    }

    return {
      success: result.status === 0,
      exit_code: result.status || -1,
      tests,
      summary,
      stdout: stdout.length > 3000 ? stdout.slice(-3000) : stdout,
      stderr: stderr.length > 1000 ? stderr.slice(-1000) : stderr,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("TIMEOUT") || errorMessage.includes("timed out")) {
      console.log("❌ Test execution timed out");
      return {
        success: false,
        exit_code: -1,
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, error: "Test execution timed out" },
        stdout: "",
        stderr: "",
      };
    }
    console.log(`❌ Error running tests: ${errorMessage}`);
    return {
      success: false,
      exit_code: -1,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, error: errorMessage },
      stdout: "",
      stderr: "",
    };
  }
}

function runEvaluation(): EvaluationResults {
  console.log(`\n${"=".repeat(60)}`);
  console.log("INVENTORY MANAGEMENT EVALUATION");
  console.log("=".repeat(60));

  console.log(`\n${"=".repeat(60)}`);
  console.log("RUNNING TESTS: BEFORE (repository_before)");
  console.log("=".repeat(60));
  console.log("Skipping Before tests as only After implementation is deployed for testing.");

  const beforeResults: TestRunResult = {
    success: false,
    exit_code: -1,
    tests: [],
    summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, note: "Skipped" },
    stdout: "",
    stderr: "",
  };

  const afterResults = runVitestTests("repository_after", "after (repository_after)");

  const comparison: ComparisonResult = {
    before_tests_passed: beforeResults.success,
    after_tests_passed: afterResults.success,
    after_all_tests_passed: afterResults.summary.total > 0 && afterResults.summary.failed === 0,
    before_total: beforeResults.summary.total,
    before_passed: beforeResults.summary.passed,
    before_failed: beforeResults.summary.failed,
    after_total: afterResults.summary.total,
    after_passed: afterResults.summary.passed,
    after_failed: afterResults.summary.failed,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log("EVALUATION SUMMARY");
  console.log("=".repeat(60));

  console.log(`\nBefore Implementation (repository_before):`);
  console.log(`  Overall: ${beforeResults.success ? "✅ PASSED" : "⏭️ SKIPPED/FAILED"}`);
  console.log(`  Tests: ${comparison.before_passed}/${comparison.before_total} passed`);

  console.log(`\nAfter Implementation (repository_after):`);
  console.log(`  Overall: ${afterResults.success ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`  Tests: ${comparison.after_passed}/${comparison.after_total} passed`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("EXPECTED BEHAVIOR CHECK");
  console.log("=".repeat(60));

  if (afterResults.success) {
    console.log("✅ After implementation: All tests passed (expected)");
  } else {
    console.log("❌ After implementation: Some tests failed (unexpected - should pass all)");
  }

  return {
    before: beforeResults,
    after: afterResults,
    comparison,
  };
}

function generateOutputPath(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");

  const projectRoot = path.resolve(__dirname, "..");
  const outputDir = path.join(projectRoot, "evaluation", dateStr, timeStr);

  fs.mkdirSync(outputDir, { recursive: true });

  return path.join(outputDir, "report.json");
}

function main(): number {
  // Parse command line arguments manually (simpler than commander)
  const args = process.argv.slice(2);
  let outputPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && i + 1 < args.length) {
      outputPath = args[i + 1];
      break;
    }
  }

  const runId = generateRunId();
  const startedAt = new Date();

  console.log(`Run ID: ${runId}`);
  console.log(`Started at: ${startedAt.toISOString()}`);

  let results: EvaluationResults | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    results = runEvaluation();
    success = results.after.success;
    errorMessage = success ? null : "After implementation tests failed";
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.log(`\nERROR: ${errStr}`);
    if (error instanceof Error && error.stack) {
      console.log(error.stack);
    }
    results = null;
    success = false;
    errorMessage = errStr;
  }

  const finishedAt = new Date();
  const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;

  const environment = getEnvironmentInfo();

  const report: Report = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: parseFloat(duration.toFixed(6)),
    success,
    error: errorMessage,
    environment,
    results,
  };

  const finalOutputPath = outputPath ? outputPath : generateOutputPath();
  const outputDir = path.dirname(finalOutputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(finalOutputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${finalOutputPath}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("EVALUATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Success: ${success ? "✅ YES" : "❌ NO"}`);

  return success ? 0 : 1;
}

process.exit(main());