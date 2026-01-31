import { describe, it, expect } from "vitest";
import { eventSchema } from "@/lib/validators/event";
import { ruleSchema, conditionSchema, operatorSchema, prioritySchema, channelSchema } from "@/lib/validators/rule";

describe("validators", () => {
  describe("eventSchema", () => {
    it("should accept valid event", () => {
      const result = eventSchema.safeParse({
        eventType: "order_created",
        payload: { orderId: "123", amount: 100 },
      });
      expect(result.success).toBe(true);
    });

    it("should accept event with empty payload", () => {
      const result = eventSchema.safeParse({
        eventType: "test_event",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payload).toEqual({});
      }
    });

    it("should accept event with timestamp", () => {
      const result = eventSchema.safeParse({
        eventType: "test_event",
        payload: {},
        timestamp: "2024-01-15T10:30:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty event type", () => {
      const result = eventSchema.safeParse({
        eventType: "",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject event type starting with number", () => {
      const result = eventSchema.safeParse({
        eventType: "123_event",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject event type with uppercase letters", () => {
      const result = eventSchema.safeParse({
        eventType: "Order_Created",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject event type with spaces", () => {
      const result = eventSchema.safeParse({
        eventType: "order created",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject event type with special characters", () => {
      const result = eventSchema.safeParse({
        eventType: "order-created",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("should accept event type with underscores", () => {
      const result = eventSchema.safeParse({
        eventType: "order_status_changed",
        payload: {},
      });
      expect(result.success).toBe(true);
    });

    it("should reject event type over 100 characters", () => {
      const result = eventSchema.safeParse({
        eventType: "a".repeat(101),
        payload: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("operatorSchema", () => {
    it("should accept valid operators", () => {
      const validOperators = ["eq", "neq", "gt", "gte", "lt", "lte", "contains"];
      validOperators.forEach((op) => {
        const result = operatorSchema.safeParse(op);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid operator", () => {
      const result = operatorSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  describe("prioritySchema", () => {
    it("should accept valid priorities", () => {
      const validPriorities = ["low", "medium", "high", "critical"];
      validPriorities.forEach((priority) => {
        const result = prioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid priority", () => {
      const result = prioritySchema.safeParse("urgent");
      expect(result.success).toBe(false);
    });
  });

  describe("channelSchema", () => {
    it("should accept valid channels", () => {
      const validChannels = ["in-app", "webhook"];
      validChannels.forEach((channel) => {
        const result = channelSchema.safeParse(channel);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid channel", () => {
      const result = channelSchema.safeParse("email");
      expect(result.success).toBe(false);
    });
  });

  describe("conditionSchema", () => {
    it("should accept valid condition", () => {
      const result = conditionSchema.safeParse({
        field: "status",
        operator: "eq",
        value: "failed",
      });
      expect(result.success).toBe(true);
    });

    it("should accept condition with optional id", () => {
      const result = conditionSchema.safeParse({
        id: "cond-1",
        field: "amount",
        operator: "gt",
        value: "100",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty field", () => {
      const result = conditionSchema.safeParse({
        field: "",
        operator: "eq",
        value: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid operator", () => {
      const result = conditionSchema.safeParse({
        field: "status",
        operator: "invalid",
        value: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject field over 100 characters", () => {
      const result = conditionSchema.safeParse({
        field: "a".repeat(101),
        operator: "eq",
        value: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject value over 500 characters", () => {
      const result = conditionSchema.safeParse({
        field: "status",
        operator: "eq",
        value: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ruleSchema", () => {
    const validRule = {
      name: "Test Rule",
      eventType: "order_created",
      channels: ["in-app"],
    };

    it("should accept valid rule with minimal fields", () => {
      const result = ruleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("medium");
        expect(result.data.cooldownMs).toBe(0);
        expect(result.data.enabled).toBe(true);
        expect(result.data.conditions).toEqual([]);
      }
    });

    it("should accept rule with all fields", () => {
      const fullRule = {
        name: "Full Rule",
        description: "A complete rule",
        eventType: "payment_failed",
        priority: "critical",
        cooldownMs: 60000,
        channels: ["in-app", "webhook"],
        webhookUrl: "https://example.com/webhook",
        enabled: true,
        conditions: [
          { field: "amount", operator: "gt", value: "1000" },
        ],
      };
      const result = ruleSchema.safeParse(fullRule);
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name over 100 characters", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty channels array", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        channels: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid channel", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        channels: ["email"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative cooldown", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        cooldownMs: -1000,
      });
      expect(result.success).toBe(false);
    });

    it("should reject cooldown over 24 hours", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        cooldownMs: 86400001, // Over 24 hours
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid webhook URL", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        channels: ["webhook"],
        webhookUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid webhook URL", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        channels: ["webhook"],
        webhookUrl: "https://example.com/webhook",
      });
      expect(result.success).toBe(true);
    });

    it("should accept nullable webhook URL", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        webhookUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject description over 500 characters", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        description: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should accept rule with multiple conditions", () => {
      const result = ruleSchema.safeParse({
        ...validRule,
        conditions: [
          { field: "status", operator: "eq", value: "failed" },
          { field: "amount", operator: "gt", value: "100" },
          { field: "user.type", operator: "eq", value: "vip" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
