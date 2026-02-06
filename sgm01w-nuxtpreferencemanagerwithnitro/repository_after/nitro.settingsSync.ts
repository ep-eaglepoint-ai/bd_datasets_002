import {
  UserPreferencesSchema,
  type UserPreferences,
} from "./userPreferences.schema";

/**
 * Very small in-memory "database" used for this kata.
 * In a real system this would be replaced with a proper persistence layer.
 */
let inMemoryPreferencesStore: UserPreferences | null = null;

export function getStoredPreferences(): UserPreferences | null {
  return inMemoryPreferencesStore;
}

export interface SyncRequestBody {
  preferences: unknown;
}

export interface SyncResponseBody {
  ok: boolean;
  preferences: UserPreferences;
}

/**
 * Nitro-style handler for POST /api/settings/sync
 *
 * For simplicity we model it as a plain function that accepts an arbitrary body
 * and returns a promise with the validated response payload.
 */
export async function syncUserPreferencesHandler(
  body: SyncRequestBody,
): Promise<SyncResponseBody> {
  const parsed = UserPreferencesSchema.parse(body.preferences);
  inMemoryPreferencesStore = parsed;
  return {
    ok: true,
    preferences: parsed,
  };
}

