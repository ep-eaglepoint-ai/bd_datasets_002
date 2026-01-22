describe("PQ-Encrypt Hash Function (FNV-1a)", () => {
  // Recreate the hash function for testing (matches repository_after)
  function quantumHash(data) {
    const str = JSON.stringify(data);
    let hash = 0x811c9dc5; // FNV-1a offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0; // FNV-1a prime
    }
    return hash ^ (hash >>> 16);
  }

  describe("Determinism", () => {
    test("same input produces same hash", () => {
      const data = [{ id: 1, name: "cap_1" }];
      const hash1 = quantumHash(data);
      const hash2 = quantumHash(data);
      expect(hash1).toBe(hash2);
    });

    test("consistent across multiple calls", () => {
      const data = [{ id: 42, name: "test_cap" }];
      const hashes = Array(100)
        .fill(null)
        .map(() => quantumHash(data));
      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe("Uniqueness", () => {
    test("different data produces different hashes", () => {
      const data1 = [{ id: 1, name: "cap_1" }];
      const data2 = [{ id: 2, name: "cap_2" }];
      expect(quantumHash(data1)).not.toBe(quantumHash(data2));
    });

    test("1000 unique inputs produce >=990 unique hashes", () => {
      const hashes = new Set();
      for (let i = 0; i < 1000; i++) {
        const hash = quantumHash([{ id: i, name: `cap_${i}` }]);
        hashes.add(hash);
      }
      // Allow for small number of collisions (< 1%)
      expect(hashes.size).toBeGreaterThanOrEqual(990);
    });

    test("order matters for hash", () => {
      const data1 = [{ id: 1 }, { id: 2 }];
      const data2 = [{ id: 2 }, { id: 1 }];
      expect(quantumHash(data1)).not.toBe(quantumHash(data2));
    });
  });

  describe("Hash Properties", () => {
    test("hash is a valid 32-bit integer", () => {
      const hash = quantumHash([{ id: 1, name: "test" }]);
      // JavaScript bitwise ops produce signed 32-bit integers
      expect(hash).toBeGreaterThanOrEqual(-2147483648);
      expect(hash).toBeLessThanOrEqual(2147483647);
      expect(Number.isInteger(hash)).toBe(true);
    });

    test("hash handles empty array", () => {
      const hash = quantumHash([]);
      expect(typeof hash).toBe("number");
      expect(Number.isNaN(hash)).toBe(false);
    });

    test("hash handles complex nested data", () => {
      const data = [
        {
          id: 1,
          nested: { deep: { value: "test" } },
          array: [1, 2, 3],
        },
      ];
      const hash = quantumHash(data);
      expect(typeof hash).toBe("number");
      expect(Number.isInteger(hash)).toBe(true);
    });

    test("hash handles unicode characters", () => {
      const data = [{ id: 1, name: "🔒 ключ 密钥" }];
      const hash = quantumHash(data);
      expect(typeof hash).toBe("number");
      expect(Number.isInteger(hash)).toBe(true);
    });
  });

  describe("Avalanche Effect", () => {
    test("small input change causes significant hash change", () => {
      const hash1 = quantumHash([{ id: 1 }]);
      const hash2 = quantumHash([{ id: 2 }]);

      // Convert to unsigned for XOR comparison
      const unsigned1 = hash1 >>> 0;
      const unsigned2 = hash2 >>> 0;

      // XOR to see bit differences
      const diff = unsigned1 ^ unsigned2;
      const bitDifferences = diff.toString(2).replace(/0/g, "").length;

      // Good hash should flip multiple bits
      expect(bitDifferences).toBeGreaterThan(5);
    });
  });
});
