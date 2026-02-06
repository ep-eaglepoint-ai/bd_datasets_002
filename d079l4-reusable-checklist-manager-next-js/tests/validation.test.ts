/** @jest-environment node */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  createTemplate,
  createInstance,
  toggleInstanceItem,
  updateInstanceStatus,
  deleteTemplate,
  deleteInstance,
} from "@/app/actions";
import prisma from "@/lib/prisma";

describe("Validation and Error Handling (Req 12)", () => {
  beforeAll(async () => {
    // Cleanup before tests
    await prisma.instanceItem.deleteMany();
    await prisma.checklistInstance.deleteMany();
    await prisma.templateItem.deleteMany();
    await prisma.template.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Template Validation", () => {
    it("should reject template with empty title", async () => {
      const result = await createTemplate({
        title: "",
        description: "Test",
        items: [],
      });

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should reject template with missing title", async () => {
      const result = await createTemplate({
        description: "Test",
        items: [],
      } as any);

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should accept template with valid data", async () => {
      const result = await createTemplate({
        title: "Valid Template",
        description: "Test description",
        items: [{ text: "Item 1", required: true }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });

    it("should accept template without description (optional field)", async () => {
      const result = await createTemplate({
        title: "Template without description",
        items: [{ text: "Item 1", required: false }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });

    it("should accept template with empty items array", async () => {
      const result = await createTemplate({
        title: "Empty Template",
        items: [],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });
  });

  describe("Instance Validation", () => {
    let validTemplateId: string;

    beforeAll(async () => {
      const template = await createTemplate({
        title: "Test Template",
        items: [{ text: "Item 1", required: true }],
      });
      validTemplateId = template.data!.id;
    });

    afterAll(async () => {
      await deleteTemplate(validTemplateId);
    });

    it("should reject instance with empty title", async () => {
      const result = await createInstance({
        templateId: validTemplateId,
        title: "",
      });

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should reject instance with missing title", async () => {
      const result = await createInstance({
        templateId: validTemplateId,
      } as any);

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should reject instance with invalid templateId", async () => {
      const result = await createInstance({
        templateId: "non-existent-id",
        title: "Test Instance",
      });

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Template not found");
    });

    it("should accept instance with valid data", async () => {
      const result = await createInstance({
        templateId: validTemplateId,
        title: "Valid Instance",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteInstance(result.data.id);
      }
    });

    it("should accept instance without notes (optional field)", async () => {
      const result = await createInstance({
        templateId: validTemplateId,
        title: "Instance without notes",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteInstance(result.data.id);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully when deleting non-existent template", async () => {
      const result = await deleteTemplate("non-existent-id");

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should handle database errors gracefully when deleting non-existent instance", async () => {
      const result = await deleteInstance("non-existent-id");

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should handle invalid item ID when toggling", async () => {
      const result = await toggleInstanceItem("invalid-id", true);

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should handle invalid instance ID when updating status", async () => {
      const result = await updateInstanceStatus("invalid-id", "COMPLETED");

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    let templateId: string;
    let instanceId: string;

    beforeAll(async () => {
      const template = await createTemplate({
        title: "Edge Case Template",
        items: [
          { text: "Item 1", required: true },
          { text: "Item 2", required: false },
        ],
      });
      templateId = template.data!.id;

      const instance = await createInstance({
        templateId,
        title: "Edge Case Instance",
      });
      instanceId = instance.data!.id;
    });

    afterAll(async () => {
      await deleteInstance(instanceId);
      await deleteTemplate(templateId);
    });

    it("should handle status transitions correctly", async () => {
      // ACTIVE -> COMPLETED
      let result = await updateInstanceStatus(instanceId, "COMPLETED");
      expect(result.success).toBe(true);

      // COMPLETED -> ARCHIVED
      result = await updateInstanceStatus(instanceId, "ARCHIVED");
      expect(result.success).toBe(true);

      // ARCHIVED -> ACTIVE (should work - no restrictions)
      result = await updateInstanceStatus(instanceId, "ACTIVE");
      expect(result.success).toBe(true);
    });

    it("should handle template with special characters in title", async () => {
      const result = await createTemplate({
        title: "Template with 特殊字符 & symbols!@#$%",
        items: [{ text: "Test", required: false }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });

    it("should handle very long template titles", async () => {
      const longTitle = "A".repeat(500);
      const result = await createTemplate({
        title: longTitle,
        items: [{ text: "Test", required: false }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });

    it("should handle template with many items", async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        text: `Item ${i + 1}`,
        required: i % 2 === 0,
      }));

      const result = await createTemplate({
        title: "Template with many items",
        items,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup
      if (result.data?.id) {
        await deleteTemplate(result.data.id);
      }
    });
  });
});
