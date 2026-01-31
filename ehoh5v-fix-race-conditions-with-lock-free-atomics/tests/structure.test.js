import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_REPO = process.env.TEST_REPO || "after";

describe("Lock-Free Atomics Structure", () => {
  let code;

  beforeAll(() => {
    const filePath = TEST_REPO === "before"
      ? path.join(__dirname, "../repository_before/userCapAndAccess.dal.ts")
      : path.join(__dirname, "../repository_after/src/userCapAndAccess.dal.ts");
    
    code = fs.readFileSync(filePath, "utf8");
  });

  test("uses SharedArrayBuffer", () => {
    expect(code).toMatch(/new SharedArrayBuffer\(/);
  });

  test("uses Int32Array", () => {
    expect(code).toMatch(/new Int32Array\(/);
  });

  test("uses Atomics.wait", () => {
    expect(code).toMatch(/Atomics\.wait\(/);
  });

  test("uses Atomics.notify", () => {
    expect(code).toMatch(/Atomics\.notify\(/);
  });

  test("uses Atomics.compareExchange", () => {
    expect(code).toMatch(/Atomics\.compareExchange\(/);
  });

  test("uses Atomics.load", () => {
    expect(code).toMatch(/Atomics\.load\(/);
  });

  test("uses Atomics.add", () => {
    expect(code).toMatch(/Atomics\.add\(/);
  });

  test("implements quantumHash", () => {
    expect(code).toMatch(/function quantumHash/);
  });

  test("uses PQ-secure SHA-256", () => {
    expect(code).toMatch(/sha256/);
  });

  test("implements getVectorClock", () => {
    expect(code).toMatch(/function getVectorClock/);
  });

  test("returns hash and clock", () => {
    expect(code).toMatch(/hash:/);
    expect(code).toMatch(/clock:/);
  });
});
