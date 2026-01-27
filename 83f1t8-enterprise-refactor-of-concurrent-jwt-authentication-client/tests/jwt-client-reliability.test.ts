import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const TARGET_REPO = (process.env.TARGET_REPO ?? "after").toLowerCase();

function repoPath(...segments: string[]) {
  return path.join(
    PROJECT_ROOT,
    TARGET_REPO === "before" ? "repository_before" : "repository_after",
    ...segments
  );
}

function readText(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath: string) {
  return JSON.parse(readText(filePath));
}

function extractBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  if (start === -1) return null;
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return source.slice(start, end);
}

function normalizeForExactCompare(source: string) {
  // For strict “external dependency is unchanged” comparisons.
  // Remove whitespace only; keep tokens intact.
  return source.replace(/\s+/g, "");
}

describe("JWT client reliability requirements", () => {
  // Static, requirement-driven checks. These are intentionally strict for
  // repo_after; some will fail for repo_before (by design).
  test("no obvious unbounded leak scaffolding in http client", () => {
    const fileToScan =
      TARGET_REPO === "before"
        ? repoPath("src", "App.tsx")
        : repoPath("src", "authCore.tsx");
    const src = readText(fileToScan);

    // The legacy implementation tracks failed requests forever.
    expect(src.includes("failedRequests")).toBe(false);

    // The legacy implementation had a top-level reject() stub and called it
    // from refresh processing (error-prone and not tied to the queued promise).
    expect(src.includes("Function not implemented")).toBe(false);
  });

  test("logout resets internal request bookkeeping (bounded state)", async () => {
    if (TARGET_REPO !== "after") {
      // This is expected to fail (or be impossible to assert) on repo_before
      // because the internal client is not exported.
      throw new Error(
        "repo_before does not expose a testable auth core; this assertion is expected to fail there"
      );
    }

    const mod = await import("../repository_after/src/authCore");
    const httpClient = mod.httpClient as any;

    expect(typeof httpClient.setTokens).toBe("function");
    expect(typeof httpClient.getQueueSize).toBe("function");
    expect(typeof httpClient.getRetryCount).toBe("function");

    // Simulate a logged-in session.
    httpClient.setTokens({
      accessToken: "fake",
      // Avoid flakiness around the refresh threshold (60s).
      expiresAt: Date.now() + 5 * 60_000,
    });

    // Trigger some bookkeeping.
    await expect(
      httpClient.request({ endpoint: "/api/fail" })
    ).rejects.toBeInstanceOf(Error);

    expect(httpClient.getRetryCount()).toBeGreaterThan(0);

    // Logout/session termination must fully reset bounded structures.
    httpClient.setTokens(null);
    expect(httpClient.getQueueSize()).toBe(0);
    expect(httpClient.getRetryCount()).toBe(0);
  });

  test("happy path: login produces a token that can access protected resource", async () => {
    if (TARGET_REPO !== "after") {
      throw new Error(
        "repo_before does not expose a stable auth core API; this assertion is expected to fail there"
      );
    }

    const mod = await import("../repository_after/src/authCore");
    const httpClient = mod.httpClient as any;
    const mockBackend = mod.mockBackend as any;

    const login = await mockBackend.login(
      "admin@fintech.com",
      "Admin123!",
      "demo-ip"
    );

    httpClient.setTokens({
      accessToken: login.accessToken,
      expiresAt: Date.now() + 10 * 60_000,
    });

    const resp = await httpClient.request({ endpoint: "/api/protected" });
    expect(resp).toEqual({ data: "Protected data accessed successfully" });
  });

  test("boundedness under load: repeated concurrency does not accumulate client state", async () => {
    if (TARGET_REPO !== "after") {
      throw new Error(
        "repo_before expected to fail: boundedness is not guaranteed"
      );
    }

    const mod = await import("../repository_after/src/authCore");
    const httpClient = mod.httpClient as any;
    const mockBackend = mod.mockBackend as any;

    const login = await mockBackend.login(
      "user@fintech.com",
      "User123!",
      "demo-ip"
    );

    httpClient.setTokens({
      accessToken: login.accessToken,
      expiresAt: Date.now() + 10 * 60_000,
    });

    const batches = 20;
    const concurrency = 50;

    for (let i = 0; i < batches; i++) {
      const results = await Promise.allSettled(
        Array.from({ length: concurrency }, () =>
          httpClient.request({ endpoint: "/api/protected" })
        )
      );
      expect(results).toHaveLength(concurrency);
      expect(httpClient.getQueueSize()).toBe(0);
    }

    // Session termination must reset bounded state.
    httpClient.setTokens(null);
    expect(httpClient.getQueueSize()).toBe(0);
    expect(httpClient.getRetryCount()).toBe(0);
  });

  test("concurrent requests never leave the queue non-empty on refresh failure", async () => {
    if (TARGET_REPO !== "after") {
      throw new Error(
        "repo_before expected to fail: queue/refresh coordination is not guaranteed"
      );
    }

    const mod = await import("../repository_after/src/authCore");
    const httpClient = mod.httpClient as any;

    // Tokens close to expiry forces refresh flow, which (in this demo) fails.
    httpClient.setTokens({ accessToken: "fake", expiresAt: Date.now() + 1 });

    const count = 25;
    const results = await Promise.allSettled(
      Array.from({ length: count }, () =>
        httpClient.request({ endpoint: "/api/protected" })
      )
    );

    // All should settle; none should hang.
    expect(results).toHaveLength(count);

    // Most important requirement: queue is drained and bounded.
    expect(httpClient.getQueueSize()).toBe(0);
  });
});
