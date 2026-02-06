import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "./userPreferences.schema";
import {
  loadPreferencesFromLocalStorage,
  savePreferencesToLocalStorage,
  clearPreferencesFromLocalStorage,
} from "./userPreferences.localStorage";
import {
  createPreferenceBroadcastChannel,
  type PreferenceBroadcastHandle,
} from "./userPreferences.broadcast";
import { syncUserPreferencesHandler } from "./nitro.settingsSync";

export type SyncStatus = "idle" | "syncing" | "queued" | "error";

export interface UserPreferencesState {
  preferences: UserPreferences;
  syncStatus: SyncStatus;
}

export interface UseUserPreferencesOptions {
  /**
   * Optional initial value, typically used on the server or during hydration.
   */
  initialPreferences?: UserPreferences;
  /**
   * Pluggable sync function, to allow tests to spy on network calls.
   * Defaults to the in-memory Nitro handler.
   */
  syncFn?: (prefs: UserPreferences) => Promise<void>;
}

type StateListener = (state: UserPreferencesState) => void;

let globalState: UserPreferencesState | null = null;
let listeners = new Set<StateListener>();
let broadcastHandle: PreferenceBroadcastHandle | null = null;
let pendingQueue: UserPreferences[] = [];

function getInitialState(options?: UseUserPreferencesOptions): UserPreferences {
  if (options?.initialPreferences) {
    return options.initialPreferences;
  }

  // Client-side: prefer localStorage
  const fromStorage = loadPreferencesFromLocalStorage();
  if (fromStorage.shouldClearStorage) {
    clearPreferencesFromLocalStorage();
  }
  return fromStorage.preferences;
}

function ensureStateInitialized(options?: UseUserPreferencesOptions): void {
  if (globalState) return;
  const basePrefs = getInitialState(options);
  globalState = {
    preferences: basePrefs,
    syncStatus: "idle",
  };
  broadcastHandle = createPreferenceBroadcastChannel();

  // Listen for external updates (other tabs)
  broadcastHandle.subscribe((prefs) => {
    if (!globalState) return;
    globalState = { ...globalState, preferences: prefs };
    savePreferencesToLocalStorage(prefs);
    notify();
  });
}

function notify() {
  if (!globalState) return;
  for (const listener of Array.from(listeners)) {
    listener(globalState);
  }
}

async function defaultSyncFn(prefs: UserPreferences): Promise<void> {
  await syncUserPreferencesHandler({ preferences: prefs });
}

async function attemptSync(
  prefs: UserPreferences,
  syncFn: (prefs: UserPreferences) => Promise<void>,
) {
  if (!globalState) return;
  globalState = { ...globalState, syncStatus: "syncing" };
  notify();
  try {
    await syncFn(prefs);
    if (!globalState) return;
    globalState = { ...globalState, syncStatus: "idle" };
    notify();

    // Try flushing any queued updates
    if (pendingQueue.length > 0) {
      const next = pendingQueue[pendingQueue.length - 1]; // keep newest
      pendingQueue = [];
      await attemptSync(next, syncFn);
    }
  } catch (error) {
    console.error("[user-preferences] Failed to sync with server", error);
    if (!globalState) return;
    pendingQueue.push(prefs);
    globalState = { ...globalState, syncStatus: "queued" };
    notify();
  }
}

export function useUserPreferences(options?: UseUserPreferencesOptions) {
  ensureStateInitialized(options);
  const syncFunction = options?.syncFn ?? defaultSyncFn;

  function getState(): UserPreferencesState {
    if (!globalState) {
      return {
        preferences: DEFAULT_USER_PREFERENCES,
        syncStatus: "idle",
      };
    }
    return globalState;
  }

  function subscribe(listener: StateListener): () => void {
    listeners.add(listener);
    if (globalState) {
      listener(globalState);
    }
    return () => {
      listeners.delete(listener);
    };
  }

  function updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) {
    if (!globalState) {
      ensureStateInitialized(options);
    }
    if (!globalState) return;

    const next: UserPreferences = {
      ...globalState.preferences,
      [key]: value,
    };

    globalState = {
      ...globalState,
      preferences: next,
    };

    // Optimistic UI update
    savePreferencesToLocalStorage(next);
    if (broadcastHandle) {
      broadcastHandle.broadcast(next);
    }
    notify();

    // Fire-and-forget sync; failures queue the update
    void attemptSync(next, syncFunction);
  }

  async function flushQueue() {
    if (!globalState || pendingQueue.length === 0) return;
    const last = pendingQueue[pendingQueue.length - 1];
    pendingQueue = [];
    await attemptSync(last, syncFunction);
  }

  return {
    getState,
    subscribe,
    updatePreference,
    flushQueue,
  };
}

