import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

describe("Schema Validation & Structure", () => {
  const schemaPath = process.env.SCHEMA_PATH
    ? path.resolve(process.env.SCHEMA_PATH)
    : path.join(__dirname, "../repository_after/prisma/schema.prisma");

  // Ensure we can read the file
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  it("should pass prisma validate", async () => {
    await execAsync(`npx prisma validate --schema=${schemaPath}`);
  }, 30000);

  it("should have User model", () => {
    expect(schemaContent).toContain("model User");
  });

  it("should have Store model with owner/user relation", () => {
    expect(schemaContent).toContain("model Store");
    expect(schemaContent).toContain("user        User");
    expect(schemaContent).toMatch(/@relation\("UserToStore"/);
  });

  it("should have explicit named relations", () => {
    expect(schemaContent).toContain('@relation("StoreToBillboard"');
    expect(schemaContent).toContain('@relation("StoreToCategory"');
    expect(schemaContent).toContain('@relation("StoreToProduct"');
  });

  it("should have Cascade delete behavior on Store relations", () => {
    // Check StoreToBillboard cascade
    expect(schemaContent).toMatch(
      /@relation\("StoreToBillboard".*onDelete: Cascade/,
    );
    expect(schemaContent).toMatch(
      /@relation\("StoreToCategory".*onDelete: Cascade/,
    );
    expect(schemaContent).toMatch(
      /@relation\("StoreToProduct".*onDelete: Cascade/,
    );
  });

  it('should check for indexes (relationMode = "prisma")', () => {
    expect(schemaContent).toContain("@@index([storeId])");
    expect(schemaContent).toContain("@@index([userId])");
  });
});
