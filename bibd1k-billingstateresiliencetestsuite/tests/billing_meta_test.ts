/**
 * Meta-Test Suite for Billing State Resilience Tests
 *
 * These tests validate that the actual test suite (in repository_after/tests/)
 * meets all requirements:
 * 1. Uses Deno.test runner
 * 2. Covers all FSM transitions
 * 3. Tests late arrival handling
 * 4. Tests idempotency for all event types
 * 5. Includes shuffle stress test
 * 6. Validates terminal states
 * 7. Tests future dating
 * 8. Self-contained single file
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const TEST_FILE_PATH = "./repository_after/tests/billing_service_test.ts";

// Read the test file content for validation
const testFileContent = await Deno.readTextFile(TEST_FILE_PATH);

Deno.test("Meta: Test file exists and is readable", () => {
  assert(testFileContent.length > 0, "Test file should have content");
});

Deno.test("Meta: Uses Deno.test runner", () => {
  const denoTestCount = (testFileContent.match(/Deno\.test\(/g) || []).length;
  assert(denoTestCount > 0, "Should use Deno.test for test definitions");
  assert(denoTestCount >= 20, `Should have at least 20 tests, found ${denoTestCount}`);
});

Deno.test("Meta: Tests FSM transition TRIALING -> ACTIVE", () => {
  assert(
    testFileContent.includes("TRIALING -> ACTIVE") ||
    testFileContent.includes("TRIALING") && testFileContent.includes("ACTIVE"),
    "Should test TRIALING to ACTIVE transition"
  );
});

Deno.test("Meta: Tests FSM transition ACTIVE -> PAST_DUE", () => {
  assert(
    testFileContent.includes("ACTIVE -> PAST_DUE") ||
    (testFileContent.includes("ACTIVE") && testFileContent.includes("PAST_DUE")),
    "Should test ACTIVE to PAST_DUE transition"
  );
});

Deno.test("Meta: Tests FSM transition PAST_DUE -> GRACE_PERIOD", () => {
  assert(
    testFileContent.includes("PAST_DUE -> GRACE_PERIOD") ||
    (testFileContent.includes("PAST_DUE") && testFileContent.includes("GRACE_PERIOD")),
    "Should test PAST_DUE to GRACE_PERIOD transition"
  );
});

Deno.test("Meta: Tests FSM transition PAST_DUE -> ACTIVE (recovery)", () => {
  assert(
    testFileContent.includes("PAST_DUE -> ACTIVE"),
    "Should test PAST_DUE to ACTIVE recovery transition"
  );
});

Deno.test("Meta: Tests FSM transition GRACE_PERIOD -> ACTIVE (recovery)", () => {
  assert(
    testFileContent.includes("GRACE_PERIOD -> ACTIVE"),
    "Should test GRACE_PERIOD to ACTIVE recovery transition"
  );
});

Deno.test("Meta: Tests cancellation from TRIALING state", () => {
  assert(
    testFileContent.includes("TRIALING -> CANCELED"),
    "Should test cancellation from TRIALING state"
  );
});

Deno.test("Meta: Tests cancellation from ACTIVE state", () => {
  assert(
    testFileContent.includes("ACTIVE -> CANCELED"),
    "Should test cancellation from ACTIVE state"
  );
});

Deno.test("Meta: Tests cancellation from PAST_DUE state", () => {
  assert(
    testFileContent.includes("PAST_DUE -> CANCELED"),
    "Should test cancellation from PAST_DUE state"
  );
});

Deno.test("Meta: Tests cancellation from GRACE_PERIOD state", () => {
  assert(
    testFileContent.includes("GRACE_PERIOD -> CANCELED"),
    "Should test cancellation from GRACE_PERIOD state"
  );
});

Deno.test("Meta: Tests late arrival event handling", () => {
  assert(
    testFileContent.toLowerCase().includes("late arrival") ||
    testFileContent.toLowerCase().includes("late") && testFileContent.toLowerCase().includes("older"),
    "Should test late arrival event handling"
  );
});

Deno.test("Meta: Tests idempotency for SUBSCRIPTION_CREATED", () => {
  assert(
    testFileContent.includes("Idempotency") && testFileContent.includes("SUBSCRIPTION_CREATED"),
    "Should test idempotency for SUBSCRIPTION_CREATED"
  );
});

Deno.test("Meta: Tests idempotency for PAYMENT_SUCCESS", () => {
  assert(
    testFileContent.includes("Idempotency") && testFileContent.includes("PAYMENT_SUCCESS"),
    "Should test idempotency for PAYMENT_SUCCESS"
  );
});

Deno.test("Meta: Tests idempotency for PAYMENT_FAILURE", () => {
  assert(
    testFileContent.includes("Idempotency") && testFileContent.includes("PAYMENT_FAILURE"),
    "Should test idempotency for PAYMENT_FAILURE"
  );
});

Deno.test("Meta: Tests idempotency for SUBSCRIPTION_CANCELLED", () => {
  assert(
    testFileContent.includes("Idempotency") && testFileContent.includes("SUBSCRIPTION_CANCELLED"),
    "Should test idempotency for SUBSCRIPTION_CANCELLED"
  );
});

Deno.test("Meta: Includes shuffle stress test with 100 permutations", () => {
  assert(
    testFileContent.toLowerCase().includes("shuffle") &&
    testFileContent.includes("100"),
    "Should include shuffle stress test with 100 permutations"
  );
});

Deno.test("Meta: Tests terminal state CANCELED is immutable", () => {
  assert(
    testFileContent.toLowerCase().includes("terminal") &&
    testFileContent.includes("CANCELED"),
    "Should test that CANCELED terminal state is immutable"
  );
});

Deno.test("Meta: Tests future dating behavior", () => {
  assert(
    testFileContent.toLowerCase().includes("future"),
    "Should test future dating behavior"
  );
});

Deno.test("Meta: Has property-based tests", () => {
  assert(
    testFileContent.toLowerCase().includes("property-based") ||
    testFileContent.toLowerCase().includes("property based"),
    "Should include property-based tests"
  );
});

Deno.test("Meta: Test file is self-contained (imports only from std and local)", () => {
  // Check that imports are only from deno std library and local files
  const imports = testFileContent.match(/import.*from\s+["']([^"']+)["']/g) || [];

  for (const imp of imports) {
    const isStdImport = imp.includes("deno.land/std");
    const isLocalImport = imp.includes("../") || imp.includes("./");

    assert(
      isStdImport || isLocalImport,
      `Import should be from deno std or local: ${imp}`
    );
  }
});

Deno.test("Meta: No external dependencies required", () => {
  // Should not import from npm, node_modules, or other external sources
  assert(!testFileContent.includes("npm:"), "Should not use npm imports");
  assert(!testFileContent.includes("node_modules"), "Should not reference node_modules");
});

// Run the actual test suite and verify it passes
Deno.test("Meta: Actual test suite executes successfully", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["test", "-A", TEST_FILE_PATH],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await cmd.output();
  const output = new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

  assertEquals(code, 0, `Test suite should pass. Output: ${output}`);
});
