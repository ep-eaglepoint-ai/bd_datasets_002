const fs = require("fs");
const path = require("path");

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const TEST_DATA_DIR = process.env.TEST_DATA_DIR || "/tmp/test-data";

// Helper for delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to wait for scan completion
const waitForScanComplete = async (maxWaitSeconds = 30) => {
  for (let i = 0; i < maxWaitSeconds; i++) {
    const statusRes = await fetch(`${APP_URL}/api/scan`);
    const statusData = await statusRes.json();
    if (
      statusData.status === "completed" ||
      statusData.status === "idle" ||
      statusData.status === "cancelled" ||
      statusData.status === "error"
    ) {
      return statusData;
    }
    await sleep(1000);
  }
  throw new Error("Scan did not complete in time");
};

describe("File Organizer E2E Tests", () => {
  beforeAll(async () => {
    // Setup Test Data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.readdirSync(TEST_DATA_DIR).forEach((file) => {
        const curPath = path.join(TEST_DATA_DIR, file);
        fs.rmSync(curPath, { recursive: true, force: true });
      });
    } else {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    const files = [
      { name: "doc1.txt", content: "Content of document 1" },
      { name: "doc2.txt", content: "Content of document 2" },
      { name: "image.png", content: "fake image content" },
      { name: "nested/folder/deep.txt", content: "Deep content" },
      { name: "duplicate.txt", content: "Content of document 1" }, // Duplicate of doc1
      { name: "large_file.bin", content: "x".repeat(10000) }, // Larger file
      { name: "special chars !@#$.txt", content: "Special characters in name" },
      { name: "code.js", content: "console.log('hello');" },
      { name: "data.json", content: '{"key": "value"}' },
    ];

    for (const file of files) {
      const fullPath = path.join(TEST_DATA_DIR, file.name);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    }

    // Wait for App to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${APP_URL}/api/scan`);
        if (res.ok) {
          ready = true;
          // Reset DB
          await fetch(`${APP_URL}/api/reset`, { method: "POST" });
          break;
        }
      } catch (e) {
        // ignore
      }
      await sleep(1000);
    }
    if (!ready) throw new Error("Application did not start in time");
  }, 60000);

  afterAll(async () => {
    // Cleanup
    try {
      await fetch(`${APP_URL}/api/reset`, { method: "POST" });
    } catch (e) {
      // ignore
    }
  });

  describe("Scanning", () => {
    test("should start and complete a scan", async () => {
      const scanRes = await fetch(`${APP_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: TEST_DATA_DIR }),
      });

      expect([200, 201]).toContain(scanRes.status);
      
      const finalStatus = await waitForScanComplete();
      expect(["completed", "idle"]).toContain(finalStatus.status);
      expect(finalStatus.progress).toBeDefined();
      expect(finalStatus.progress.filesScanned).toBeGreaterThan(0);
    }, 30000);

    test("should reject scanning protected paths", async () => {
      const scanRes = await fetch(`${APP_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/etc" }),
      });

      expect(scanRes.status).toBe(400);
      const data = await scanRes.json();
      expect(data.error).toContain("protected");
    });

    test("should reject scanning non-existent paths", async () => {
      const scanRes = await fetch(`${APP_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/nonexistent/path/12345" }),
      });

      expect(scanRes.status).toBe(400);
    });

    test("should handle scan status check correctly", async () => {
      const statusRes = await fetch(`${APP_URL}/api/scan`);
      expect(statusRes.status).toBe(200);
      
      const status = await statusRes.json();
      expect(status).toHaveProperty("isScanning");
      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("progress");
    });
  });

  describe("File Indexing", () => {
    test("should index all files correctly", async () => {
      const res = await fetch(`${APP_URL}/api/files?limit=100`);
      expect(res.status).toBe(200);

      const data = await res.json();
      const files = data.data || [];

      const filenames = files.map((f) => f.filename);
      expect(filenames).toContain("doc1.txt");
      expect(filenames).toContain("doc2.txt");
      expect(filenames).toContain("image.png");
      expect(filenames).toContain("deep.txt");
      expect(filenames).toContain("duplicate.txt");
      expect(filenames).toContain("large_file.bin");
      expect(filenames).toContain("code.js");
    });

    test("should include file metadata", async () => {
      const res = await fetch(`${APP_URL}/api/files?search=doc1`);
      const data = await res.json();
      const files = data.data || [];
      
      expect(files.length).toBeGreaterThan(0);
      const file = files.find(f => f.filename === "doc1.txt");
      expect(file).toBeDefined();
      expect(file.path).toContain("doc1.txt");
      expect(file.extension).toBe(".txt");
      expect(parseInt(file.size)).toBeGreaterThan(0);
      expect(file.hash).toBeDefined();
      expect(file.hash.length).toBe(64); // SHA256
    });

    test("should return pagination info", async () => {
      const res = await fetch(`${APP_URL}/api/files?page=1&limit=2`);
      const data = await res.json();
      
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.total).toBeGreaterThan(0);
      expect(data.pagination.totalPages).toBeGreaterThan(0);
    });
  });

  describe("Advanced Search & Filtering", () => {
    test("should search files by name", async () => {
      const res = await fetch(`${APP_URL}/api/files?search=deep`);
      const data = await res.json();
      const files = data.data || [];

      expect(files.some((f) => f.filename === "deep.txt")).toBe(true);
      expect(files.some((f) => f.filename === "doc1.txt")).toBe(false);
    });

    test("should filter by extension", async () => {
      const res = await fetch(`${APP_URL}/api/files?extension=.js`);
      const data = await res.json();
      const files = data.data || [];

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.extension === ".js")).toBe(true);
    });

    test("should filter by size range", async () => {
      // large_file.bin is 10000 bytes
      const res = await fetch(`${APP_URL}/api/files?minSize=5000`);
      const data = await res.json();
      const files = data.data || [];

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.filename === "large_file.bin")).toBe(true);
    });

    test("should sort files", async () => {
      const resAsc = await fetch(`${APP_URL}/api/files?sortBy=filename&sortOrder=asc`);
      const dataAsc = await resAsc.json();
      const filesAsc = dataAsc.data || [];

      const resDesc = await fetch(`${APP_URL}/api/files?sortBy=filename&sortOrder=desc`);
      const dataDesc = await resDesc.json();
      const filesDesc = dataDesc.data || [];

      expect(filesAsc.length).toBeGreaterThan(0);
      expect(filesDesc.length).toBeGreaterThan(0);
      
      // First and last should be reversed
      expect(filesAsc[0].filename).not.toBe(filesDesc[0].filename);
    });
  });

  describe("Duplicate Detection", () => {
    test("should detect duplicates", async () => {
      const res = await fetch(`${APP_URL}/api/duplicates`);
      expect(res.status).toBe(200);

      const data = await res.json();
      const groups = data.groups || [];

      let foundPair = false;
      for (const group of groups) {
        const names = group.map((f) => f.filename);
        if (names.includes("doc1.txt") && names.includes("duplicate.txt")) {
          foundPair = true;
          break;
        }
      }

      expect(foundPair).toBe(true);
    });

    test("should return duplicate statistics", async () => {
      const res = await fetch(`${APP_URL}/api/duplicates`);
      const data = await res.json();

      expect(data.totalGroups).toBeGreaterThan(0);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalDuplicateFiles).toBeGreaterThan(0);
      expect(data.stats.potentialSpaceSaved).toBeDefined();
    });

    test("should paginate duplicate groups", async () => {
      const res = await fetch(`${APP_URL}/api/duplicates?page=1&limit=1`);
      const data = await res.json();

      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });
  });

  describe("Tagging", () => {
    let testFileId;

    beforeAll(async () => {
      const res = await fetch(`${APP_URL}/api/files?search=doc1&limit=1`);
      const data = await res.json();
      testFileId = data.data?.[0]?.id;
    });

    test("should add tags to a file", async () => {
      expect(testFileId).toBeDefined();

      const res = await fetch(`${APP_URL}/api/files/${testFileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["important", "work"] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags.map(t => t.name)).toContain("important");
      expect(data.tags.map(t => t.name)).toContain("work");
    });

    test("should search files by tag", async () => {
      const res = await fetch(`${APP_URL}/api/files?tags=important`);
      const data = await res.json();
      const files = data.data || [];

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.tags.some(t => t.name === "important"))).toBe(true);
    });

    test("should update tags (replace)", async () => {
      const res = await fetch(`${APP_URL}/api/files/${testFileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["updated-tag"] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags.length).toBe(1);
      expect(data.tags[0].name).toBe("updated-tag");
    });

    test("should handle empty tags", async () => {
      const res = await fetch(`${APP_URL}/api/files/${testFileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: [] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags.length).toBe(0);
    });

    test("should sanitize tag input", async () => {
      const res = await fetch(`${APP_URL}/api/files/${testFileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["  trim-me  ", "", "valid"] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags.map(t => t.name)).toContain("trim-me");
      expect(data.tags.map(t => t.name)).toContain("valid");
      expect(data.tags.length).toBe(2); // Empty string filtered out
    });
  });

  describe("File Deletion", () => {
    let deleteFileId;
    let deleteFilePath;

    beforeEach(async () => {
      // Create a new file for deletion test
      const tempFileName = `delete-test-${Date.now()}.txt`;
      const tempFilePath = path.join(TEST_DATA_DIR, tempFileName);
      fs.writeFileSync(tempFilePath, "Delete me");

      // Rescan to pick up new file
      await fetch(`${APP_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: TEST_DATA_DIR }),
      });
      await waitForScanComplete();

      // Find the file
      const res = await fetch(`${APP_URL}/api/files?search=delete-test`);
      const data = await res.json();
      const file = data.data?.find(f => f.filename.startsWith("delete-test"));
      deleteFileId = file?.id;
      deleteFilePath = file?.path;
    });

    test("should support dry-run delete", async () => {
      expect(deleteFileId).toBeDefined();

      const res = await fetch(`${APP_URL}/api/files/${deleteFileId}?dryRun=true`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.dryRun).toBe(true);
      expect(data.wouldDelete).toBe(true);
      expect(data.fileExistsOnDisk).toBe(true);

      // File should still exist
      expect(fs.existsSync(deleteFilePath)).toBe(true);
    });

    test("should delete file from disk and database", async () => {
      expect(deleteFileId).toBeDefined();

      const res = await fetch(`${APP_URL}/api/files/${deleteFileId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deletedFromDisk).toBe(true);

      // File should be gone
      expect(fs.existsSync(deleteFilePath)).toBe(false);

      // Should be gone from DB
      const checkRes = await fetch(`${APP_URL}/api/files/${deleteFileId}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe("Bulk Operations", () => {
    let bulkFileIds = [];

    beforeAll(async () => {
      // Create files for bulk test
      for (let i = 0; i < 3; i++) {
        const tempFileName = `bulk-test-${i}-${Date.now()}.txt`;
        const tempFilePath = path.join(TEST_DATA_DIR, tempFileName);
        fs.writeFileSync(tempFilePath, `Bulk content ${i}`);
      }

      // Rescan
      await fetch(`${APP_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: TEST_DATA_DIR }),
      });
      await waitForScanComplete();

      // Get IDs
      const res = await fetch(`${APP_URL}/api/files?search=bulk-test`);
      const data = await res.json();
      bulkFileIds = (data.data || []).map(f => f.id);
    });

    test("should support bulk dry-run delete", async () => {
      expect(bulkFileIds.length).toBeGreaterThan(0);

      const res = await fetch(`${APP_URL}/api/files/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: bulkFileIds, dryRun: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.length).toBe(bulkFileIds.length);
      expect(data.results.every(r => r.dryRun)).toBe(true);
      expect(data.summary.dryRun).toBe(true);
    });

    test("should perform bulk delete", async () => {
      expect(bulkFileIds.length).toBeGreaterThan(0);

      const res = await fetch(`${APP_URL}/api/files/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: bulkFileIds, dryRun: false }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.success).toBe(bulkFileIds.length);
      expect(data.summary.failed).toBe(0);
    });

    test("should handle non-existent IDs in bulk delete", async () => {
      const res = await fetch(`${APP_URL}/api/files/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [999999, 999998], dryRun: false }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.failed).toBe(2);
    });

    test("should reject too many IDs", async () => {
      const manyIds = Array.from({ length: 101 }, (_, i) => i);
      
      const res = await fetch(`${APP_URL}/api/files/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: manyIds }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("100");
    });
  });

  describe("Edge Cases", () => {
    test("should handle special characters in filenames", async () => {
      const res = await fetch(`${APP_URL}/api/files?search=special`);
      const data = await res.json();
      const files = data.data || [];

      expect(files.some(f => f.filename.includes("!@#$"))).toBe(true);
    });

    test("should handle deeply nested files", async () => {
      const res = await fetch(`${APP_URL}/api/files?search=deep`);
      const data = await res.json();
      const files = data.data || [];

      const deepFile = files.find(f => f.filename === "deep.txt");
      expect(deepFile).toBeDefined();
      expect(deepFile.path).toContain("nested/folder");
    });

    test("should handle empty search results gracefully", async () => {
      const res = await fetch(`${APP_URL}/api/files?search=nonexistentfile12345`);
      const data = await res.json();

      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    test("should handle invalid page numbers", async () => {
      const res = await fetch(`${APP_URL}/api/files?page=9999`);
      const data = await res.json();

      expect(data.data).toEqual([]);
    });
  });

  describe("Reset API", () => {
    test("should clear all data", async () => {
      const res = await fetch(`${APP_URL}/api/reset`, { method: "POST" });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.cleared.files).toBe(true);
      expect(data.cleared.tags).toBe(true);

      // Verify files are gone
      const filesRes = await fetch(`${APP_URL}/api/files`);
      const filesData = await filesRes.json();
      expect(filesData.data.length).toBe(0);
    });
  });
});
