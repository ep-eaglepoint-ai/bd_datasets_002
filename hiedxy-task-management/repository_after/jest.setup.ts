import "@testing-library/jest-dom";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { TextEncoder, TextDecoder } from "util";

Object.assign(global, { TextDecoder, TextEncoder });

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

const crypto = require("crypto");
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => crypto.randomUUID(),
  },
});

if (typeof global.structuredClone === "undefined") {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Mock idb
jest.mock("idb", () => {
  return {
    openDB: async (name: string, version: number, { upgrade }: any = {}) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);

        request.onupgradeneeded = (event: any) => {
          if (upgrade) {
            upgrade(
              request.result,
              event.oldVersion,
              event.newVersion,
              request.transaction,
              event,
            );
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          resolve(wrapIDB(db));
        };

        request.onerror = () => reject(request.error);
      });
    },
  };
});

function wrapIDB(db: any) {
  return {
    getAll: (store: string) =>
      promisify(db.transaction(store).objectStore(store).getAll()),
    get: (store: string, key: any) =>
      promisify(db.transaction(store).objectStore(store).get(key)),
    put: (store: string, val: any) =>
      promisify(db.transaction(store, "readwrite").objectStore(store).put(val)),
    delete: (store: string, key: any) =>
      promisify(
        db.transaction(store, "readwrite").objectStore(store).delete(key),
      ),
    getAllFromIndex: (store: string, index: string, key: any) =>
      promisify(
        db.transaction(store).objectStore(store).index(index).getAll(key),
      ),
    clear: (store: string) =>
      promisify(db.transaction(store, "readwrite").objectStore(store).clear()),
    close: () => db.close(),
  };
}

function promisify(request: any) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
