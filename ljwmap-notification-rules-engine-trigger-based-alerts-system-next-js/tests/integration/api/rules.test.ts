import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/rules/route";
import { GET as GET_ONE, PUT, DELETE, PATCH } from "@/app/api/rules/[id]/route";
import { NextRequest } from "next/server";

// Mock the database
vi.mock("@/lib/db", () => ({
  default: {
    rule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    condition: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      condition: { deleteMany: vi.fn() },
      rule: { update: vi.fn() },
    })),
  },
}));

import prisma from "@/lib/db";

const mockedPrisma = vi.mocked(prisma);

describe("/api/rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRule = (overrides = {}) => ({
    id: "rule-1",
    name: "Test Rule",
    description: "Test description",
    eventType: "order_created",
    priority: "medium",
    cooldownMs: 0,
    channels: '["in-app"]',
    webhookUrl: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conditions: [],
    _count: { notifications: 5 },
    ...overrides,
  });

  describe("GET /api/rules", () => {
    it("should return list of rules", async () => {
      mockedPrisma.rule.findMany.mockResolvedValue([createMockRule()]);

      const request = new NextRequest("http://localhost:3000/api/rules");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rules).toHaveLength(1);
      expect(data.rules[0].name).toBe("Test Rule");
      expect(data.rules[0].channels).toEqual(["in-app"]);
      expect(data.rules[0].notificationCount).toBe(5);
    });

    it("should filter by eventType", async () => {
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/rules?eventType=order_created");
      await GET(request);

      expect(mockedPrisma.rule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: "order_created",
          }),
        })
      );
    });

    it("should filter by enabled status", async () => {
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/rules?enabled=true");
      await GET(request);

      expect(mockedPrisma.rule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });

  describe("POST /api/rules", () => {
    const validRuleData = {
      name: "New Rule",
      eventType: "payment_failed",
      channels: ["in-app"],
      conditions: [{ field: "amount", operator: "gt", value: "100" }],
    };

    it("should create rule with valid data", async () => {
      const createdRule = {
        ...createMockRule(),
        name: "New Rule",
        eventType: "payment_failed",
        conditions: [{ id: "c1", ruleId: "rule-1", field: "amount", operator: "gt", value: "100" }],
      };
      mockedPrisma.rule.create.mockResolvedValue(createdRule);

      const request = new NextRequest("http://localhost:3000/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRuleData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rule.name).toBe("New Rule");
    });

    it("should reject empty name", async () => {
      const request = new NextRequest("http://localhost:3000/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validRuleData, name: "" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid rule data");
    });

    it("should reject empty channels", async () => {
      const request = new NextRequest("http://localhost:3000/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validRuleData, channels: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should require webhook URL when webhook channel selected", async () => {
      const request = new NextRequest("http://localhost:3000/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validRuleData, channels: ["webhook"] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Webhook URL is required");
    });
  });

  describe("GET /api/rules/[id]", () => {
    it("should return single rule", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(createMockRule());

      const request = new NextRequest("http://localhost:3000/api/rules/rule-1");
      const response = await GET_ONE(request, { params: Promise.resolve({ id: "rule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rule.id).toBe("rule-1");
    });

    it("should return 404 for non-existent rule", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rules/unknown");
      const response = await GET_ONE(request, { params: Promise.resolve({ id: "unknown" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Rule not found");
    });
  });

  describe("PUT /api/rules/[id]", () => {
    it("should update rule", async () => {
      const existingRule = createMockRule();
      mockedPrisma.rule.findUnique.mockResolvedValue(existingRule);
      
      const updatedRule = { ...existingRule, name: "Updated Rule" };
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          condition: { deleteMany: vi.fn() },
          rule: { update: vi.fn().mockResolvedValue(updatedRule) },
        };
        return callback(tx);
      });

      const request = new NextRequest("http://localhost:3000/api/rules/rule-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Rule",
          eventType: "order_created",
          channels: ["in-app"],
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "rule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 404 for non-existent rule", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rules/unknown", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Rule",
          eventType: "order_created",
          channels: ["in-app"],
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "unknown" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/rules/[id]", () => {
    it("should delete rule", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(createMockRule());
      mockedPrisma.rule.delete.mockResolvedValue(createMockRule());

      const request = new NextRequest("http://localhost:3000/api/rules/rule-1", {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: "rule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Rule deleted successfully");
    });

    it("should return 404 for non-existent rule", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rules/unknown", {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: "unknown" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/rules/[id]", () => {
    it("should toggle enabled status", async () => {
      const existingRule = createMockRule({ enabled: true });
      mockedPrisma.rule.findUnique.mockResolvedValue(existingRule);
      mockedPrisma.rule.update.mockResolvedValue({ ...existingRule, enabled: false });

      const request = new NextRequest("http://localhost:3000/api/rules/rule-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: "rule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject non-boolean enabled value", async () => {
      mockedPrisma.rule.findUnique.mockResolvedValue(createMockRule());

      const request = new NextRequest("http://localhost:3000/api/rules/rule-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: "yes" }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: "rule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });
});
