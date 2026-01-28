import * as fs from "fs";
import * as path from "path";
import {describe, expect, test, jest} from '@jest/globals';

function mustExist(p: string): void {
  expect(fs.existsSync(p)).toBe(true);
}

function listTestFiles(dir: string): string[] {
  const out: string[] = [];

  const entries = fs.readdirSync(dir) as string[];
  for (const name of entries) {
    const full = path.join(dir, name);
    const st = (fs as any).statSync(full);
    if (st?.isDirectory?.()) {
      out.push(...listTestFiles(full));
    } else if (st?.isFile?.() && name.endsWith(".test.ts")) {
      out.push(full);
    }
  }

  return out;
}

describe("repository layout sanity checks", () => {

  test("finds expected .test.ts files in the right places", () => {
    const root = path.resolve(__dirname, "..");
    const beforeRoot = path.join(root, "repository_before");
    const afterRoot = path.join(root, "repository_after");

    mustExist(beforeRoot);
    mustExist(afterRoot);

    const beforeTests = listTestFiles(beforeRoot);
    const afterTests = listTestFiles(afterRoot);

    expect(beforeTests).toHaveLength(0);

    expect(afterTests.length).toBeGreaterThanOrEqual(1);
    expect(afterTests.some((p) => p.replace(/\\/g, "/").endsWith("src/order_processor.test.ts"))).toBe(true);
  });
});

