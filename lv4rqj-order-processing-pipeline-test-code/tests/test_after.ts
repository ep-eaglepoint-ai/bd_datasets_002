import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REPO_DIRNAME = "repository_after";
const NPM_SCRIPT = "test:after";
const EXPECT_TEST_FILE_EXISTS = true;
const EXPECT_EXIT_CODE = 0;
const EXPECT_OUTPUT = /\bPASS\b/i;

function npmCmd(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runNpm(root: string, args: string[]) {
  const res = spawnSync(npmCmd(), args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env },
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("before/after repository test run", () => {
  test("runs the correct repo test script", () => {
    const root = path.resolve(__dirname, "..");

    // Verify the expected tests exist (or intentionally don't) in the target repo folder.
    const repoDir = path.join(root, REPO_DIRNAME);
    const unitPath = path.join(repoDir, "src", "order_processor.ts");
    const testPath = path.join(repoDir, "src", "order_processor.test.ts");
    expect(fs.existsSync(repoDir)).toBe(true);
    expect(fs.existsSync(unitPath)).toBe(true);
    expect(fs.existsSync(testPath)).toBe(EXPECT_TEST_FILE_EXISTS);

    const r = runNpm(root, ["run", NPM_SCRIPT]);
    const combined = `${r.stdout}\n${r.stderr}`;
    expect(r.status).toBe(EXPECT_EXIT_CODE);
    expect(combined).toMatch(EXPECT_OUTPUT);
  });
});

