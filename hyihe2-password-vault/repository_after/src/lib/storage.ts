import { openDB, DBSchema, IDBPDatabase } from "idb";
import { VaultItem, VaultMeta } from "./types";

interface VaultDB extends DBSchema {
  meta: {
    key: string;
    value: VaultMeta[keyof VaultMeta] | string; // Store individual meta fields or a whole object?
                                                // Simplified: Store keys as 'salt', 'validator', etc.
  };
  items: {
    key: string;
    value: VaultItem;
  };
}

const DB_NAME = "secure-vault-db";
const DB_VERSION = 1;

export class StorageService {
  private _dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

  private get dbPromise(): Promise<IDBPDatabase<VaultDB>> {
    if (!this._dbPromise) {
        if (typeof window === "undefined") {
            // Return a never-resolving promise or reject? 
            // Rejecting is better so we see errors if server tries to access DB
            return Promise.reject("IndexedDB is not available on server");
        }
        this._dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("meta")) {
                    db.createObjectStore("meta");
                }
                if (!db.objectStoreNames.contains("items")) {
                    db.createObjectStore("items", { keyPath: "id" });
                }
            },
        });
    }
    return this._dbPromise;
  }

  async setMeta(key: string, value: any) {
    return (await this.dbPromise).put("meta", value, key);
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return (await this.dbPromise).get("meta", key) as Promise<T | undefined>;
  }

  async saveItem(item: VaultItem) {
    return (await this.dbPromise).put("items", item);
  }

  async getItem(id: string) {
    return (await this.dbPromise).get("items", id);
  }

  async getAllItems(): Promise<VaultItem[]> {
    return (await this.dbPromise).getAll("items");
  }

  async deleteItem(id: string) {
    return (await this.dbPromise).delete("items", id);
  }

  async clearAll() {
      const db = await this.dbPromise;
      await db.clear("items");
      await db.clear("meta");
  }
}

export const storage = new StorageService();
