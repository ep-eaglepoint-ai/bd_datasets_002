import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { describe, expect, test, beforeAll, afterAll, afterEach } from '@jest/globals';

const rootDir = path.resolve(__dirname, "..");
const state = process.env.TEST_STATE;

if (!state) {
  throw new Error("TEST_STATE environment variable must be set (e.g., 'before' or 'after')");
}

if (state !== "before" && state !== "after") {
  throw new Error(`TEST_STATE must be either 'before' or 'after', got: ${state}`);
}

const repositoryDir = path.join(rootDir, `repository_${state}`);
const resourcesDir = path.join(__dirname, "resources", "order_processor");
const orderProcessorPath = path.join(repositoryDir, "src", "order_processor.ts");
const orderProcessorBackupPath = path.join(repositoryDir, "src", "order_processor.ts.backup");
const orderProcessorTestPath = path.join(repositoryDir, "src", "order_processor.test.ts");

function backupOriginal(): void {
  if (fs.existsSync(orderProcessorPath)) {
    fs.copyFileSync(orderProcessorPath, orderProcessorBackupPath);
  }
}

function restoreOriginal(): void {
  if (fs.existsSync(orderProcessorBackupPath)) {
    fs.copyFileSync(orderProcessorBackupPath, orderProcessorPath);
    fs.unlinkSync(orderProcessorBackupPath);
  }
}

function copyImplementation(sourceFile: string): void {
  const sourcePath = path.join(resourcesDir, sourceFile);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Implementation file not found: ${sourcePath}`);
  }
  fs.copyFileSync(sourcePath, orderProcessorPath);
}

function runTestSuite(): { passed: number; failed: number; total: number; exitCode: number } {
  let output = "";
  let exitCode = 0;
  
  try {
    output = execSync(
      `npm test -- --testPathPattern="order_processor.test" --no-coverage --verbose`,
      {
        cwd: repositoryDir,
        encoding: "utf8",
        stdio: "pipe",
      }
    ).toString();
    exitCode = 0;
  } catch (error: any) {
    // Jest returns non-zero exit code when tests fail
    output = error.stdout?.toString() || error.stderr?.toString() || error.message || "";
    exitCode = error.status || error.code || 1;
  }
  
  // Parse Jest output to count tests
  const lines = output.split("\n");
  let passed = 0;
  let failed = 0;
  let total = 0;

  // Look for Jest summary line: "Tests:       25 passed, 25 total" or "Tests:       20 passed, 5 failed, 25 total"
  for (const line of lines) {
    // Pattern 1: "Tests:       25 passed, 25 total"
    let match = line.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+total)?/i);
    if (match) {
      passed = parseInt(match[1] || "0", 10);
      failed = parseInt(match[2] || "0", 10);
      total = parseInt(match[3] || (passed + failed).toString(), 10);
      break;
    }
    
    // Pattern 2: "Test Suites: 1 passed, 1 total" and count individual test results
    match = line.match(/Test Suites:.*?(\d+)\s+passed(?:,\s+(\d+)\s+failed)?/i);
    if (match && total === 0) {
      // This gives us suite info, but we need test counts
      continue;
    }
    
    // Pattern 3: Look for individual test results in verbose mode
    if (line.match(/✓|PASS/i) && line.match(/\d+/)) {
      const passMatch = line.match(/(\d+)/);
      if (passMatch && passed === 0) {
        // This might be a count, but we'll rely on the summary line
      }
    }
  }

  // If we couldn't parse from summary, try counting from output
  if (total === 0) {
    // Count test blocks
    const testMatches = output.match(/(✓|×|PASS|FAIL)/g);
    if (testMatches) {
      passed = (output.match(/✓|PASS/gi) || []).length;
      failed = (output.match(/×|FAIL/gi) || []).length;
      total = passed + failed;
    }
  }

  // Fallback: if exit code is non-zero and we have no failures recorded, assume at least 1 failure
  if (exitCode !== 0 && failed === 0 && total > 0) {
    // Tests ran but we couldn't parse - check if there are any failure indicators
    if (output.includes("FAIL") || output.includes("●") || output.includes("Error:")) {
      failed = 1;
      if (passed === 0) {
        total = 1;
      }
    }
  }

  // If still no data, use exit code as indicator
  if (total === 0) {
    if (exitCode === 0) {
      // Assume all passed if we can't tell
      passed = 1;
      total = 1;
    } else {
      failed = 1;
      total = 1;
    }
  }

  return { passed, failed, total, exitCode };
}

describe("meta-testing: test suite detects bugs in broken implementations", () => {
  beforeAll(() => {
    backupOriginal();
  });

  afterAll(() => {
    restoreOriginal();
  });

  afterEach(() => {
    // Restore original after each test to ensure clean state
    restoreOriginal();
  });

  test("test suite detects input mutation bug", () => {
    expect(fs.existsSync(orderProcessorTestPath)).toBe(true);
    copyImplementation("broken_mutates_input.ts");
    const result = runTestSuite();
    
    // Meta test passes if the inner test suite detected the bug (at least 1 failure)
    expect(result.failed).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  test("test suite detects missing validation bug", () => {
    expect(fs.existsSync(orderProcessorTestPath)).toBe(true);
    copyImplementation("broken_no_validation.ts");
    const result = runTestSuite();
    
    // Meta test passes if the inner test suite detected the bug (at least 1 failure)
    expect(result.failed).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  test("test suite detects wrong priority sort bug", () => {
    expect(fs.existsSync(orderProcessorTestPath)).toBe(true);
    copyImplementation("broken_wrong_priority_sort.ts");
    const result = runTestSuite();
    
    // Meta test passes if the inner test suite detected the bug (at least 1 failure)
    expect(result.failed).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  test("test suite detects missing enrich timeout bug", () => {
    expect(fs.existsSync(orderProcessorTestPath)).toBe(true);
    copyImplementation("broken_no_enrich_timeout.ts");
    const result = runTestSuite();
    
    // Meta test passes if the inner test suite detected the bug (at least 1 failure)
    expect(result.failed).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  test("test suite passes for correct implementation", () => {
    expect(fs.existsSync(orderProcessorTestPath)).toBe(true);
    copyImplementation("correct.ts");
    const result = runTestSuite();
    
    // Meta test passes if all inner tests pass for correct implementation
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });
});

