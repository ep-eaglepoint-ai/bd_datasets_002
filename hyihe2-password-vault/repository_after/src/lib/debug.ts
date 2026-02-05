import { storage } from "./storage";
import { CryptoService } from "./crypto";
import { VaultItem } from "./types";

export class DebugService {
  /**
   * Generates N dummy credentials to stress test the vault.
   */
  static async seedVault(count: number, encryptionKey: CryptoKey) {
    console.time(`Seeding ${count} items`);
    const items: VaultItem[] = [];
    
    // Batch generation
    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const data = {
        title: `Test Credential ${i}`,
        username: `user${i}@example.com`,
        password: `CorrectHorseBatteryStaple${i}`,
        url: `https://example${i}.com`,
        notes: "Generated for stress testing",
        tags: ["test", "stress", i % 2 === 0 ? "even" : "odd"],
        category: "Login"
      };
      
      const jsonStr = JSON.stringify(data);
      const { cipherText, iv } = await CryptoService.encrypt(jsonStr, encryptionKey);
      
      items.push({
        id,
        encryptedData: cipherText,
        iv,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Save in chunks of 50 to avoid IDB freeze if possible, but IDB is fast.
      // Let's just sequential await roughly or Promise.all in batches.
      if (items.length >= 50) {
          await Promise.all(items.map(item => storage.saveItem(item)));
          items.length = 0;
      }
    }
    
    if (items.length > 0) {
        await Promise.all(items.map(item => storage.saveItem(item)));
    }
    console.timeEnd(`Seeding ${count} items`);
  }

  /**
   * Corrupts a random item in the vault to test error handling.
   */
  static async corruptRandomItem() {
    const items = await storage.getAllItems();
    if (items.length === 0) return;
    
    const randomItem = items[Math.floor(Math.random() * items.length)];
    // Corrupt the data
    randomItem.encryptedData = "CORRUPTED_DATA_STRING";
    await storage.saveItem(randomItem);
    console.log(`Corrupted item ${randomItem.id}`);
  }
}
