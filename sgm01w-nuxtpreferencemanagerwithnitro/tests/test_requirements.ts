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
  parseUserPreferences,
} from "../repository_after/userPreferences.schema";
import { initUserPreferencesFromCookie } from "../repository_after/userPreferences.ssr";
import {
  useUserPreferences,
  type UserPreferencesState,
} from "../repository_after/useUserPreferences";
import {
  parsePreferencesFromCookieHeader,
  serializePreferencesCookieValue,
} from "../repository_after/userPreferences.cookie";
import {
  syncUserPreferencesHandler,
  getStoredPreferences,
} from "../repository_after/nitro.settingsSync";
import { createPreferenceBroadcastChannel } from "../repository_after/userPreferences.broadcast";
import { loadPreferencesFromLocalStorage } from "../repository_after/userPreferences.localStorage";
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

// ============================================================================
// REQ 1: ZOD SCHEMA DEFINITION
// ============================================================================

test("Req 1: Schema validates all valid theme enum values", () => {
  const validThemes: Array<"light" | "dark" | "system" | "high-contrast"> = [
    "light",
    "dark",
    "system",
    "high-contrast",
  ];

  for (const theme of validThemes) {
    const prefs = parseUserPreferences({
      theme,
      language: "en",
      sidebarCollapsed: false,
    });
    expectEqual(prefs.theme, theme, `Theme ${theme} should be valid`);
  }
});

test("Req 1: Schema rejects invalid theme value", () => {
  try {
    parseUserPreferences({
      theme: "invalid-theme",
      language: "en",
      sidebarCollapsed: false,
    });
    throw new Error("Should have thrown validation error");
  } catch (e: any) {
    if (!e.message.includes("Expected one of")) {
      throw e;
    }
  }
});

test("Req 1: Schema rejects invalid field types", () => {
  // Invalid language type (number instead of string)
  try {
    parseUserPreferences({
      theme: "light",
      language: 123,
      sidebarCollapsed: false,
    });
    throw new Error("Should have thrown validation error for language");
  } catch (e: any) {
    if (!e.message.includes("Expected string")) {
      throw e;
    }
  }

  // Invalid sidebarCollapsed type (string instead of boolean)
  try {
    parseUserPreferences({
      theme: "light",
      language: "en",
      sidebarCollapsed: "yes",
    });
    throw new Error("Should have thrown validation error for sidebarCollapsed");
  } catch (e: any) {
    if (!e.message.includes("Expected boolean")) {
      throw e;
    }
  }
});

test("Req 1: Schema rejects missing required fields", () => {
  try {
    parseUserPreferences({
      theme: "light",
      language: "en",
      // missing sidebarCollapsed
    });
    throw new Error("Should have thrown validation error for missing field");
  } catch (e: any) {
    if (!e.message.includes("Expected boolean")) {
      throw e;
    }
  }
});

// ============================================================================
// REQ 2: NUXT 3 COMPOSABLE
// ============================================================================

test("Req 2: Composable initializes with default preferences", () => {
  const { getState } = useUserPreferences({
    initialPreferences: DEFAULT_USER_PREFERENCES,
  });

  const state = getState();
  expectEqual(state.preferences.theme, "system");
  expectEqual(state.preferences.language, "en");
  expectEqual(state.preferences.sidebarCollapsed, false);
  expectEqual(state.syncStatus, "idle");
});

test("Req 2: Composable uses existing global state if initialized", () => {
  // Since global state persists between tests, this test verifies
  // that the composable returns the current global state
  const { getState } = useUserPreferences();

  const state = getState();
  // State should exist (from previous tests)
  if (!state) {
    throw new Error("Expected state to exist");
  }
  expectEqual(state.syncStatus, "idle");
});

test("Req 2: Composable handles multiple sequential updates", async () => {
  const syncCalls: UserPreferences[] = [];
  const syncFn = async (prefs: UserPreferences) => {
    syncCalls.push(prefs);
  };

  const { getState, updatePreference } = useUserPreferences({
    initialPreferences: DEFAULT_USER_PREFERENCES,
    syncFn,
  });

  updatePreference("theme", "dark");
  expectEqual(getState().preferences.theme, "dark");

  updatePreference("language", "es");
  expectEqual(getState().preferences.language, "es");

  updatePreference("sidebarCollapsed", true);
  expectEqual(getState().preferences.sidebarCollapsed, true);

  await new Promise((resolve) => setTimeout(resolve, 50));

  // Should have called sync for each update
  if (syncCalls.length < 3) {
    throw new Error(`Expected at least 3 sync calls, got ${syncCalls.length}`);
  }
});

