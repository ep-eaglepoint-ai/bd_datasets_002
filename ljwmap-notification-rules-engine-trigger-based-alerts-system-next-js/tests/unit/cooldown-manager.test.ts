import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatCooldown, isWithinCooldown, getRemainingCooldown } from "@/lib/engine/cooldown-manager";
import type { RuleWithConditions } from "@/lib/types";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  default: {
    notification: {
      findFirst: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db";

const mockedPrisma = vi.mocked(prisma);

describe("cooldown-manager", () => {
  const createRule = (cooldownMs: number): RuleWithConditions => ({
    id: "rule-1",
    name: "Test Rule",
    description: null,
    eventType: "test_event",
    priority: "medium",
    cooldownMs,
    channels: '["in-app"]',
    webhookUrl: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conditions: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatCooldown", () => {
    it("should format milliseconds", () => {
      expect(formatCooldown(500)).toBe("500ms");
      expect(formatCooldown(999)).toBe("999ms");
    });

    it("should format seconds", () => {
      expect(formatCooldown(1000)).toBe("1s");
      expect(formatCooldown(5000)).toBe("5s");
      expect(formatCooldown(30000)).toBe("30s");
      expect(formatCooldown(59000)).toBe("59s");
    });

    it("should format minutes", () => {
      expect(formatCooldown(60000)).toBe("1min");
      expect(formatCooldown(300000)).toBe("5min");
      expect(formatCooldown(1800000)).toBe("30min");
    });

    it("should format hours", () => {
      expect(formatCooldown(3600000)).toBe("1h");
      expect(formatCooldown(7200000)).toBe("2h");
      expect(formatCooldown(86400000)).toBe("24h");
    });
  });

  describe("isWithinCooldown", () => {
    it("should return false when cooldownMs is 0", async () => {
      const rule = createRule(0);
      const result = await isWithinCooldown(rule);
      expect(result).toBe(false);
      expect(mockedPrisma.notification.findFirst).not.toHaveBeenCalled();
    });

    it("should return false when cooldownMs is negative", async () => {
      const rule = createRule(-1000);
      const result = await isWithinCooldown(rule);
      expect(result).toBe(false);
    });

    it("should return false when no previous notification exists", async () => {
      mockedPrisma.notification.findFirst.mockResolvedValue(null);
      
      const rule = createRule(60000);
      const result = await isWithinCooldown(rule);
      
      expect(result).toBe(false);
      expect(mockedPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { ruleId: "rule-1", status: "sent" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      });
    });

    it("should return false when notification has no sentAt", async () => {
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: null,
      } as any);
      
      const rule = createRule(60000);
      const result = await isWithinCooldown(rule);
      
      expect(result).toBe(false);
    });

    it("should return true when within cooldown period", async () => {
      const recentTime = new Date(Date.now() - 30000); // 30 seconds ago
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: recentTime,
      } as any);
      
      const rule = createRule(60000); // 1 minute cooldown
      const result = await isWithinCooldown(rule);
      
      expect(result).toBe(true);
    });

    it("should return false when cooldown has expired", async () => {
      const oldTime = new Date(Date.now() - 120000); // 2 minutes ago
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: oldTime,
      } as any);
      
      const rule = createRule(60000); // 1 minute cooldown
      const result = await isWithinCooldown(rule);
      
      expect(result).toBe(false);
    });
  });

  describe("getRemainingCooldown", () => {
    it("should return 0 when cooldownMs is 0", async () => {
      const rule = createRule(0);
      const result = await getRemainingCooldown(rule);
      expect(result).toBe(0);
    });

    it("should return 0 when no previous notification", async () => {
      mockedPrisma.notification.findFirst.mockResolvedValue(null);
      
      const rule = createRule(60000);
      const result = await getRemainingCooldown(rule);
      
      expect(result).toBe(0);
    });

    it("should return 0 when cooldown has expired", async () => {
      const oldTime = new Date(Date.now() - 120000); // 2 minutes ago
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: oldTime,
      } as any);
      
      const rule = createRule(60000); // 1 minute cooldown
      const result = await getRemainingCooldown(rule);
      
      expect(result).toBe(0);
    });

    it("should return remaining time when within cooldown", async () => {
      const recentTime = new Date(Date.now() - 30000); // 30 seconds ago
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: recentTime,
      } as any);
      
      const rule = createRule(60000); // 1 minute cooldown
      const result = await getRemainingCooldown(rule);
      
      // Should be approximately 30 seconds remaining (with some tolerance for test execution time)
      expect(result).toBeGreaterThan(25000);
      expect(result).toBeLessThanOrEqual(30000);
    });
  });
});
