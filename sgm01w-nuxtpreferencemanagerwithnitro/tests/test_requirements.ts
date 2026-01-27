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
import {
  parsePreferencesFromCookieHeader,
  serializePreferencesCookieValue,
} from "../repository_after/userPreferences.cookie";
import {
  syncUserPreferencesHandler,
  getStoredPreferences,
} from "../repository_after/nitro.settingsSync";
import { createPreferenceBroadcastChannel } from "../repository_after/userPreferences.broadcast";
import { resolveThemeClassForHtml } from "../repository_after/userPreferences.theme";

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
    throw new Error(message ?? `Expected ${b}, received ${a}`);
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
  expectEqual(
    result.htmlAttrs.class,
    "theme-dark",
    "HTML class should be theme-dark",
  );
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
  expectEqual(
    stateAfter.preferences.theme,
    "dark",
    "Theme should update immediately",
  );

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

// Req 4: Backend Integration
test("Backend /api/settings/sync validates and persists data", async () => {
  const validPayload = {
    preferences: {
      theme: "light",
      language: "es",
      sidebarCollapsed: true,
    },
  };

  const response = await syncUserPreferencesHandler(validPayload);
  expectEqual(response.ok, true, "Response should be OK");
  expectEqual(response.preferences.language, "es");

  const stored = getStoredPreferences();
  expectEqual(
    stored?.language,
    "es",
    "Preferences should be persisted in memory",
  );

  // Invalid payload check
  try {
    await syncUserPreferencesHandler({
      preferences: { theme: "invalid" },
    } as any);
    throw new Error("Should have thrown validation error");
  } catch (e: any) {
    if (!e.message.includes("Expected one of")) {
      throw e; // Rethrow if it's not the validation error we expect
    }
  }
});

// Req 5: Cross-Tab Reactivity
test("BroadcastChannel notifies listeners of updates", async () => {
  const channel1 = createPreferenceBroadcastChannel("test-channel");
  const channel2 = createPreferenceBroadcastChannel("test-channel");

  const received: UserPreferences[] = [];
  channel2.subscribe((prefs) => {
    received.push(prefs);
  });

  const payload: UserPreferences = {
    theme: "high-contrast",
    language: "de",
    sidebarCollapsed: false,
  };

  channel1.broadcast(payload);

  // Wait for event loop
  await new Promise((resolve) => setTimeout(resolve, 10));

  expectEqual(received.length, 1, "Should receive broadcast message");
  expectEqual(received[0].theme, "high-contrast");
  expectEqual(received[0].language, "de");
});

// Req 7: Theme Strategy (System Preference)
test("System theme respects systemPrefersDark flag", () => {
  const prefs: UserPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    theme: "system",
  };

  // Case A: System prefers dark -> should resolve to dark
  const classA = resolveThemeClassForHtml(prefs, true); // true = dark mode
  expectEqual(classA, "theme-dark", "System + Dark Preference => theme-dark");

  // Case B: System prefers light -> should resolve to light
  const classB = resolveThemeClassForHtml(prefs, false); // false = light mode
  expectEqual(
    classB,
    "theme-light",
    "System + Light Preference => theme-light",
  );

  // Case C: Explicit override ignores system preference
  const explicitPrefs: UserPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    theme: "light",
  };
  const classC = resolveThemeClassForHtml(explicitPrefs, true);
  expectEqual(
    classC,
    "theme-light",
    "Explicit Light + Dark Preference => theme-light",
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