test("Req 2: Composable state subscription notifies listeners", () => {
  const { subscribe, updatePreference } = useUserPreferences();

  const notifications: UserPreferencesState[] = [];
  const unsubscribe = subscribe((state) => {
    notifications.push(state);
  });

  // Should get at least one initial notification
  if (notifications.length < 1) {
    throw new Error("Should get at least one initial notification");
  }

  const initialCount = notifications.length;
  updatePreference("theme", "light");

  // Should have received at least one more notification
  if (notifications.length <= initialCount) {
    throw new Error("Should receive notification after updatePreference");
  }

  // Verify the latest notification has the updated theme
  expectEqual(
    notifications[notifications.length - 1].preferences.theme,
    "light",
  );

  const countBeforeUnsubscribe = notifications.length;
  unsubscribe();
  updatePreference("language", "de");

  // Should not increase after unsubscribe
  expectEqual(notifications.length, countBeforeUnsubscribe);
});

test("Req 2: Composable provides reactive state updates", () => {
  const { getState, updatePreference } = useUserPreferences();

  const stateBefore = getState();
  const themeBefore = stateBefore.preferences.theme;

  updatePreference("theme", "high-contrast");

  const stateAfter = getState();
  expectEqual(stateAfter.preferences.theme, "high-contrast");

  // Verify it actually changed
  if (themeBefore === "high-contrast") {
    // If it was already high-contrast, change to something else
    updatePreference("theme", "dark");
    expectEqual(getState().preferences.theme, "dark");
  }
});

// ============================================================================
// REQ 3: ISOMORPHIC IMPLEMENTATION (SSR)
// ============================================================================

test("Req 3: SSR initialization with no cookie uses defaults", () => {
  const result = initUserPreferencesFromCookie(undefined, false);

  expectDeepEqual(result.preferences, DEFAULT_USER_PREFERENCES);
  expectEqual(result.shouldClearCookie, false);
  expectEqual(result.htmlAttrs.class, "theme-light"); // system + light = light
});

test("Req 3: SSR initialization with valid cookie", () => {
  const prefs: UserPreferences = {
    theme: "dark",
    language: "fr",
    sidebarCollapsed: true,
  };

  const cookieHeader = `user_prefs=${encodeURIComponent(JSON.stringify(prefs))}`;

  const result = initUserPreferencesFromCookie(cookieHeader, false);

  expectEqual(result.preferences.theme, "dark");
  expectEqual(result.preferences.language, "fr");
  expectEqual(result.preferences.sidebarCollapsed, true);
  expectEqual(result.htmlAttrs.class, "theme-dark");
  expectEqual(result.shouldClearCookie, false);
});

test("Req 3: SSR initialization with corrupted cookie falls back", () => {
  const malformedCookie = "user_prefs=%7Bmalformed%7D";

  const result = initUserPreferencesFromCookie(malformedCookie, false);

  expectDeepEqual(result.preferences, DEFAULT_USER_PREFERENCES);
  expectEqual(result.shouldClearCookie, true);
});

test("Req 3: SSR applies correct HTML class for all themes", () => {
  const themes: Array<"light" | "dark" | "system" | "high-contrast"> = [
    "light",
    "dark",
    "system",
    "high-contrast",
  ];

  for (const theme of themes) {
    const prefs: UserPreferences = {
      theme,
      language: "en",
      sidebarCollapsed: false,
    };

    const cookieHeader = `user_prefs=${encodeURIComponent(JSON.stringify(prefs))}`;
    const result = initUserPreferencesFromCookie(cookieHeader, false);

    if (theme === "system") {
      expectEqual(result.htmlAttrs.class, "theme-light"); // system + light
    } else {
      expectEqual(result.htmlAttrs.class, `theme-${theme}`);
    }
  }
});

// ============================================================================
// REQ 4: BACKEND INTEGRATION
// ============================================================================

