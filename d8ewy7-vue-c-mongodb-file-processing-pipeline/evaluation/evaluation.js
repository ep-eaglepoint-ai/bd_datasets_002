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
    exec(cmd, { cwd, timeout: 1200000 }, (error, stdout, stderr) => {
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

  // Install Chrome for Puppeteer
  await runCommand("npx puppeteer browsers install chrome", testsDir);

  // Run tests
  return runCommand("npm test", testsDir);
};

const printReport = (report, reportPath) => {
  console.log("=".repeat(60));
  console.log("EVALUATION RESULTS");
  console.log("=".repeat(60));
  console.log();
  console.log(`Run ID: ${report.run_id}`);
  console.log(`Duration: ${report.duration_seconds.toFixed(2)} seconds`);
  console.log();

  console.log("TEST EXECUTION:");
  console.log(`  Passed: ${report.tests.passed}`);
  console.log(`  Return Code: ${report.tests.return_code}`);

  console.log();
  console.log("=".repeat(60));
  console.log(`SUCCESS: ${report.success}`);
  console.log("=".repeat(60));
  console.log();
  console.log(`Report written to ${reportPath}`);
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

  // Define the full path explicitly
  const reportPath = path.join(reportDir, "report.json");

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Call the new printer instead of console.log(JSON...)
  printReport(report, reportPath);

  if (tests.passed) process.exit(0);
  else process.exit(1);
};

main();
