const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const crypto = require("crypto");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
// In Docker (evaluation service), ROOT is /app. Tests are in /app/tests.
// Reports: /app/evaluation/reports

const REPORTS = path.join(ROOT, "evaluation", "reports");

const runCommand = (cmd, cwd) => {
  return new Promise((resolve) => {
    console.log(`Running: ${cmd} in ${cwd}`);
    exec(cmd, { cwd, timeout: 60000 }, (error, stdout, stderr) => {
      console.log(stdout + stderr);
      resolve({
        passed: !error,
        return_code: error ? error.code || 1 : 0,
        output: stdout + stderr,
      });
    });
  });
};

const runTests = async () => {
  // Tests dir
  const testsDir = path.join(ROOT, "tests");

  // Install dependencies
  await runCommand("npm install", testsDir);

  // Run tests
  return runCommand("npm test", testsDir);
};

const main = async () => {
  const runId = crypto.randomUUID();
  const start = new Date();

  const tests = await runTests();

  const end = new Date();
  const duration = (end - start) / 1000;

  const report = {
    run_id: runId,
    started_at: start.toISOString(),
    finished_at: end.toISOString(),
    duration_seconds: duration,
    tests: tests,
    success: tests.passed,
  };

  const dateStr = start.toISOString().split("T")[0];
  const timeStr = start.toISOString().split("T")[1].replace(/[:\.]/g, "-");
  const reportDir = path.join(REPORTS, dateStr, timeStr);

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("Evaluation Report:");
  console.log(JSON.stringify(report, null, 2));

  if (tests.passed) process.exit(0);
  else process.exit(1);
};

main();
