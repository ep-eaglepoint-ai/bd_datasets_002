/**
 * Evaluation script for Billing State Resilience Test Suite
 * Runs tests and generates report in correct format
 */

const decoder = new TextDecoder();

interface TestResult {
  name: string;
  passed: boolean;
}

async function runTests(): Promise<{ passed: number; failed: number; total: number; tests: TestResult[] }> {
  const cmd = new Deno.Command("deno", {
    args: ["test", "-A", "repository_after/tests/billing_service_test.ts"],
    env: { NO_COLOR: "1" },
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr } = await cmd.output();
  let text = decoder.decode(stdout) + "\n" + decoder.decode(stderr);

  // Strip ANSI escape codes
  text = text.replace(/\x1b\[[0-9;]*m/g, "");

  const tests: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  const lines = text.split("\n");
  for (const line of lines) {
    // Match: "test name ... ok (time)"
    const okMatch = line.match(/^(.+?)\s+\.\.\.\s+ok\s+\(/);
    if (okMatch) {
      const testName = okMatch[1].trim();
      tests.push({ name: testName, passed: true });
      passed++;
      continue;
    }

    // Match: "test name ... FAILED (time)"
    const failMatch = line.match(/^(.+?)\s+\.\.\.\s+FAILED\s+\(/);
    if (failMatch) {
      const testName = failMatch[1].trim();
      tests.push({ name: testName, passed: false });
      failed++;
      continue;
    }
  }

  return { passed, failed, total: passed + failed, tests };
}

console.log("============================================================");
console.log("Billing State Resilience - Evaluation");
console.log("============================================================\n");

const results = await runTests();

console.log("[repository_after]");
console.log(`  Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`);

if (results.failed > 0) {
  console.log("  Status: FAILING");
} else {
  console.log("  Status: PASSING");
}

// Generate report in correct format
const now = new Date();
const dateStr = now.toISOString().split("T")[0];
const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
const outputDir = `evaluation/${dateStr}/${timeStr}`;

await Deno.mkdir(outputDir, { recursive: true });

const report = {
  timestamp: now.toISOString(),
  repository_after: {
    passed: results.passed,
    failed: results.failed,
    total: results.total,
    tests: results.tests,
  },
};

await Deno.writeTextFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));

console.log("\n============================================================");
console.log("SUMMARY");
console.log("============================================================");

const success = results.failed === 0 && results.total > 0;

if (success) {
  console.log(`  PASS: All ${results.passed} tests passing`);
} else {
  console.log(`  FAIL: ${results.failed} tests failing`);
}

console.log(`\n  Report saved to: ${outputDir}/report.json`);
console.log("============================================================");

if (!success) Deno.exit(1);
