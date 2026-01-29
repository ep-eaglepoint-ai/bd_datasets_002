import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { spawnSync } from "child_process";

type PerTestResult = {
  nodeid: string;
  name: string;
  outcome: "passed" | "failed" | "skipped" | "error";
};

type Summary = {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
};

type TestBlock = {
  passed: boolean;
  return_code: number;
  output: string; // combined stdout+stderr (truncated)
  stdout: string; // truncated
  stderr: string; // truncated
  tests: PerTestResult[];
  summary: Summary;
};

type EvalSide = {
  tests: TestBlock;
  metrics: Record<string, number | boolean>;
};

type Report = {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  environment: {
    python_version: string;
    platform: string;
    os: string;
    os_release: string;
    architecture: string;
    hostname: string;
    node_version: string;
    git_commit: string;
    git_branch: string;
  };
  before: EvalSide;
  after: EvalSide;
  comparison: {
    passed_gate: boolean;
    improvement_summary: string;
  };
  success: boolean;
  error: string | null;
  // Optional compatibility mirror (some older evaluators used this nesting).
  results?: {
    before: TestBlock;
    after: TestBlock;
    comparison: {
      before_tests_passed: boolean;
      after_tests_passed: boolean;
      before_total: number;
      before_passed: number;
      before_failed: number;
      after_total: number;
      after_passed: number;
      after_failed: number;
    };
  };
};

// Use CWD so this works in both CJS and ESM (where __dirname may be undefined).
// `npm run evaluate` (and Docker) run from the project root.
const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "evaluation", "reports");
const JEST_BIN = path.join(ROOT, "node_modules", "jest", "bin", "jest.js");

function isoNow(): string {
  return new Date().toISOString();
}

function truncate(s: string, max = 8000): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultTimestampedReportPath(now = new Date()): string {
  // Similar spirit to the Python template: YYYY-MM-DD/HH-MM-SS/report.json
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
  return path.join(REPORTS_DIR, date, time, "report.json");
}

function parseArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function getGitInfo(): { git_commit: string; git_branch: string } {
  const unknown = { git_commit: "unknown", git_branch: "unknown" };
  const commit = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5000,
  });
  const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5000,
  });
  return {
    git_commit:
      typeof commit.status === "number" && commit.status === 0
        ? String(commit.stdout ?? "").trim().slice(0, 8) || unknown.git_commit
        : unknown.git_commit,
    git_branch:
      typeof branch.status === "number" && branch.status === 0
        ? String(branch.stdout ?? "").trim() || unknown.git_branch
        : unknown.git_branch,
  };
}

function emptySummary(): Summary {
  return { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 };
}

function buildTestBlockFromFailure(code: number, stdout: string, stderr: string): TestBlock {
  const combined = truncate(`${stdout}\n${stderr}`.trimEnd(), 8000);
  const isNoTests = /no tests found/i.test(combined);
  return {
    passed: code === 0,
    return_code: code,
    output: combined,
    stdout: truncate(stdout, 3000),
    stderr: truncate(stderr, 1000),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: isNoTests ? 0 : 1,
      errors: 0,
      skipped: 0,
    },
  };
}

function outcomeFromJestStatus(status: string): PerTestResult["outcome"] {
  // Jest assertion statuses: "passed" | "failed" | "pending" | "skipped" | "disabled" | "todo"
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  if (status === "pending" || status === "skipped" || status === "disabled" || status === "todo") {
    return "skipped";
  }
  return "error";
}

