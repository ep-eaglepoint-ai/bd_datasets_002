#!/usr/bin/env node

/**
 * Evaluation runner for React Kanban Board enhancement.
 *
 * - Runs Jest tests on repository_before and repository_after
 * - Baseline (before) may have 0 or skipped tests
 * - Solution (after) MUST have passing tests
 * - Generates structured JSON report
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

function uuid() {
  return crypto.randomUUID();
}

function envInfo() {
  return {
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`,
  };
}

function truncate(out, max = 60) {
  if (!out) return "";
  const lines = out.split("\n");
  if (lines.length <= max) return out;
  return [
    ...lines.slice(0, max / 2),
    `... (${lines.length - max} lines truncated) ...`,
    ...lines.slice(-max / 2),
  ].join("\n");
}

function parseJest(output) {
  const summary = { total: 0, passed: 0, failed: 0 };

  if (!output) return summary;

  const m = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (m) {
    summary.passed = parseInt(m[1], 10);
    summary.total = parseInt(m[2], 10);
    summary.failed = summary.total - summary.passed;
    return summary;
  }

  const m2 = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
  if (m2) {
    summary.failed = parseInt(m2[1], 10);
    summary.passed = parseInt(m2[2], 10);
    summary.total = parseInt(m2[3], 10);
    return summary;
  }

  return summary;
}

function runTests(repoPath) {
  try {
    const output = execSync("npm test", {
      cwd: process.cwd(),
      env: { ...process.env, REPO_PATH: repoPath },
      encoding: "utf8",
      stdio: "pipe",
    });

    const summary = parseJest(output);

    return {
      passed: summary.failed === 0,
      return_code: 0,
      output: truncate(output),
      summary,
    };
  } catch (err) {
    const out =
      err.stdout?.toString() ||
      err.stderr?.toString() ||
      err.message;

    const summary = parseJest(out);

    return {
      passed: summary.failed === 0,
      return_code: err.status || 1,
      output: truncate(out),
      summary,
    };
  }
}

function runEvaluation() {
  const started = new Date();
  const runId = uuid();

  console.log("Running evaluation...");
  console.log("Run ID:", runId);

  const before = runTests("repository_before");
  const after = runTests("repository_after");

  // IMPORTANT LOGIC
  const beforeIsBaseline =
    before.summary.total === 0 ||
    (before.summary.total > 0 && before.summary.failed === 0);

  const passedGate =
    after.summary.total > 0 &&
    after.summary.failed === 0;

  let improvement = "";
  if (before.summary.total === 0 && after.summary.total > 0) {
    improvement = `Enhancement added ${after.summary.total} tests`;
  } else if (before.summary.failed > 0 && after.summary.failed === 0) {
    improvement = "Fixed failing baseline behavior";
  } else {
    improvement = "Enhanced implementation validated";
  }

  const report = {
    run_id: runId,
    started_at: started.toISOString(),
    finished_at: new Date().toISOString(),
    duration_seconds: (Date.now() - started.getTime()) / 1000,
    environment: envInfo(),
    before: {
      tests: before,
      metrics: {},
    },
    after: {
      tests: after,
      metrics: {},
    },
    comparison: {
      passed_gate: passedGate,
      improvement_summary: improvement,
    },
    success: passedGate,
    error: passedGate ? null : "After implementation failed tests",
  };

  const outDir = path.join(
    process.cwd(),
    "evaluation",
    new Date().toISOString().split("T")[0],
    new Date().toTimeString().split(" ")[0].replace(/:/g, "-")
  );

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("Evaluation complete.");
  console.log("Success:", report.success);
  process.exit(report.success ? 0 : 1);
}

runEvaluation();
