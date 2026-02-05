import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRulesForEventType,
  evaluateRule,
  processEvent,
  testEvent,
} from "@/lib/engine/rule-evaluator";
import type { RuleWithConditions, Condition } from "@/lib/types";

// Mock the database
vi.mock("@/lib/db", () => ({
  default: {
    rule: {
      findMany: vi.fn(),
    },
    event: {
      create: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock fetch for webhook tests
global.fetch = vi.fn();

import prisma from "@/lib/db";

const mockedPrisma = vi.mocked(prisma);

describe("rule-evaluator", () => {
  const createRule = (overrides: Partial<RuleWithConditions> = {}): RuleWithConditions => ({
    id: "rule-1",
    name: "Test Rule",
    description: null,
    eventType: "order_created",
    priority: "medium",
    cooldownMs: 0,
    channels: '["in-app"]',
    webhookUrl: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conditions: [],
    ...overrides,
  });

  const createCondition = (overrides: Partial<Condition> = {}): Condition => ({
    id: "cond-1",
    ruleId: "rule-1",
    field: "status",
    operator: "eq",
    value: "failed",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for cooldown check - no previous notifications
    mockedPrisma.notification.findFirst.mockResolvedValue(null);
  });

  describe("getRulesForEventType", () => {
    it("should fetch enabled rules for event type", async () => {
      const mockRules = [createRule({ eventType: "order_created" })];
      mockedPrisma.rule.findMany.mockResolvedValue(mockRules);

      const result = await getRulesForEventType("order_created");

      expect(result).toEqual(mockRules);
      expect(mockedPrisma.rule.findMany).toHaveBeenCalledWith({
        where: {
          eventType: "order_created",
          enabled: true,
        },
        include: {
          conditions: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    });

    it("should return empty array when no rules match", async () => {
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const result = await getRulesForEventType("unknown_event");

      expect(result).toEqual([]);
    });

    it("should only return enabled rules", async () => {
      const enabledRule = createRule({ id: "rule-1", enabled: true });
      mockedPrisma.rule.findMany.mockResolvedValue([enabledRule]);

      const result = await getRulesForEventType("order_created");

      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(true);
    });
  });

  describe("evaluateRule", () => {
    it("should return matched=true when conditions pass", async () => {
      const rule = createRule({
        conditions: [createCondition({ field: "status", operator: "eq", value: "failed" })],
      });

      // Mock notification creation
      mockedPrisma.notification.create.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "pending",
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      });
      mockedPrisma.notification.update.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });
      mockedPrisma.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });

      const result = await evaluateRule(rule, "event-1", { status: "failed" });

      expect(result.matched).toBe(true);
      expect(result.ruleId).toBe("rule-1");
      expect(result.notifications).toBeDefined();
    });

    it("should return matched=false when conditions fail", async () => {
      const rule = createRule({
        conditions: [createCondition({ field: "status", operator: "eq", value: "failed" })],
      });

      const result = await evaluateRule(rule, "event-1", { status: "success" });

      expect(result.matched).toBe(false);
      expect(result.skippedReason).toBe("conditions_not_met");
    });

    it("should skip rule when within cooldown", async () => {
      const rule = createRule({ cooldownMs: 60000 });
      
      // Mock recent notification
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: new Date(Date.now() - 30000), // 30 seconds ago
      } as any);

      const result = await evaluateRule(rule, "event-1", { status: "failed" });

      expect(result.matched).toBe(false);
      expect(result.skippedReason).toBe("cooldown");
    });

    it("should match rule with no conditions", async () => {
      const rule = createRule({ conditions: [] });

      // Mock notification creation
      mockedPrisma.notification.create.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "pending",
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      });
      mockedPrisma.notification.update.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });
      mockedPrisma.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });

      const result = await evaluateRule(rule, "event-1", { anyData: "value" });

      expect(result.matched).toBe(true);
    });
  });

  describe("processEvent", () => {
    it("should store event and evaluate rules", async () => {
      const mockEvent = {
        id: "event-1",
        eventType: "order_created",
        payload: '{"orderId":"123"}',
        receivedAt: new Date(),
      };
      mockedPrisma.event.create.mockResolvedValue(mockEvent);
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const result = await processEvent("order_created", { orderId: "123" });

      expect(result.event.id).toBe("event-1");
      expect(result.event.eventType).toBe("order_created");
      expect(mockedPrisma.event.create).toHaveBeenCalledWith({
        data: {
          eventType: "order_created",
          payload: JSON.stringify({ orderId: "123" }),
        },
      });
    });

    it("should evaluate all matching rules", async () => {
      const mockEvent = {
        id: "event-1",
        eventType: "order_created",
        payload: "{}",
        receivedAt: new Date(),
      };
      const mockRules = [
        createRule({ id: "rule-1", name: "Rule 1", conditions: [] }),
        createRule({ id: "rule-2", name: "Rule 2", conditions: [] }),
      ];
      
      mockedPrisma.event.create.mockResolvedValue(mockEvent);
      mockedPrisma.rule.findMany.mockResolvedValue(mockRules);
      
      // Mock notification creation for both rules
      mockedPrisma.notification.create.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "pending",
        metadata: null,
        createdAt: new Date(),
        sentAt: null,
      });
      mockedPrisma.notification.update.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });
      mockedPrisma.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        ruleId: "rule-1",
        eventId: "event-1",
        channel: "in-app",
        status: "sent",
        metadata: "{}",
        createdAt: new Date(),
        sentAt: new Date(),
      });

      const result = await processEvent("order_created", {});

      expect(result.results).toHaveLength(2);
      expect(result.results[0].matched).toBe(true);
      expect(result.results[1].matched).toBe(true);
    });

    it("should return empty results when no rules match event type", async () => {
      const mockEvent = {
        id: "event-1",
        eventType: "unknown_event",
        payload: "{}",
        receivedAt: new Date(),
      };
      
      mockedPrisma.event.create.mockResolvedValue(mockEvent);
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const result = await processEvent("unknown_event", {});

      expect(result.results).toHaveLength(0);
    });
  });

  describe("testEvent", () => {
    it("should return matched rules without storing event", async () => {
      const mockRule = createRule({
        conditions: [createCondition({ field: "status", operator: "eq", value: "failed" })],
      });
      mockedPrisma.rule.findMany.mockResolvedValue([mockRule]);

      const result = await testEvent("order_created", { status: "failed" });

      expect(result.matchedRules).toHaveLength(1);
      expect(result.matchedRules[0].rule.id).toBe("rule-1");
      expect(mockedPrisma.event.create).not.toHaveBeenCalled();
    });

    it("should return unmatched rules with reason", async () => {
      const mockRule = createRule({
        conditions: [createCondition({ field: "status", operator: "eq", value: "failed" })],
      });
      mockedPrisma.rule.findMany.mockResolvedValue([mockRule]);

      const result = await testEvent("order_created", { status: "success" });

      expect(result.matchedRules).toHaveLength(0);
      expect(result.unmatchedRules).toHaveLength(1);
      expect(result.unmatchedRules[0].reason).toBe("Conditions not met");
    });

    it("should include condition evaluation details", async () => {
      const mockRule = createRule({
        conditions: [
          createCondition({ field: "status", operator: "eq", value: "failed" }),
          createCondition({ id: "cond-2", field: "amount", operator: "gt", value: "100" }),
        ],
      });
      mockedPrisma.rule.findMany.mockResolvedValue([mockRule]);

      const result = await testEvent("order_created", { status: "failed", amount: 50 });

      expect(result.unmatchedRules).toHaveLength(1);
      expect(result.unmatchedRules[0].conditionResults).toHaveLength(2);
      expect(result.unmatchedRules[0].conditionResults?.[0].passed).toBe(true);
      expect(result.unmatchedRules[0].conditionResults?.[1].passed).toBe(false);
    });

    it("should note cooldown warning in test mode", async () => {
      const mockRule = createRule({ cooldownMs: 60000, conditions: [] });
      mockedPrisma.rule.findMany.mockResolvedValue([mockRule]);
      
      // Mock recent notification - rule is in cooldown
      mockedPrisma.notification.findFirst.mockResolvedValue({
        sentAt: new Date(Date.now() - 30000), // 30 seconds ago
      } as any);

      const result = await testEvent("order_created", {});

      // Rule should be in matchedRules (because test mode doesn't skip)
      // But also in unmatchedRules with cooldown warning
      expect(result.matchedRules).toHaveLength(1);
      expect(result.unmatchedRules).toHaveLength(1);
      expect(result.unmatchedRules[0].reason).toContain("cooldown");
    });
  });

  describe("Event type filtering (Requirement 3)", () => {
    it("should only match rules with same event type", async () => {
      const orderRule = createRule({ id: "order-rule", eventType: "order_created" });
      const paymentRule = createRule({ id: "payment-rule", eventType: "payment_failed" });
      
      // First call for order_created
      mockedPrisma.rule.findMany.mockResolvedValueOnce([orderRule]);
      
      const orderResult = await getRulesForEventType("order_created");
      expect(orderResult).toHaveLength(1);
      expect(orderResult[0].eventType).toBe("order_created");

      // Second call for payment_failed
      mockedPrisma.rule.findMany.mockResolvedValueOnce([paymentRule]);
      
      const paymentResult = await getRulesForEventType("payment_failed");
      expect(paymentResult).toHaveLength(1);
      expect(paymentResult[0].eventType).toBe("payment_failed");
    });

    it("should not match disabled rules", async () => {
      mockedPrisma.rule.findMany.mockResolvedValue([]);

      const result = await getRulesForEventType("order_created");

      expect(result).toHaveLength(0);
      expect(mockedPrisma.rule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });
});
