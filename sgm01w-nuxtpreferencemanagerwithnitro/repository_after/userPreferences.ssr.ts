import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
  type UserPreferences,
} from "./userPreferences.schema";
import { parsePreferencesFromCookieHeader } from "./userPreferences.cookie";
import { resolveThemeClassForHtml } from "./userPreferences.theme";

export interface SSRUserPreferencesResult {
  preferences: UserPreferences;
  htmlAttrs: { class: string };
  shouldClearCookie: boolean;
}

/**
 * Core SSR initialization logic that a Nuxt plugin or Nitro middleware can call.
 *
 * In a real Nuxt 3 project this would typically be used inside a
 * `defineNuxtPlugin` or `defineEventHandler` function to:
 * - read the Cookie header from the incoming request
 * - inject the theme class into the <html> tag to avoid FOUC
 * - expose the validated preferences to the app payload.
 */
export function initUserPreferencesFromCookie(
  cookieHeader: string | undefined,
  systemPrefersDark: boolean,
): SSRUserPreferencesResult {
  if (!cookieHeader) {
    const htmlClass = resolveThemeClassForHtml(
      DEFAULT_USER_PREFERENCES,
      systemPrefersDark,
    );
    return {
      preferences: DEFAULT_USER_PREFERENCES,
      htmlAttrs: { class: htmlClass },
      shouldClearCookie: false,
    };
  }

  const { preferences, shouldClearCookie } =
    parsePreferencesFromCookieHeader(cookieHeader);
  const htmlClass = resolveThemeClassForHtml(preferences, systemPrefersDark);

  // Re-validate for extra safety; parsePreferencesFromCookieHeader already does this,
  // but this double check makes it explicit for the SSR path.
  const safe = parseUserPreferences(preferences);

  return {
    preferences: safe,
    htmlAttrs: { class: htmlClass },
    shouldClearCookie,
  };
}

