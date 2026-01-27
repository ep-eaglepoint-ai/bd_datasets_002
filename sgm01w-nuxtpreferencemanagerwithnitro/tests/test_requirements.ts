/* eslint-disable no-console */

const TARGET = process.env.TARGET;

if (TARGET === "before") {
  // For the baseline repository we don't require any implementation.
  console.log("TEST SUMMARY");
  console.log("Passed: 0/0");
  process.exit(0);
}

import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "../repository_after/userPreferences.schema";
import { initUserPreferencesFromCookie } from "../repository_after/userPreferences.ssr";
import { useUserPreferences } from "../repository_after/useUserPreferences";
import { parsePreferencesFromCookieHeader } from "../repository_after/userPreferences.cookie";

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

function expectEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message ??
        `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function expectDeepEqual(actual: any, expected: any, message?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(
      message ?? `Expected ${b}, received ${a}`,
    );
  }
}

// 8. Unit Test (SSR Context)
test("SSR initialization parses cookie and resolves theme correctly", () => {
  const prefs: UserPreferences = {
    theme: "dark",
    language: "fr",
    sidebarCollapsed: true,
  };

  const cookieHeader = `user_prefs=${encodeURIComponent(JSON.stringify(prefs))}; other=value`;

  const result = initUserPreferencesFromCookie(cookieHeader, false);

  expectEqual(result.preferences.theme, "dark", "Theme should be dark");
  expectEqual(result.preferences.language, "fr");
  expectEqual(result.preferences.sidebarCollapsed, true);
  expectEqual(result.htmlAttrs.class, "theme-dark", "HTML class should be theme-dark");
});

// 9. Unit Test (Reactivity)
test("updatePreference performs optimistic update and triggers async sync", async () => {
  const syncCalls: UserPreferences[] = [];
  const syncFn = async (prefs: UserPreferences) => {
    syncCalls.push(prefs);
  };

  const { getState, updatePreference } = useUserPreferences({
    initialPreferences: DEFAULT_USER_PREFERENCES,
    syncFn,
  });

  // Optimistic update
  updatePreference("theme", "dark");

  const stateAfter = getState();
  expectEqual(stateAfter.preferences.theme, "dark", "Theme should update immediately");

  // Allow microtasks to flush
  await new Promise((resolve) => setTimeout(resolve, 0));

  expectEqual(syncCalls.length, 1, "Sync function should be called once");
  expectEqual(syncCalls[0].theme, "dark");
});

// 10. Unit Test (Validation)
test("Malformed cookie JSON falls back to default preferences", () => {
  const malformedCookie = "user_prefs=%7Bmalformed-json%7D";

  const result = parsePreferencesFromCookieHeader(malformedCookie);

  expectDeepEqual(
    result.preferences,
    DEFAULT_USER_PREFERENCES,
    "Should fall back to default preferences",
  );
  expectEqual(
    result.shouldClearCookie,
    true,
    "Corrupted cookie should be marked for clearing",
  );
});

async function run() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`PASS: ${t.name}`);
      passed += 1;
    } catch (error: any) {
      console.log(`FAIL: ${t.name}`);
      console.log(error?.stack || error?.message || String(error));
      failed += 1;
    }
  }

  const total = passed + failed;
  console.log("TEST SUMMARY");
  console.log(`Passed: ${passed}/${total}`);

  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error("Unexpected error while running tests", error);
  console.log("TEST SUMMARY");
  console.log("Passed: 0/0");
  process.exit(1);
});

