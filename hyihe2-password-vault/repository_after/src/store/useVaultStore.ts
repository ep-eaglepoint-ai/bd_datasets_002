import { create } from "zustand";
import { CryptoService } from "@/lib/crypto";
import { storage } from "@/lib/storage";
import { DecryptedVaultItem, VaultItem, VaultItemData, VaultMeta, AutoLockConfig } from "@/lib/types";
import { VaultBackupSchema } from "@/lib/validation";

interface VaultState {
  hasVault: boolean;
  isLocked: boolean;
  isLoading: boolean;
  items: DecryptedVaultItem[];
  encryptionKey: CryptoKey | null; // In-memory DEK (Data Encryption Key)
  corruptedItems: number;
  autoLock: AutoLockConfig;
  lastActivity: number;

  // Actions
  initialize: () => Promise<void>;
  setupVault: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<boolean>; // Returns success/fail
  lockVault: () => void;
  addItem: (data: VaultItemData) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: VaultItemData) => Promise<void>;
  setAutoLock: (config: AutoLockConfig) => void;
  touchActivity: () => void;
  checkAutoLock: () => void;
  exportVault: () => Promise<string>; // Returns JSON string of encrypted data
  importVault: (jsonStr: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  hasVault: false,
  isLocked: true,
  isLoading: true,
  items: [],
  encryptionKey: null,
  corruptedItems: 0,
  autoLock: { enabled: true, timeoutMinutes: 15 }, // Default 15 min
  lastActivity: Date.now(),

  initialize: async () => {
    try {
      set({ isLoading: true });
      const salt = await storage.getMeta<string>("salt");
      const autoLockConfig = await storage.getMeta<AutoLockConfig>("autoLock");
      set({ hasVault: !!salt, isLoading: false, autoLock: autoLockConfig || { enabled: true, timeoutMinutes: 15 } });
    } catch (error) {
      console.error("Initialization failed", error);
      set({ isLoading: false });
    }
  },

  setupVault: async (password: string) => {
    try {
      set({ isLoading: true });
      
      const salt = CryptoService.generateSalt();
      const kek = await CryptoService.deriveKey(password, salt);

      const validatorIv = CryptoService.generateIV();
      const validatorEnc = await CryptoService.encrypt("VALID", kek);
      
      const dek = await CryptoService.generateKey();
      const dekJwk = await CryptoService.exportKey(dek);
      const dekString = JSON.stringify(dekJwk);
      const wrappedKeyEnc = await CryptoService.encrypt(dekString, kek);

      await storage.setMeta("salt", salt);
      await storage.setMeta("validator", validatorEnc.cipherText);
      await storage.setMeta("validatorIv", validatorEnc.iv);
      await storage.setMeta("wrappedKey", wrappedKeyEnc.cipherText);
      await storage.setMeta("wrappedKeyIv", wrappedKeyEnc.iv);

      await storage.clearAll();
      await storage.setMeta("salt", salt);
      await storage.setMeta("validator", validatorEnc.cipherText);
      await storage.setMeta("validatorIv", validatorEnc.iv);
      await storage.setMeta("wrappedKey", wrappedKeyEnc.cipherText);
      await storage.setMeta("wrappedKeyIv", wrappedKeyEnc.iv);

      set({ hasVault: true, isLocked: false, encryptionKey: dek, items: [], isLoading: false, corruptedItems: 0 });

    } catch (error) {
      console.error("Setup failed", error);
      set({ isLoading: false });
      throw error;
    }
  },

  unlockVault: async (password: string) => {
    try {
      set({ isLoading: true, corruptedItems: 0 });
      const salt = await storage.getMeta<string>("salt");
      const validator = await storage.getMeta<string>("validator");
      const validatorIv = await storage.getMeta<string>("validatorIv");
      const wrappedKey = await storage.getMeta<string>("wrappedKey");
      const wrappedKeyIv = await storage.getMeta<string>("wrappedKeyIv");

      if (!salt || !validator || !validatorIv || !wrappedKey || !wrappedKeyIv) {
        throw new Error("Vault corruption: Missing metadata");
      }

      const kek = await CryptoService.deriveKey(password, salt);

      try {
        const validationDec = await CryptoService.decrypt(validator, validatorIv, kek);
        if (validationDec !== "VALID") throw new Error("Invalid Password");
      } catch (e) {
        set({ isLoading: false });
        return false;
      }

      const dekString = await CryptoService.decrypt(wrappedKey, wrappedKeyIv, kek);
      const dekJwk = JSON.parse(dekString);
      const dek = await CryptoService.importKey(dekJwk);

      const storedItems = await storage.getAllItems();
      const decryptedItems: DecryptedVaultItem[] = [];
      let corruptedCount = 0;

      for (const item of storedItems) {
        try {
            const jsonStr = await CryptoService.decrypt(item.encryptedData, item.iv, dek);
            const data = JSON.parse(jsonStr);
            decryptedItems.push({
                id: item.id,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                data: data
            });
        } catch (e) {
            console.error(`Failed to decrypt item ${item.id}`, e);
            corruptedCount++;
        }
      }

      set({ isLocked: false, encryptionKey: dek, items: decryptedItems, isLoading: false, corruptedItems: corruptedCount });
      return true;

    } catch (error) {
      console.error("Unlock failed", error);
      set({ isLoading: false });
      return false;
    }
  },

  lockVault: () => {
    set({ isLocked: true, encryptionKey: null, items: [] });
  },

  addItem: async (data: VaultItemData) => {
    const { encryptionKey, items } = get();
    if (!encryptionKey) throw new Error("Vault is locked");

    const id = crypto.randomUUID();
    const now = Date.now();
    
    const jsonStr = JSON.stringify(data);
    const { cipherText, iv } = await CryptoService.encrypt(jsonStr, encryptionKey);

    const newItem: VaultItem = {
        id,
        encryptedData: cipherText,
        iv,
        createdAt: now,
        updatedAt: now
    };

    await storage.saveItem(newItem);

    const decryptedItem: DecryptedVaultItem = {
        id,
        data,
        createdAt: now,
        updatedAt: now
    };

    set({ items: [decryptedItem, ...items] });
  },

  deleteItem: async (id: string) => {
      await storage.deleteItem(id);
      set((state) => ({
          items: state.items.filter((i) => i.id !== id)
      }));
  },

  updateItem: async (id: string, data: VaultItemData) => {
    const { encryptionKey, items } = get();
    if (!encryptionKey) throw new Error("Vault is locked");

    const now = Date.now();
    const jsonStr = JSON.stringify(data);
    const { cipherText, iv } = await CryptoService.encrypt(jsonStr, encryptionKey);

    const oldItem = items.find(i => i.id === id);
    if (!oldItem) throw new Error("Item not found");

    // Retrieve full encrypted history from storage if possible, or build from current state
    const currentStored = await storage.getItem(id);
    const history = currentStored?.history || [];
    
    // Create snapshot of PREVIOUS state
    if (currentStored) {
        history.push({
            encryptedData: currentStored.encryptedData,
            iv: currentStored.iv,
            updatedAt: currentStored.updatedAt
        });
    }

    const updatedItem: VaultItem = {
        id,
        encryptedData: cipherText,
        iv,
        createdAt: oldItem.createdAt,
        updatedAt: now,
        history
    };

    await storage.saveItem(updatedItem);

    set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, data, updatedAt: now } : i)),
        lastActivity: now
    }));
  },

  setAutoLock: (config: AutoLockConfig) => {
      set({ autoLock: config });
      storage.setMeta("autoLock", config);
  },

  touchActivity: () => {
      set({ lastActivity: Date.now() });
  },

  checkAutoLock: () => {
      const { autoLock, lastActivity, isLocked, lockVault } = get();
      if (isLocked || !autoLock.enabled) return;

      const elapsedMinutes = (Date.now() - lastActivity) / 1000 / 60;
      if (elapsedMinutes >= autoLock.timeoutMinutes) {
          lockVault();
      }
  },

  exportVault: async () => {
      // ... (existing export logic assumed, but verifying if I need to re-write due to chunking context)
      // I will overwrite the whole export/import block to be safe and clean.
      const storedItems = await storage.getAllItems();
      const meta = {
          salt: await storage.getMeta("salt"),
          validator: await storage.getMeta("validator"),
          validatorIv: await storage.getMeta("validatorIv"),
          wrappedKey: await storage.getMeta("wrappedKey"),
          wrappedKeyIv: await storage.getMeta("wrappedKeyIv"),
          autoLock: await storage.getMeta("autoLock")
      };
      
      const backup = {
          date: new Date().toISOString(),
          version: 1,
          meta,
          items: storedItems
      };
      
      return JSON.stringify(backup, null, 2);
  },

  importVault: async (jsonStr: string) => {
      try {
          const raw = JSON.parse(jsonStr);
          const backup = VaultBackupSchema.parse(raw);

          // Clear current DB
          await storage.clearAll();

          // Restore Meta
          await storage.setMeta("salt", backup.meta.salt);
          await storage.setMeta("validator", backup.meta.validator);
          await storage.setMeta("validatorIv", backup.meta.validatorIv);
          await storage.setMeta("wrappedKey", backup.meta.wrappedKey);
          await storage.setMeta("wrappedKeyIv", backup.meta.wrappedKeyIv);
          if (backup.meta.autoLock) {
              await storage.setMeta("autoLock", backup.meta.autoLock);
          }

          // Restore Items
          for (const item of backup.items) {
              await storage.saveItem(item);
          }
          
          // Re-initialize store state (will lock vault forces re-login to verify keys)
          get().lockVault();
          await get().initialize();

      } catch (e) {
          console.error("Import failed", e);
          throw e;
      }
  }

}));