function runJestCommand(
  opts: {
    cwd: string;
    outTag: string;
    runId: string;
    env?: Record<string, string | undefined>;
    extraArgs?: string[];
  }
): TestBlock {
  // IMPORTANT:
  // Use `--json` without `--outputFile` so Jest does NOT print
  // "Test results written to: <file>" (user wants the only artifact to be report.json).
  const baseArgs = [JEST_BIN, "--runInBand", "--json"];
  const res = spawnSync(process.execPath, [...baseArgs, ...(opts.extraArgs ?? [])], {
    cwd: opts.cwd,
    encoding: "utf8",
    env: { ...process.env, ...(opts.env ?? {}) },
    timeout: 120_000,
  });

  const rawStdout = String(res.stdout ?? "");
  const rawStderr = String(res.stderr ?? "");
  const code = typeof res.status === "number" ? res.status : -1;

  let parsed: any;
  try {
    parsed = JSON.parse(rawStdout);
  } catch {
    // Covers: "No tests found", config errors, runtime failures, etc.
    return buildTestBlockFromFailure(code, rawStdout, rawStderr);
  }

  const tests: PerTestResult[] = [];
  const testResults: any[] = Array.isArray(parsed?.testResults) ? parsed.testResults : [];

  for (const tr of testResults) {
    const file = typeof tr?.name === "string" ? tr.name : "unknown";
    const relFile = file === "unknown" ? file : path.relative(ROOT, file).replace(/\\/g, "/");
    const assertionResults: any[] = Array.isArray(tr?.assertionResults) ? tr.assertionResults : [];

    for (const ar of assertionResults) {
      const fullName = typeof ar?.fullName === "string" ? ar.fullName : typeof ar?.title === "string" ? ar.title : "unknown";
      const status = typeof ar?.status === "string" ? ar.status : "error";
      tests.push({
        nodeid: `${relFile}::${fullName}`,
        name: fullName,
        outcome: outcomeFromJestStatus(status),
      });
    }
  }

  const passed = Number(parsed?.numPassedTests ?? 0) || 0;
  const failed = Number(parsed?.numFailedTests ?? 0) || 0;
  const skipped = Number(parsed?.numPendingTests ?? 0) || 0;
  const total = Number(parsed?.numTotalTests ?? tests.length ?? 0) || 0;

  const summary: Summary = {
    total,
    passed,
    failed,
    errors: 0,
    skipped,
  };

  return {
    passed: code === 0,
    return_code: code,
    // Prefer stderr as the human-readable output when running with --json.
    // (stdout is JSON and can be large/noisy)
    output: truncate(rawStderr.trimEnd(), 8000),
    stdout: "",
    stderr: truncate(rawStderr, 1000),
    tests,
    summary,
  };
}

function runHarness(mode: "before" | "after", runId: string): TestBlock {
  const nodePath = path.join(ROOT, mode === "before" ? "repository_before" : "repository_after");


  const testPathPattern = "tests/(test_structure|test_order_processor_meta)\\.test\\.ts$";

  return runJestCommand({
    cwd: ROOT,
    outTag: `harness-${mode}`,
    runId,
    env: { NODE_PATH: nodePath, TEST_STATE: mode },
    extraArgs: ["--testPathPattern", testPathPattern],
  });
}

function environmentInfo(): Report["environment"] {
  const git = getGitInfo();
  return {
    python_version: "N/A",
    platform: os.platform(),
    os: os.platform(),
    os_release: os.release(),
    architecture: os.arch(),
    hostname: os.hostname(),
    node_version: process.version,
    git_commit: git.git_commit,
    git_branch: git.git_branch,
  };
}

export function run_evaluation(): Report {
  const startedAt = isoNow();
  const started = Date.now();
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  try {
    // Run the *harness* tests folder for each side (like the Python reference).
    const beforeTests = runHarness("before", runId);
    const afterTests = runHarness("after", runId);

    const before: EvalSide = { tests: beforeTests, metrics: {} };
    const after: EvalSide = { tests: afterTests, metrics: {} };

    const passedGate = after.tests.passed === true;
    const finishedAt = isoNow();
    const durationSeconds = (Date.now() - started) / 1000;

    const report: Report = {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_seconds: Number(durationSeconds.toFixed(6)),
      environment: environmentInfo(),
      before,
      after,
      comparison: {
        passed_gate: passedGate,
        improvement_summary: passedGate
          ? "After implementation passed harness tests."
          : "After implementation failed harness tests.",
      },
      success: passedGate,
      error: null,
      results: {
        before: beforeTests,
        after: afterTests,
        comparison: {
          before_tests_passed: beforeTests.passed,
          after_tests_passed: afterTests.passed,
          before_total: beforeTests.summary.total,
          before_passed: beforeTests.summary.passed,
          before_failed: beforeTests.summary.failed,
          after_total: afterTests.summary.total,
          after_passed: afterTests.summary.passed,
          after_failed: afterTests.summary.failed,
        },
      },
    };

    return report;
  } catch (e: any) {
    const finishedAt = isoNow();
    const durationSeconds = (Date.now() - started) / 1000;
    const empty = buildTestBlockFromFailure(-1, "", "");
    return {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_seconds: Number(durationSeconds.toFixed(6)),
      environment: environmentInfo(),
      before: { tests: empty, metrics: {} },
      after: { tests: empty, metrics: {} },
      comparison: {
        passed_gate: false,
        improvement_summary: "Evaluation runner error.",
      },
      success: false,
      error: String(e?.message ?? e),
    };
  }
}

export function main(): number {
  const report = run_evaluation();

  const requestedOut = parseArgValue("--output");
  const reportPath = requestedOut
    ? path.resolve(requestedOut)
    : defaultTimestampedReportPath(new Date());

  // Write only the single timestamped report (or the user-provided path).
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const json = JSON.stringify(report, null, 2);
  fs.writeFileSync(reportPath, json, "utf8");

  return report.success ? 0 : 1;
}

// Run as a script (CommonJS). This repository's evaluator is invoked via ts-node in CJS mode.
declare const require: any;
declare const module: any;
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  process.exit(main());
}

