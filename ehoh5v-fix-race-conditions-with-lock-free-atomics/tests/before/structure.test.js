import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("repository_before - Lock-Free Atomics Requirements", () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, "../../repository_before/userCapAndAccess.dal.ts"),
      "utf8",
    );
  });

  describe("Required: Atomic Primitives (Atomics.wait/notify)", () => {
    test("MUST use SharedArrayBuffer for atomic state", () => {
      expect(code).toMatch(/SharedArrayBuffer/);
    });

    test("MUST use Int32Array for atomic operations", () => {
      expect(code).toMatch(/new Int32Array\(/);
    });

    test("MUST implement Atomics.wait for blocking", () => {
      expect(code).toMatch(/Atomics\.wait\(/);
    });

    test("MUST implement Atomics.notify for signaling", () => {
      expect(code).toMatch(/Atomics\.notify\(/);
    });

    test("MUST implement Atomics.compareExchange (CAS loop)", () => {
      expect(code).toMatch(/Atomics\.compareExchange\(/);
    });

    test("MUST implement Atomics.load for atomic reads", () => {
      expect(code).toMatch(/Atomics\.load\(/);
    });

    test("MUST implement Atomics.add for vector clock", () => {
      expect(code).toMatch(/Atomics\.add\(/);
    });
  });

  describe("Required: PQ-Encrypt Hashed State", () => {
    test("MUST implement hash function", () => {
      expect(code).toMatch(/quantumHash|function.*hash/i);
    });

    test("MUST use FNV-1a offset basis (0x811c9dc5)", () => {
      expect(code).toMatch(/0x811c9dc5/);
    });

    test("MUST use FNV-1a prime (0x01000193)", () => {
      expect(code).toMatch(/0x01000193/);
    });

    test("MUST return hash in result", () => {
      expect(code).toMatch(/hash:\s*\w+/);
    });
  });

  describe("Required: Vector Clock", () => {
    test("MUST implement vector clock", () => {
      expect(code).toMatch(/clock/i);
    });

    test("MUST return clock in result", () => {
      expect(code).toMatch(/clock:\s*\w+/);
    });
  });
});
