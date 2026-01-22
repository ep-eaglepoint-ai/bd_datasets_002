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

  // Requirement 8: Prisma-valid for SaaS use
  it("should pass prisma validate", async () => {
    try {
      await execAsync(`npx prisma validate --schema=${schemaPath}`);
    } catch (e) {
      // Suppress detailed error output for cleaner logs as requested
      throw new Error("Prisma validation failed");
    }
  }, 30000);

  // Requirement 4: Introduce missing entities (User)
  describe("Requirement 4: Missing Entities", () => {
    it("should have User model", () => {
      expect(schemaContent).toContain("model User");
    });

    it("should have Store model with owner/user relation", () => {
      expect(schemaContent).toContain("model Store");
      expect(schemaContent).toContain("user        User");
      expect(schemaContent).toMatch(/@relation\("UserToStore"/);
    });

    it("should have userId field in Store model", () => {
      const storeModelMatch = schemaContent.match(/model Store \{[\s\S]*?\n\}/);
      expect(storeModelMatch).toBeTruthy();
      expect(storeModelMatch![0]).toMatch(/userId\s+String/);
    });
  });

  // Requirement 1: Explicit @relation directives with names
  describe("Requirement 1: Explicit Named Relations", () => {
    it("should have all Store relations with explicit names", () => {
      expect(schemaContent).toContain('@relation("StoreToBillboard"');
      expect(schemaContent).toContain('@relation("StoreToCategory"');
      expect(schemaContent).toContain('@relation("StoreToProduct"');
      expect(schemaContent).toContain('@relation("StoreToSize"');
      expect(schemaContent).toContain('@relation("StoreToColor"');
      expect(schemaContent).toContain('@relation("StoreToOrder"');
    });

    it("should have Billboard to Category relation named", () => {
      expect(schemaContent).toContain('@relation("BillboardToCategory"');
    });

    it("should have Category to Product relation named", () => {
      expect(schemaContent).toContain('@relation("CategoryToProduct"');
    });

    it("should have Size to Product relation named", () => {
      expect(schemaContent).toContain('@relation("SizeToProduct"');
    });

    it("should have Color to Product relation named", () => {
      expect(schemaContent).toContain('@relation("ColorToProduct"');
    });

    it("should have Product to Image relation named", () => {
      expect(schemaContent).toContain('@relation("ProductToImage"');
    });

    it("should have Order to OrderItem relation named", () => {
      expect(schemaContent).toContain('@relation("OrderToOrderItem"');
    });

    it("should have Product to OrderItem relation named", () => {
      expect(schemaContent).toContain('@relation("ProductToOrderItem"');
    });
  });

  // Requirement 2: Remove redundant foreign keys
  describe("Requirement 2: No Redundant Foreign Keys", () => {
    it("should not have standalone ownerId in Store (replaced by userId)", () => {
      const storeModelMatch = schemaContent.match(/model Store \{[\s\S]*?\n\}/);
      expect(storeModelMatch).toBeTruthy();
      // Should have userId but not ownerId
      expect(storeModelMatch![0]).not.toMatch(/ownerId\s+String/);
    });

    it("should have foreign key fields only on the owning side of relations", () => {
      // Billboard should have storeId (many-to-one)
      const billboardMatch = schemaContent.match(/model Billboard \{[\s\S]*?\n\}/);
      expect(billboardMatch![0]).toMatch(/storeId\s+String/);
      
      // Store should NOT have billboardId (one-to-many)
      const storeMatch = schemaContent.match(/model Store \{[\s\S]*?\n\}/);
      expect(storeMatch![0]).not.toMatch(/billboardId/);
    });

    it("should not have circular ownership patterns", () => {
      // Ensure no model references itself in a way that creates circular ownership
      // For example, Billboard shouldn't own Store while Store owns Billboard
      const billboardMatch = schemaContent.match(/model Billboard \{[\s\S]*?\n\}/);
      expect(billboardMatch![0]).not.toMatch(/stores\s+Store\[\]/);
    });
  });

  // Requirement 3: Cascade behavior defined explicitly
  describe("Requirement 3: Explicit Cascade Behavior", () => {
    it("should have Cascade delete on Store to Billboard", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToBillboard".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Store to Category", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToCategory".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Store to Product", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToProduct".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Store to Size", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToSize".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Store to Color", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToColor".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Store to Order", () => {
      expect(schemaContent).toMatch(
        /@relation\("StoreToOrder".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Billboard to Category", () => {
      expect(schemaContent).toMatch(
        /@relation\("BillboardToCategory".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Product to Image", () => {
      expect(schemaContent).toMatch(
        /@relation\("ProductToImage".*onDelete:\s*Cascade/s,
      );
    });

    it("should have Cascade delete on Order to OrderItem", () => {
      expect(schemaContent).toMatch(
        /@relation\("OrderToOrderItem".*onDelete:\s*Cascade/s,
      );
    });
  });

  // Requirement 5: Multi-tenant boundaries with Store as root
  describe("Requirement 5: Multi-Tenant Boundaries", () => {
    it("should have Store as the tenant root with all tenant-scoped models referencing it", () => {
      // All tenant-scoped models should have storeId
      const modelsRequiringStoreId = [
        "Billboard",
        "Category",
        "Product",
        "Size",
        "Color",
        "Order",
      ];

      modelsRequiringStoreId.forEach((modelName) => {
        const modelMatch = schemaContent.match(
          new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`)
        );
        expect(modelMatch).toBeTruthy();
        expect(modelMatch![0]).toMatch(/storeId\s+String/);
        expect(modelMatch![0]).toMatch(/store\s+Store/);
      });
    });

    it("should have proper indexes for tenant isolation (relationMode = prisma)", () => {
      expect(schemaContent).toContain("@@index([storeId])");
      expect(schemaContent).toContain("@@index([userId])");
    });

    it("should enforce Store boundary on all tenant-scoped relations", () => {
      // Category should reference Store
      const categoryMatch = schemaContent.match(/model Category \{[\s\S]*?\n\}/);
      expect(categoryMatch![0]).toMatch(/@relation\("StoreToCategory"/);

      // Product should reference Store
      const productMatch = schemaContent.match(/model Product \{[\s\S]*?\n\}/);
      expect(productMatch![0]).toMatch(/@relation\("StoreToProduct"/);
    });
  });

  // Requirement 6: Arrays reference correct models with named relations
  describe("Requirement 6: Array Relations", () => {
    it("should have Store arrays reference correct models", () => {
      const storeMatch = schemaContent.match(/model Store \{[\s\S]*?\n\}/);
      expect(storeMatch![0]).toMatch(/billboards\s+Billboard\[\]/);
      expect(storeMatch![0]).toMatch(/categories\s+Category\[\]/);
      expect(storeMatch![0]).toMatch(/products\s+Product\[\]/);
      expect(storeMatch![0]).toMatch(/sizes\s+Size\[\]/);
      expect(storeMatch![0]).toMatch(/colors\s+Color\[\]/);
      expect(storeMatch![0]).toMatch(/orders\s+Order\[\]/);
    });

    it("should have Billboard array in Category model", () => {
      const billboardMatch = schemaContent.match(/model Billboard \{[\s\S]*?\n\}/);
      expect(billboardMatch![0]).toMatch(/categories\s+Category\[\]/);
    });

    it("should have Product arrays in Size and Color models", () => {
      const sizeMatch = schemaContent.match(/model Size \{[\s\S]*?\n\}/);
      expect(sizeMatch![0]).toMatch(/products\s+Product\[\]/);

      const colorMatch = schemaContent.match(/model Color \{[\s\S]*?\n\}/);
      expect(colorMatch![0]).toMatch(/products\s+Product\[\]/);
    });

    it("should have Image array in Product model", () => {
      const productMatch = schemaContent.match(/model Product \{[\s\S]*?\n\}/);
      expect(productMatch![0]).toMatch(/images\s+Image\[\]/);
    });

    it("should have OrderItem array in Order and Product models", () => {
      const orderMatch = schemaContent.match(/model Order \{[\s\S]*?\n\}/);
      expect(orderMatch![0]).toMatch(/orderItems\s+OrderItem\[\]/);

      const productMatch = schemaContent.match(/model Product \{[\s\S]*?\n\}/);
      expect(productMatch![0]).toMatch(/orderItems\s+OrderItem\[\]/);
    });
  });

  // Requirement 7: Preserve all existing business logic
  describe("Requirement 7: Business Logic Preservation", () => {
    it("should preserve all original models", () => {
      const expectedModels = [
        "Store",
        "Billboard",
        "Category",
        "Size",
        "Color",
        "Product",
        "Image",
        "Order",
        "OrderItem",
      ];

      expectedModels.forEach((modelName) => {
        expect(schemaContent).toContain(`model ${modelName}`);
      });
    });

    it("should preserve Store fields", () => {
      const storeMatch = schemaContent.match(/model Store \{[\s\S]*?\n\}/);
      expect(storeMatch![0]).toMatch(/id\s+String/);
      expect(storeMatch![0]).toMatch(/name\s+String/);
      expect(storeMatch![0]).toMatch(/createdAt\s+DateTime/);
      expect(storeMatch![0]).toMatch(/updatedAt\s+DateTime/);
    });

    it("should preserve Billboard fields", () => {
      const billboardMatch = schemaContent.match(/model Billboard \{[\s\S]*?\n\}/);
      expect(billboardMatch![0]).toMatch(/id\s+String/);
      expect(billboardMatch![0]).toMatch(/label\s+String/);
      expect(billboardMatch![0]).toMatch(/imageUrl\s+String/);
      expect(billboardMatch![0]).toMatch(/createdAt\s+DateTime/);
      expect(billboardMatch![0]).toMatch(/updatedAt\s+DateTime/);
    });

    it("should preserve Category fields", () => {
      const categoryMatch = schemaContent.match(/model Category \{[\s\S]*?\n\}/);
      expect(categoryMatch![0]).toMatch(/id\s+String/);
      expect(categoryMatch![0]).toMatch(/name\s+String/);
      expect(categoryMatch![0]).toMatch(/billboardId\s+String/);
      expect(categoryMatch![0]).toMatch(/createdAt\s+DateTime/);
      expect(categoryMatch![0]).toMatch(/updatedAt\s+DateTime/);
    });

    it("should preserve Product fields", () => {
      const productMatch = schemaContent.match(/model Product \{[\s\S]*?\n\}/);
      expect(productMatch![0]).toMatch(/id\s+String/);
      expect(productMatch![0]).toMatch(/name\s+String/);
      expect(productMatch![0]).toMatch(/price\s+Decimal/);
      expect(productMatch![0]).toMatch(/isFeatured\s+Boolean/);
      expect(productMatch![0]).toMatch(/isArchived\s+Boolean/);
      expect(productMatch![0]).toMatch(/sizeId\s+String/);
      expect(productMatch![0]).toMatch(/colorId\s+String/);
      expect(productMatch![0]).toMatch(/categoryId\s+String/);
    });

    it("should preserve Order fields", () => {
      const orderMatch = schemaContent.match(/model Order \{[\s\S]*?\n\}/);
      expect(orderMatch![0]).toMatch(/id\s+String/);
      expect(orderMatch![0]).toMatch(/isPaid\s+Boolean/);
      expect(orderMatch![0]).toMatch(/phone\s+String/);
      expect(orderMatch![0]).toMatch(/address\s+String/);
      expect(orderMatch![0]).toMatch(/createdAt\s+DateTime/);
      expect(orderMatch![0]).toMatch(/updatedAt\s+DateTime/);
    });

    it("should preserve OrderItem structure", () => {
      const orderItemMatch = schemaContent.match(/model OrderItem \{[\s\S]*?\n\}/);
      expect(orderItemMatch![0]).toMatch(/id\s+String/);
      expect(orderItemMatch![0]).toMatch(/orderId\s+String/);
      expect(orderItemMatch![0]).toMatch(/productId\s+String/);
    });
  });
});
