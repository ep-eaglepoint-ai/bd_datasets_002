import type { Theme, UserPreferences } from "./userPreferences.schema";

export type ResolvedTheme = "light" | "dark" | "high-contrast";

export function resolveTheme(
  preferences: UserPreferences,
  systemPrefersDark: boolean,
): ResolvedTheme {
  const theme = preferences.theme;
  if (theme === "light" || theme === "dark" || theme === "high-contrast") {
    return theme;
  }
  // theme === "system"
  return systemPrefersDark ? "dark" : "light";
}

export function themeToHtmlClass(resolvedTheme: ResolvedTheme): string {
  switch (resolvedTheme) {
    case "dark":
      return "theme-dark";
    case "high-contrast":
      return "theme-high-contrast";
    case "light":
    default:
      return "theme-light";
  }
}

export function resolveThemeClassForHtml(
  preferences: UserPreferences,
  systemPrefersDark: boolean,
): string {
  return themeToHtmlClass(resolveTheme(preferences, systemPrefersDark));
}

