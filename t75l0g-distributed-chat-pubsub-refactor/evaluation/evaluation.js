const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "evaluation", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function getEnvironmentInfo() {
  return {
    node_version: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
  };
}

function runTests() {
  return new Promise((resolve) => {
    // Run Jest with --json flag to get machine-readable output
    const jestProc = spawn("npx", ["jest", "--json"], {
      cwd: ROOT,
      env: {
        ...process.env,
        CI: "true", // FORCE the evaluation to test the solution
        REPO_PATH: "repository_after",
      }, // CI=true prevents interactive watch mode
    });

    let stdout = "";
    let stderr = "";

    jestProc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    jestProc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    jestProc.on("close", (code) => {
      let passed = code === 0;
      let outputDetails = stderr || stdout; // Jest usually prints summaries to stderr

      // Try to parse Jest's JSON output for cleaner details
      try {
        const jsonResult = JSON.parse(stdout);
        passed = jsonResult.success;
        // If passed, we can say so; if failed, capture the failure messages
        outputDetails = passed ? "All tests passed." : stderr;
      } catch (e) {
        // Fallback if JSON parsing fails (e.g. if jest crashes hard)
        console.warn(
          "Could not parse Jest JSON output, falling back to raw output.",
        );
      }

      resolve({
        passed,
        return_code: code,
        output: outputDetails,
      });
    });
  });
}

async function runEvaluation() {
  const runId = uuidv4();
  const startTime = new Date().toISOString();

  console.log(`Starting evaluation (Run ID: ${runId})...`);

  // Run the tests
  const testResults = await runTests();

  const endTime = new Date().toISOString();

  const report = {
    run_id: runId,
    started_at: startTime,
    finished_at: endTime,
    environment: getEnvironmentInfo(),
    tests: testResults,
    success: testResults.passed,
  };

  // Write the report to disk
  const reportPath = path.join(REPORTS_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Evaluation complete. Success: ${report.success}`);
  console.log(`Report written to: ${reportPath}`);

  // Exit with status code for Docker/CI
  process.exit(report.success ? 0 : 1);
}

runEvaluation();
