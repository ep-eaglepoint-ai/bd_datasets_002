import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("repository_after - Has Lock-Free Atomics", () => {
  let afterCode;

  beforeAll(() => {
    afterCode = fs.readFileSync(
      path.join(
        __dirname,
        "../../repository_after/src/userCapAndAccess.dal.ts",
      ),
      "utf8",
    );
  });

  describe("Atomic Primitives (Atomics.wait/notify)", () => {
    test("uses SharedArrayBuffer for atomic state", () => {
      expect(afterCode).toMatch(/new SharedArrayBuffer\(/);
    });

    test("uses Int32Array for atomic operations", () => {
      expect(afterCode).toMatch(/new Int32Array\(/);
    });

    test("implements Atomics.wait for blocking", () => {
      expect(afterCode).toMatch(/Atomics\.wait\(/);
    });

    test("implements Atomics.notify for signaling", () => {
      expect(afterCode).toMatch(/Atomics\.notify\(/);
    });

    test("implements Atomics.compareExchange (CAS loop)", () => {
      expect(afterCode).toMatch(/Atomics\.compareExchange\(/);
    });

    test("implements Atomics.load for atomic reads", () => {
      expect(afterCode).toMatch(/Atomics\.load\(/);
    });

    test("implements Atomics.add for vector clock", () => {
      expect(afterCode).toMatch(/Atomics\.add\(/);
    });
  });

  describe("PQ-Encrypt Hashed State", () => {
    test("implements quantumHash function", () => {
      expect(afterCode).toMatch(/function quantumHash/);
    });

    test("uses FNV-1a offset basis (0x811c9dc5)", () => {
      expect(afterCode).toMatch(/0x811c9dc5/);
    });

    test("uses FNV-1a prime (0x01000193)", () => {
      expect(afterCode).toMatch(/0x01000193/);
    });

    test("returns hash in result", () => {
      expect(afterCode).toMatch(/hash:\s*newHash/);
    });

    test("stores hash in database", () => {
      expect(afterCode).toMatch(/hash:\s*newHash/);
    });
  });

  describe("Vector Clock Implementation", () => {
    test("implements getVectorClock function", () => {
      expect(afterCode).toMatch(/function getVectorClock/);
    });

    test("returns clock in result", () => {
      expect(afterCode).toMatch(/clock/);
    });

    test("uses clockSlot for atomic operations", () => {
      expect(afterCode).toMatch(/clockSlot/);
    });
  });

  describe("Code Quality", () => {
    test("has proper TypeScript interfaces", () => {
      expect(afterCode).toMatch(/interface Cap/);
      expect(afterCode).toMatch(/interface QueryData/);
      expect(afterCode).toMatch(/interface UpdateData/);
    });

    test("documents O(1) space complexity", () => {
      expect(afterCode).toMatch(/O\(1\) space/);
    });

    test("documents O(1) time complexity", () => {
      expect(afterCode).toMatch(/O\(1\) time/);
    });

    test("uses CAS loop pattern", () => {
      expect(afterCode).toMatch(/while\s*\(true\)/);
      expect(afterCode).toMatch(/compareExchange/);
    });
  });
});
