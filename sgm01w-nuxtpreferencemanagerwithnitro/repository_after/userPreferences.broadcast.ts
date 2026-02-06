import type { UserPreferences } from "./userPreferences.schema";

type Listener = (prefs: UserPreferences) => void;

/**
 * Cross-tab communication abstraction.
 *
 * In a real browser environment this will prefer BroadcastChannel, with a
 * local in-memory fallback (sufficient for our unit tests which run in Node).
 */
class InMemoryChannel {
  private listeners = new Set<Listener>();

  postMessage(prefs: UserPreferences) {
    for (const listener of Array.from(this.listeners)) {
      listener(prefs);
    }
  }

  addEventListener(listener: Listener) {
    this.listeners.add(listener);
  }

  removeEventListener(listener: Listener) {
    this.listeners.delete(listener);
  }
}

let sharedInMemoryChannel: InMemoryChannel | null = null;

function getOrCreateInMemoryChannel(): InMemoryChannel {
  if (!sharedInMemoryChannel) {
    sharedInMemoryChannel = new InMemoryChannel();
  }
  return sharedInMemoryChannel;
}

export interface PreferenceBroadcastHandle {
  broadcast(prefs: UserPreferences): void;
  subscribe(listener: Listener): () => void;
}

export function createPreferenceBroadcastChannel(
  channelName = "user-preferences",
): PreferenceBroadcastHandle {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const bc = new (window as any).BroadcastChannel(channelName);
    const listeners = new Set<Listener>();

    bc.onmessage = (event: MessageEvent) => {
      const prefs = event.data as UserPreferences;
      for (const listener of Array.from(listeners)) {
        listener(prefs);
      }
    };

    return {
      broadcast(prefs: UserPreferences) {
        bc.postMessage(prefs);
      },
      subscribe(listener: Listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  // Fallback for tests / non-browser environments
  const channel = getOrCreateInMemoryChannel();

  return {
    broadcast(prefs: UserPreferences) {
      channel.postMessage(prefs);
    },
    subscribe(listener: Listener) {
      channel.addEventListener(listener);
      return () => channel.removeEventListener(listener);
    },
  };
}

