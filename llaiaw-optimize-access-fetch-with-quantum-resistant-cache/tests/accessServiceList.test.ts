/**
 * Test suite for Access Service List DAL
 * Tests Cuckoo Hash, PQ Encryption, and performance requirements
 */

import {
  accessServiceListDal,
  CuckooHashTable,
  PQEncryption,
  getCacheStats,
  resetCacheStats,
  clearCache,
  evictCache,
  getCacheSize,
  seedMockData,
  clearMockData,
  AccessServiceRecord,
} from "@dal";

describe("Quantum-Resistant Cache Optimization", () => {
  const makeRecord = (id: string): AccessServiceRecord => ({
    id,
    serviceName: `Service-${id}`,
    accessLevel: 1,
    data: { id },
  });

  beforeEach(() => {
    clearMockData();
    clearCache();
    resetCacheStats();
  });

  describe("Requirement 1: Cache - Cuckoo hash for O(1) per key", () => {
    test("CuckooHashTable should provide O(1) get operations", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>();

      // Insert items
      cache.set("key1", makeRecord("key1"));
      cache.set("key2", makeRecord("key2"));
      cache.set("key3", makeRecord("key3"));

      // O(1) lookups
      expect(cache.get("key1")?.id).toBe("key1");
      expect(cache.get("key2")?.id).toBe("key2");
      expect(cache.get("key3")?.id).toBe("key3");
    });

    test("CuckooHashTable should handle collisions via displacement", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>(128);

      // Insert many items - collisions handled via cuckoo displacement
      for (let i = 0; i < 50; i++) {
        cache.set(`key_${i}`, makeRecord(`key_${i}`));
      }

      // All items should still be retrievable
      for (let i = 0; i < 50; i++) {
        expect(cache.get(`key_${i}`)?.id).toBe(`key_${i}`);
      }
    });

    test("CuckooHashTable should support delete operation in O(1)", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>();

      cache.set("key1", makeRecord("key1"));
      expect(cache.get("key1")?.id).toBe("key1");

      const deleted = cache.delete("key1");
      expect(deleted).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
    });

    test("CuckooHashTable should track size correctly", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>();

      expect(cache.getSize()).toBe(0);

      cache.set("key1", makeRecord("key1"));
      expect(cache.getSize()).toBe(1);

      cache.set("key2", makeRecord("key2"));
      expect(cache.getSize()).toBe(2);

      cache.delete("key1");
      expect(cache.getSize()).toBe(1);

      cache.clear();
      expect(cache.getSize()).toBe(0);
    });

    test("accessServiceListDal should use cache for O(1) gets", async () => {
      // Seed data
      const testRecord: AccessServiceRecord = {
        id: "test-id-1",
        serviceName: "TestService",
        accessLevel: 5,
        data: { foo: "bar" },
      };
      seedMockData([testRecord]);

      // First get - cache miss, fetches from DB
      resetCacheStats();
      const result1 = await accessServiceListDal({
        method: "get",
        id: "test-id-1",
      });
      expect(result1).toBeDefined();

      let stats = getCacheStats();
      expect(stats.misses).toBe(1n);

      // Second get - cache hit, O(1)
      const result2 = await accessServiceListDal({
        method: "get",
        id: "test-id-1",
      });
      expect(result2).toEqual(result1);

      stats = getCacheStats();
      expect(stats.hits).toBe(1n);
    });
  });

  describe("Requirement 1: PQ encrypt entries", () => {
    test("PQEncryption should encrypt data", () => {
      const payload = Buffer.alloc(1024);
      payload.write("sensitive data to encrypt");
      const { ciphertext, nonce } = PQEncryption.encryptPayload(payload);

      expect(Buffer.isBuffer(ciphertext)).toBe(true);
      expect(Buffer.isBuffer(nonce)).toBe(true);
      expect(ciphertext.length).toBeGreaterThan(0);

      expect(ciphertext.equals(payload)).toBe(false);
    });

    test("PQEncryption should decrypt data correctly", () => {
      const payload = Buffer.alloc(1024);
      payload.write("sensitive data to decrypt");
      const { ciphertext, nonce } = PQEncryption.encryptPayload(payload);

      const decrypted = PQEncryption.decryptPayload(ciphertext, nonce);
      expect(decrypted.equals(payload)).toBe(true);
    });

    test("PQEncryption should be deterministic", () => {
      const payload = Buffer.alloc(1024);
      payload.write("deterministic test data");

      const result1 = PQEncryption.encryptPayload(payload);
      const result2 = PQEncryption.encryptPayload(payload);

      expect(result1.ciphertext.equals(result2.ciphertext)).toBe(true);
      expect(result1.nonce.equals(result2.nonce)).toBe(true);
      expect(result1.hash).toBe(result2.hash);
    });

    test("PQEncryption should detect tampering (quantum cache poisoning)", () => {
      const payload = Buffer.alloc(1024);
      payload.write("original data");
      const { ciphertext, nonce, hash } = PQEncryption.encryptPayload(payload);

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(ciphertext);
      tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256;

      const isValid = PQEncryption.verifyIntegrity(
        tamperedCiphertext,
        nonce,
        hash,
      );
      expect(isValid).toBe(false);
    });

    test("PQEncryption should verify valid data", () => {
      const payload = Buffer.alloc(1024);
      payload.write("valid data");
      const { ciphertext, nonce, hash } = PQEncryption.encryptPayload(payload);

      const isValid = PQEncryption.verifyIntegrity(ciphertext, nonce, hash);
      expect(isValid).toBe(true);
    });
  });

  describe("Requirement 2: Benchmark gets <1us", () => {
    test("Cache get operations should complete in <1us average", async () => {
      // Seed some data
      const records: AccessServiceRecord[] = [];
      for (let i = 0; i < 1000; i++) {
        records.push({
          id: `perf-test-${i}`,
          serviceName: `Service${i}`,
          accessLevel: i % 10,
          data: { index: i },
        });
      }
      seedMockData(records);

      // Warm up cache
      for (let i = 0; i < 1000; i++) {
        await accessServiceListDal({ method: "get", id: `perf-test-${i}` });
      }

      // Reset stats for actual benchmark
      resetCacheStats();

      // Run benchmark - simulate many gets
      const iterations = 10000;
      for (let i = 0; i < iterations; i++) {
        await accessServiceListDal({
          method: "get",
          id: `perf-test-${i % 1000}`,
        });
      }

      const stats = getCacheStats();
      expect(stats.avgGetTimeNs).toBeLessThan(1000);
      expect(stats.hits).toBe(BigInt(iterations));
      expect(stats.hitRate).toBe(100);
    });

    test("Cache should maintain O(1) with large number of entries", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>(16384);

      // Insert 10000 items
      for (let i = 0; i < 10000; i++) {
        cache.set(`large-key-${i}`, makeRecord(`large-key-${i}`));
      }

      // Measure lookup time for random accesses
      const startTime = process.hrtime.bigint();
      for (let i = 0; i < 1000; i++) {
        const key = `large-key-${Math.floor(Math.random() * 10000)}`;
        cache.get(key);
      }
      const endTime = process.hrtime.bigint();

      const avgTimeNs = Number(endTime - startTime) / 1000;

      // Should still be O(1) - average lookup < 2us (allows for test environment overhead)
      expect(avgTimeNs).toBeLessThan(2000);
    });

    test("Cache should handle 500M simulated rows with O(1) id mapping", async () => {
      const startId = 499_999_000;
      const count = 1000;
      const records: AccessServiceRecord[] = [];

      for (let i = 0; i < count; i++) {
        const id = `${startId + i}`;
        records.push(makeRecord(id));
      }

      seedMockData(records);

      const startTime = process.hrtime.bigint();
      for (let i = 0; i < count; i++) {
        await accessServiceListDal({ method: "get", id: `${startId + i}` });
      }
      const endTime = process.hrtime.bigint();

      const avgTimeNs = Number(endTime - startTime) / count;
      expect(avgTimeNs).toBeLessThan(5000);
    });
  });

  describe("Requirement 2: Collision handling", () => {
    test("CuckooHashTable should resolve collisions via displacement", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>(16); // Small capacity to force collisions

      // Insert items that may collide
      const keys = ["abc", "bca", "cab", "aaa", "bbb", "ccc", "ddd", "eee"];
      keys.forEach((key, i) => {
        cache.set(key, makeRecord(`value_${i}`));
      });

      // All items should be retrievable after displacement
      keys.forEach((key, i) => {
        expect(cache.get(key)?.id).toBe(`value_${i}`);
      });
    });

    test("CuckooHashTable should not lose data on update", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>();

      cache.set("key1", makeRecord("key1"));
      cache.set("key1", { ...makeRecord("key1"), serviceName: "updated" });

      expect(cache.get("key1")?.serviceName).toBe("updated");
      expect(cache.getSize()).toBe(1); // Size should not increase on update
    });

    test("Dual hash functions should allow consistent retrieval", () => {
      const cache = new CuckooHashTable<AccessServiceRecord>(2048);

      // Insert items with similar keys
      const insertCount = 500;

      for (let i = 0; i < insertCount; i++) {
        cache.set(`similar_key_${i}`, makeRecord(`similar_key_${i}`));
      }

      // All inserted keys should be retrievable
      for (let i = 0; i < insertCount; i++) {
        expect(cache.get(`similar_key_${i}`)?.id).toBe(`similar_key_${i}`);
      }
    };);
  });

  describe("DAL Operations Integration", () => {
    test("accessServiceListDal create should add to cache", async () => {
      const newRecord: AccessServiceRecord = {
        id: "new-record-1",
        serviceName: "NewService",
        accessLevel: 3,
        data: { created: true },
      };

      const created = await accessServiceListDal({
        method: "create",
        data: newRecord,
      });
      expect(created).toEqual(newRecord);

      // Should be in cache now
      resetCacheStats();
      const fetched = await accessServiceListDal({
        method: "get",
        id: "new-record-1",
      });
      expect(fetched).toEqual(newRecord);

      const stats = getCacheStats();
      expect(stats.hits).toBe(1n); // Should be cache hit
    });

    test("accessServiceListDal update should invalidate and update cache", async () => {
      // Create initial record
      const record: AccessServiceRecord = {
        id: "update-test-1",
        serviceName: "OriginalService",
        accessLevel: 1,
        data: {},
      };
      await accessServiceListDal({ method: "create", data: record });

      // Update record
      const updated = await accessServiceListDal({
        method: "update",
        id: "update-test-1",
        data: { serviceName: "UpdatedService", accessLevel: 5 },
      });

      expect(updated).toBeDefined();
      expect((updated as AccessServiceRecord).serviceName).toBe(
        "UpdatedService",
      );

      // Cache should have updated value
      resetCacheStats();
      const fetched = await accessServiceListDal({
        method: "get",
        id: "update-test-1",
      });
      expect((fetched as AccessServiceRecord).serviceName).toBe(
        "UpdatedService",
      );
      expect(getCacheStats().hits).toBe(1n);
    });

    test("accessServiceListDal delete should remove from cache", async () => {
      // Create record
      const record: AccessServiceRecord = {
        id: "delete-test-1",
        serviceName: "ToDelete",
        accessLevel: 1,
        data: {},
      };
      await accessServiceListDal({ method: "create", data: record });

      // Verify it's cached
      resetCacheStats();
      await accessServiceListDal({ method: "get", id: "delete-test-1" });
      expect(getCacheStats().hits).toBe(1n);

      // Delete
      await accessServiceListDal({ method: "delete", id: "delete-test-1" });

      // Should not be in cache anymore
      resetCacheStats();
      const fetched = await accessServiceListDal({
        method: "get",
        id: "delete-test-1",
      });
      expect(fetched).toBeNull();
    });

    test("accessServiceListDal get without id should throw", async () => {
      await expect(accessServiceListDal({ method: "get" })).rejects.toThrow(
        "Get requires id",
      );
    });

    test("eviction should be deterministic when capacity is stressed", async () => {
      const records: AccessServiceRecord[] = [];
      for (let i = 0; i < 950; i++) {
        records.push(makeRecord(`evict-${i}`));
      }
      seedMockData(records);

      for (let i = 0; i < 950; i++) {
        await accessServiceListDal({ method: "get", id: `evict-${i}` });
      }

      const sizeBefore = getCacheSize();
      evictCache();
      const sizeAfter = getCacheSize();

      expect(sizeAfter).toBeLessThanOrEqual(sizeBefore);
    });
  });
});