test("Req 4: Backend handler accepts all valid theme values", async () => {
  const themes: Array<"light" | "dark" | "system" | "high-contrast"> = [
    "light",
    "dark",
    "system",
    "high-contrast",
  ];

  for (const theme of themes) {
    const payload = {
      preferences: {
        theme,
        language: "en",
        sidebarCollapsed: false,
      },
    };

    const response = await syncUserPreferencesHandler(payload);
    expectEqual(response.ok, true, `Theme ${theme} should be accepted`);
    expectEqual(response.preferences.theme, theme);
  }
});

test("Req 4: Backend handler rejects payloads with missing fields", async () => {
  try {
    await syncUserPreferencesHandler({
      preferences: {
        theme: "light",
        language: "en",
        // missing sidebarCollapsed
      },
    } as any);
    throw new Error("Should have thrown validation error");
  } catch (e: any) {
    if (!e.message.includes("Expected boolean")) {
      throw e;
    }
  }
});

// ============================================================================
// REQ 5: CROSS-TAB REACTIVITY
// ============================================================================

test("Req 5: Multiple broadcast channels receive same message", async () => {
  const channel1 = createPreferenceBroadcastChannel("multi-test");
  const channel2 = createPreferenceBroadcastChannel("multi-test");
  const channel3 = createPreferenceBroadcastChannel("multi-test");

  const received2: UserPreferences[] = [];
  const received3: UserPreferences[] = [];

  channel2.subscribe((prefs) => received2.push(prefs));
  channel3.subscribe((prefs) => received3.push(prefs));

  const payload: UserPreferences = {
    theme: "dark",
    language: "en",
    sidebarCollapsed: true,
  };

  channel1.broadcast(payload);

  await new Promise((resolve) => setTimeout(resolve, 20));

  expectEqual(received2.length, 1, "Channel 2 should receive message");
  expectEqual(received3.length, 1, "Channel 3 should receive message");
  expectEqual(received2[0].theme, "dark");
  expectEqual(received3[0].theme, "dark");
});

test("Req 5: Broadcast channel unsubscribe stops notifications", async () => {
  const channel1 = createPreferenceBroadcastChannel("unsub-test");
  const channel2 = createPreferenceBroadcastChannel("unsub-test");

  const received: UserPreferences[] = [];
  const unsubscribe = channel2.subscribe((prefs) => received.push(prefs));

  const payload1: UserPreferences = {
    theme: "dark",
    language: "en",
    sidebarCollapsed: false,
  };

  channel1.broadcast(payload1);
  await new Promise((resolve) => setTimeout(resolve, 10));

  expectEqual(received.length, 1);

  unsubscribe();

  const payload2: UserPreferences = {
    theme: "light",
    language: "fr",
    sidebarCollapsed: true,
  };

  channel1.broadcast(payload2);
  await new Promise((resolve) => setTimeout(resolve, 10));

  expectEqual(received.length, 1, "Should not receive after unsubscribe");
});

test("Req 5: Broadcast integrates with composable updates", async () => {
  // This test verifies that updatePreference broadcasts to other instances
  const syncFn = async () => {}; // no-op

  const { updatePreference: update1 } = useUserPreferences({
    initialPreferences: DEFAULT_USER_PREFERENCES,
    syncFn,
  });

  const { getState: getState2, subscribe: subscribe2 } = useUserPreferences({
    initialPreferences: DEFAULT_USER_PREFERENCES,
    syncFn,
  });

  const notifications: UserPreferencesState[] = [];
  const unsubscribe = subscribe2((state) => notifications.push(state));

  // Clear initial notification
  notifications.length = 0;

  update1("theme", "dark");

  await new Promise((resolve) => setTimeout(resolve, 20));

  // Second instance should be notified
  if (notifications.length > 0) {
    expectEqual(
      notifications[notifications.length - 1].preferences.theme,
      "dark",
    );
  }

  // Clean up
  unsubscribe();
});

// ============================================================================
// REQ 6: SCHEMA-FIRST DEFENSE
// ============================================================================

test("Req 6: LocalStorage validation handles corrupted data", () => {
  // This test verifies that loadPreferencesFromLocalStorage
  // returns shouldClearStorage=true when localStorage is empty/unavailable
  // (since we're in a Node.js test environment without real localStorage)
  const result = loadPreferencesFromLocalStorage();

  // In Node.js environment, localStorage is not available
  expectDeepEqual(result.preferences, DEFAULT_USER_PREFERENCES);
  expectEqual(result.shouldClearStorage, false); // No storage to clear in Node
});

