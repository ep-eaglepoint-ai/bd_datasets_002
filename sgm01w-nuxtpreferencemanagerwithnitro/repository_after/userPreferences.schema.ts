import { z } from "./zodLike";

export const THEME_VALUES = ["light", "dark", "system", "high-contrast"] as const;

export type Theme = (typeof THEME_VALUES)[number];

export interface UserPreferences {
  theme: Theme;
  language: string;
  sidebarCollapsed: boolean;
}

export const UserPreferencesSchema = z.object({
  theme: z.enum(THEME_VALUES),
  language: z.string(),
  sidebarCollapsed: z.boolean(),
});

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  sidebarCollapsed: false,
};

/**
 * Validate and normalize arbitrary data into a strongly typed UserPreferences object.
 * Throws on invalid input.
 */
export function parseUserPreferences(data: unknown): UserPreferences {
  return UserPreferencesSchema.parse(data);
}

