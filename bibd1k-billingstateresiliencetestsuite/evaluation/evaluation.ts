const decoder = new TextDecoder();

async function runTests(repo: string) {
  const cmd = new Deno.Command("deno", {
    args: ["test", "-A", "tests/billing_service_test.ts"],
    env: { REPO: repo, NO_COLOR: "1" },
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, stderr } = await cmd.output();
  let text = decoder.decode(stdout) + "\n" + decoder.decode(stderr);

  // Strip ANSI escape codes
  text = text.replace(/\x1b\[[0-9;]*m/g, "");

  const results: Record<string, string> = {};
  let passed = 0, failed = 0;

  // Parse standard Deno test output format
  // Format: "test name ... ok (time)" or "test name ... FAILED (time)"
  const lines = text.split("\n");
  for (const line of lines) {
    // Match test result lines
    const okMatch = line.match(/^(.+?)\s+\.\.\.\s+ok\s+\(/);
    if (okMatch) {
      const testName = okMatch[1].trim();
      results[testName] = "PASSED";
      passed++;
      continue;
    }

    const failMatch = line.match(/^(.+?)\s+\.\.\.\s+FAILED\s+\(/);
    if (failMatch) {
      const testName = failMatch[1].trim();
      results[testName] = "FAILED";
      failed++;
      continue;
    }
  }

  return { results, passed, failed, total: passed + failed };
}

console.log("============================================================");
console.log("Billing State Resilience - Evaluation");
console.log("============================================================\n");

const before = await runTests("repository_before");
const after = await runTests("repository_after");

console.log("📊 repository_before:");
console.log(`   Total: ${before.total} | Passed: ${before.passed} | Failed: ${before.failed}`);
if (before.failed > 0) {
  console.log(`   ❌ Status: FAILING`);
} else {
  console.log(`   ✓ Status: PASSING`);
}

console.log("\n📊 repository_after:");
console.log(`   Total: ${after.total} | Passed: ${after.passed} | Failed: ${after.failed}`);
if (after.failed > 0) {
  console.log(`   ❌ Status: FAILING`);
} else {
  console.log(`   ✓ Status: PASSING`);
}

const now = new Date();
const dateStr = now.toISOString().split("T")[0];
const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
const outputDir = `evaluation/${dateStr}/${timeStr}`;
await Deno.mkdir(outputDir, { recursive: true });

const report = {
  timestamp: now.toISOString(),
  before: { tests: before.results, metrics: { total: before.total, passed: before.passed, failed: before.failed } },
  after: { tests: after.results, metrics: { total: after.total, passed: after.passed, failed: after.failed } },
  success: after.failed === 0 && after.total > 0,
};

await Deno.writeTextFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));

console.log("\n============================================================");
console.log("EVALUATION SUMMARY");
console.log("============================================================");
const testsFixed = before.failed - after.failed;
console.log(`Tests Fixed: ${testsFixed > 0 ? testsFixed : 0} (${before.failed} → ${after.failed} failing)`);
console.log(`Success Rate: ${after.total > 0 ? (after.passed / after.total * 100).toFixed(1) : "0.0"}% (${after.passed}/${after.total})`);
console.log(`Overall: ${report.success ? "✓ PASS" : "❌ FAIL"}`);
console.log("============================================================");

if (!report.success) Deno.exit(1);
