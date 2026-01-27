import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
  type UserPreferences,
} from "./userPreferences.schema";

export const PREFERENCES_COOKIE_NAME = "user_prefs";

export interface ParsedCookieResult {
  preferences: UserPreferences;
  /**
   * Indicates that the existing cookie value was invalid/corrupted and
   * should be cleared from the client.
   */
  shouldClearCookie: boolean;
}

/**
 * Parse a standard Cookie header string and extract the serialized
 * UserPreferences object if present.
 */
export function parsePreferencesFromCookieHeader(
  cookieHeader: string | undefined,
): ParsedCookieResult {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearCookie: false };
  }

  const pairs = cookieHeader.split(";").map((part) => part.trim());
  const map: Record<string, string> = {};
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split("=");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    map[key] = value;
  }

  const raw = map[PREFERENCES_COOKIE_NAME];
  if (!raw) {
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearCookie: false };
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsedJson = JSON.parse(decoded);
    const prefs = parseUserPreferences(parsedJson);
    return { preferences: prefs, shouldClearCookie: false };
  } catch (error) {
    console.error(
      "[user-preferences] Failed to parse preferences cookie, resetting to defaults",
      error,
    );
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearCookie: true };
  }
}

/**
 * Serialize preferences into a cookie value suitable for a `Set-Cookie` header.
 * The caller can add attributes such as Path/Max-Age/SameSite.
 */
export function serializePreferencesCookieValue(
  preferences: UserPreferences,
): string {
  const json = JSON.stringify(preferences);
  const encoded = encodeURIComponent(json);
  return `${PREFERENCES_COOKIE_NAME}=${encoded}`;
}

