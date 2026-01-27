import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
  type UserPreferences,
} from "./userPreferences.schema";

const LOCAL_STORAGE_KEY = "user_preferences";

export interface LocalStorageLoadResult {
  preferences: UserPreferences;
  shouldClearStorage: boolean;
}

function getLocalStorageSafe(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    if (!window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPreferencesFromLocalStorage(): LocalStorageLoadResult {
  const storage = getLocalStorageSafe();
  if (!storage) {
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearStorage: false };
  }

  const raw = storage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearStorage: false };
  }

  try {
    const parsedJson = JSON.parse(raw);
    const prefs = parseUserPreferences(parsedJson);
    return { preferences: prefs, shouldClearStorage: false };
  } catch (error) {
    console.error(
      "[user-preferences] Failed to parse localStorage value, resetting to defaults",
      error,
    );
    return { preferences: DEFAULT_USER_PREFERENCES, shouldClearStorage: true };
  }
}

export function savePreferencesToLocalStorage(prefs: UserPreferences): void {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  try {
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("[user-preferences] Failed to save to localStorage", error);
  }
}

export function clearPreferencesFromLocalStorage(): void {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  try {
    storage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error("[user-preferences] Failed to clear localStorage", error);
  }
}

