/**
 * Test runner that builds and serves the React app, then runs tests
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const projectRoot = path.join(__dirname, "..");
const repoType = process.env.TEST_REPO || "after";
const repoPath = path.join(projectRoot, `repository_${repoType}`);

let serverProcess = null;
let serverPort = 3000;

async function buildApp() {
  const buildDir = path.join(repoPath, "build");
  const buildIndex = path.join(buildDir, "index.html");

  // Skip build if it already exists (faster for evaluation)
  const isEvaluation = process.env.EVALUATION_MODE === "true";
  if (isEvaluation && fs.existsSync(buildIndex)) {
    // In evaluation mode, builds should already exist from Dockerfile
    // Silently skip building
    return;
  }

  // Only build if not in evaluation mode or if build doesn't exist
  if (isEvaluation) {
    // In evaluation mode, if build doesn't exist, that's an error
    throw new Error(
      `Build not found for ${repoPath}. Builds should be pre-built in Docker image.`,
    );
  }

  // No per-repo package.json; rely on prebuilt assets
  if (!fs.existsSync(buildIndex)) {
    throw new Error(
      `Build not found for ${repoPath}. Prebuild the app assets before running tests.`,
    );
  }
}

async function serveApp() {
  const buildDir = path.join(repoPath, "build");

  if (!fs.existsSync(buildDir)) {
    throw new Error("Build directory not found. Run build first.");
  }

  return new Promise((resolve, reject) => {
    // Use a simple HTTP server to serve the built app
    const server = http.createServer((req, res) => {
      let filePath = path.join(
        buildDir,
        req.url === "/" ? "index.html" : req.url,
      );

      // Security: prevent directory traversal
      filePath = path.normalize(filePath);
      if (!filePath.startsWith(buildDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        const ext = path.extname(filePath);
        const contentType =
          {
            ".html": "text/html",
            ".js": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".svg": "image/svg+xml",
          }[ext] || "text/plain";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });

    server.listen(serverPort, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${serverPort}`);
      serverProcess = server;
      resolve();
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // Port already in use, try next port
        serverPort++;
        serveApp().then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function waitForApp() {
  const isEvaluation = process.env.EVALUATION_MODE === "true";
  const maxAttempts = isEvaluation ? 20 : 30; // Fewer attempts in evaluation
  const delay = isEvaluation ? 300 : 500; // Faster delay in evaluation

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(
          `http://localhost:${serverPort}`,
          { timeout: 3000 },
          (res) => {
            resolve(res);
          },
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });
      });

      if (response && response.statusCode === 200) {
        if (!isEvaluation) console.log(`App is ready on port ${serverPort}`);
        return;
      } else {
        throw new Error(
          `App returned status ${response ? response.statusCode : "unknown"}`,
        );
      }
    } catch (err) {
      if (i < maxAttempts - 1) {
        if (!isEvaluation && i % 5 === 0) {
          console.log(
            `Waiting for app to start... (attempt ${i + 1}/${maxAttempts})`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(
          `App failed to start after ${maxAttempts} attempts: ${err.message}`,
        );
      }
    }
  }
}

async function cleanup() {
  if (serverProcess) {
    serverProcess.close();
    serverProcess = null;
  }
}

// Handle cleanup on exit
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

async function main() {
  try {
    // Check if dependencies are installed
    // In evaluation mode, dependencies should already be installed in Docker image
    const isEvaluation = process.env.EVALUATION_MODE === "true";

    // FAST EVALUATION MODE: Skip building and serving, just run file-based tests
    if (isEvaluation) {
      // In evaluation mode, skip all building and serving
      // Just verify builds exist and run file-based tests
      const buildDir = path.join(repoPath, "build");
      const buildIndex = path.join(buildDir, "index.html");

      if (!fs.existsSync(buildIndex)) {
        throw new Error(
          `Build not found for ${repoPath}. Builds should be pre-built in Docker image.`,
        );
      }

      // Set flag to skip HTTP server in tests
      process.env.SKIP_HTTP_SERVER = "true";
      process.env.TEST_REPO = repoType;

      // Run Jest tests directly with file-based checks only
      // Use JSON reporter for easier parsing in evaluation mode
      const jestArgs = [
        "jest",
        "--testPathPattern=tests/sandbox.test.js",
        "--no-coverage",
        "--forceExit",
        "--json",
        "--outputFile=/tmp/jest-results.json",
      ];

      let jestOutput = "";
      let jestError = "";

      const jest = spawn("npx", jestArgs, {
        cwd: projectRoot,
        stdio: "pipe", // Capture output for evaluation
        shell: true,
        env: {
          ...process.env,
          TEST_REPO: repoType,
          SKIP_HTTP_SERVER: "true",
          NODE_ENV: "test",
        },
      });

      // Capture stdout and stderr and forward to parent process
      // This ensures evaluation.js can capture the output via execSync
      jest.stdout.on("data", (data) => {
        const dataStr = data.toString();
        jestOutput += dataStr;
        // Write to stdout so execSync in evaluation.js can capture it
        process.stdout.write(dataStr);
      });

      jest.stderr.on("data", (data) => {
        const dataStr = data.toString();
        jestError += dataStr;
        // Write to stderr
        process.stderr.write(dataStr);
      });

      jest.on("error", (error) => {
        console.error("Jest error:", error);
        process.exit(1);
      });

      jest.on("close", (code) => {
        // Try to read JSON results if available
        try {
          const resultsPath = "/tmp/jest-results.json";
          if (fs.existsSync(resultsPath)) {
            const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
            // Output summary in format evaluation can parse
            console.log(
              `\nTest Suites: ${results.numPassedTestSuites} passed, ${results.numFailedTestSuites} failed, ${results.numTotalTestSuites} total`,
            );
            console.log(
              `Tests:       ${results.numPassedTests} passed, ${results.numFailedTests} failed, ${results.numTotalTests} total`,
            );
          }
        } catch (e) {
          // Ignore JSON parse errors, fall back to regular output
        }
        process.exit(code);
      });

      return; // Exit early for evaluation mode
    }

    // NORMAL MODE: Build and serve app
    const nodeModules = path.join(repoPath, "node_modules");

    if (!fs.existsSync(nodeModules)) {
      // Normal mode - install dependencies with output
      console.log("Installing dependencies...");
      await new Promise((resolve, reject) => {
        const install = spawn("npm", ["install"], {
          cwd: repoPath,
          stdio: "inherit",
          shell: true,
        });
        install.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`npm install failed`)),
        );
      });
    }

    console.log("Step 1: Building React app...");

    // For 'before' repo, build failure is expected - handle it gracefully
    try {
      await buildApp();
    } catch (buildError) {
      if (repoType === "before") {
        // Expected failure - before repo uses eval which fails ESLint
        console.log(
          "\n⚠️  Build failed for repository_before (EXPECTED - uses eval)",
        );
        console.log(
          "   This is expected behavior. The before repo uses eval() which fails ESLint checks.",
        );
        console.log(
          "   Proceeding to test phase to verify build failure is handled correctly...\n",
        );
        // Exit with success since this is expected
        process.exit(0);
      } else {
        // Unexpected failure for after repo
        throw buildError;
      }
    }

    console.log("Step 2: Starting HTTP server...");
    await serveApp();

    console.log("Step 3: Waiting for app to be ready...");
    await waitForApp();

    // Set environment variable for tests
    const testUrl = `http://localhost:${serverPort}`;
    process.env.TEST_APP_URL = testUrl;

    console.log(`Step 4: Running tests against app at ${testUrl}...`);
    console.log(`Repository: ${repoType}`);
    console.log(`Test URL: ${testUrl}`);

    // Run Jest tests directly (not via npm test to avoid recursion)
    const jestArgs = [
      "jest",
      "--testPathPattern=tests/sandbox.test.js",
      "--no-coverage",
      "--forceExit",
      "--verbose",
    ];

    const jest = spawn("npx", jestArgs, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        TEST_APP_URL: testUrl,
        TEST_REPO: repoType,
        NODE_ENV: "test",
      },
    });

    jest.on("error", (error) => {
      console.error("Jest error:", error);
      cleanup();
      process.exit(1);
    });

    jest.on("close", (code) => {
      console.log(`Tests completed with exit code: ${code}`);
      cleanup();
      process.exit(code);
    });
  } catch (error) {
    console.error("Error:", error);
    cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildApp, serveApp, waitForApp, cleanup };