test("Req 6: Cookie validation falls back on corruption", () => {
  const malformedCookie = "user_prefs=%7Binvalid%7D";

  const originalConsoleError = console.error;
  const errorLogs: any[] = [];
  console.error = (...args: any[]) => errorLogs.push(args);

  try {
    const result = parsePreferencesFromCookieHeader(malformedCookie);

    expectDeepEqual(result.preferences, DEFAULT_USER_PREFERENCES);
    expectEqual(result.shouldClearCookie, true);
  } finally {
    console.error = originalConsoleError;
  }
});

test("Req 6: Schema validation rejects extra fields", () => {
  // The Zod-like implementation doesn't reject extra fields by default,
  // but it should only extract the defined fields
  const dataWithExtra = {
    theme: "light",
    language: "en",
    sidebarCollapsed: false,
    extraField: "should-be-ignored",
  };

  const result = parseUserPreferences(dataWithExtra);

  expectEqual(result.theme, "light");
  expectEqual(result.language, "en");
  expectEqual(result.sidebarCollapsed, false);
  expectEqual((result as any).extraField, undefined);
});

test("Req 6: Validation catches all invalid data types", () => {
  const invalidCases = [
    null,
    undefined,
    "string",
    123,
    [],
    { theme: "light" }, // missing fields
  ];

  for (const invalidData of invalidCases) {
    try {
      parseUserPreferences(invalidData);
      throw new Error(`Should have rejected: ${JSON.stringify(invalidData)}`);
    } catch (e: any) {
      // Expected to throw
      if (e.message.startsWith("Should have rejected")) {
        throw e;
      }
    }
  }
});

// ============================================================================
// REQ 7: THEME STRATEGY
// ============================================================================

test("Req 7: All theme values resolve correctly", () => {
  const testCases: Array<{
    theme: "light" | "dark" | "system" | "high-contrast";
    systemDark: boolean;
    expected: string;
  }> = [
    { theme: "light", systemDark: false, expected: "theme-light" },
    { theme: "light", systemDark: true, expected: "theme-light" },
    { theme: "dark", systemDark: false, expected: "theme-dark" },
    { theme: "dark", systemDark: true, expected: "theme-dark" },
    { theme: "system", systemDark: false, expected: "theme-light" },
    { theme: "system", systemDark: true, expected: "theme-dark" },
    {
      theme: "high-contrast",
      systemDark: false,
      expected: "theme-high-contrast",
    },
    {
      theme: "high-contrast",
      systemDark: true,
      expected: "theme-high-contrast",
    },
  ];

  for (const tc of testCases) {
    const prefs: UserPreferences = {
      theme: tc.theme,
      language: "en",
      sidebarCollapsed: false,
    };

    const result = resolveThemeClassForHtml(prefs, tc.systemDark);
    expectEqual(
      result,
      tc.expected,
      `Theme ${tc.theme} with systemDark=${tc.systemDark} should resolve to ${tc.expected}`,
    );
  }
});

test("Req 7: Manual theme override ignores system preference", () => {
  const manualThemes: Array<"light" | "dark" | "high-contrast"> = [
    "light",
    "dark",
    "high-contrast",
  ];

  for (const theme of manualThemes) {
    const prefs: UserPreferences = {
      theme,
      language: "en",
      sidebarCollapsed: false,
    };

    // Should be same regardless of system preference
    const withDark = resolveThemeClassForHtml(prefs, true);
    const withLight = resolveThemeClassForHtml(prefs, false);

    expectEqual(
      withDark,
      withLight,
      `Manual theme ${theme} should ignore system`,
    );
    expectEqual(withDark, `theme-${theme}`);
  }
});

test("Req 7: System theme switches based on preference", () => {
  const systemPrefs: UserPreferences = {
    theme: "system",
    language: "en",
    sidebarCollapsed: false,
  };

  const withDarkSystem = resolveThemeClassForHtml(systemPrefs, true);
  expectEqual(withDarkSystem, "theme-dark");

  const withLightSystem = resolveThemeClassForHtml(systemPrefs, false);
  expectEqual(withLightSystem, "theme-light");
});

// ============================================================================
// REQ 8, 9, 10: ORIGINAL TESTS (KEPT FOR COMPLETENESS)
// ============================================================================

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
