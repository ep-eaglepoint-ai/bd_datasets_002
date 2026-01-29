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

  test("checks for .test.ts files in specified repository state", () => {
    const state = process.env.TEST_STATE;
    
    if (!state) {
      throw new Error("TEST_STATE environment variable must be set (e.g., 'before' or 'after')");
    }

    if (state !== "before" && state !== "after") {
      throw new Error(`TEST_STATE must be either 'before' or 'after', got: ${state}`);
    }

    const root = path.resolve(__dirname, "..");
    const repositoryRoot = path.join(root, `repository_${state}`);

    mustExist(repositoryRoot);

    const testFiles = listTestFiles(repositoryRoot);

    expect(testFiles.length).toBeGreaterThan(0);
  });
});

