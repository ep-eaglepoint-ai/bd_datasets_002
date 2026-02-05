import { describe, it, expect } from "vitest";
import {
  getNestedValue,
  evaluateCondition,
  evaluateAllConditions,
} from "@/lib/engine/condition-matcher";
import type { Condition } from "@/lib/types";

describe("condition-matcher", () => {
  describe("getNestedValue", () => {
    it("should get simple field value", () => {
      const obj = { status: "active" };
      expect(getNestedValue(obj, "status")).toBe("active");
    });

    it("should get nested field value with dot notation", () => {
      const obj = { user: { email: "test@example.com" } };
      expect(getNestedValue(obj, "user.email")).toBe("test@example.com");
    });

    it("should get deeply nested field value", () => {
      const obj = { order: { customer: { address: { city: "NYC" } } } };
      expect(getNestedValue(obj, "order.customer.address.city")).toBe("NYC");
    });

    it("should get array element by index", () => {
      const obj = { items: [{ price: 100 }, { price: 200 }] };
      expect(getNestedValue(obj, "items.0.price")).toBe(100);
      expect(getNestedValue(obj, "items.1.price")).toBe(200);
    });

    it("should return undefined for missing field", () => {
      const obj = { status: "active" };
      expect(getNestedValue(obj, "nonexistent")).toBeUndefined();
    });

    it("should return undefined for missing nested field", () => {
      const obj = { user: { name: "John" } };
      expect(getNestedValue(obj, "user.email")).toBeUndefined();
    });

    it("should return undefined when traversing through null", () => {
      const obj = { user: null };
      expect(getNestedValue(obj, "user.email")).toBeUndefined();
    });

    it("should return undefined when traversing through undefined", () => {
      const obj = { user: undefined };
      expect(getNestedValue(obj, "user.email")).toBeUndefined();
    });

    it("should handle numeric values", () => {
      const obj = { amount: 1500 };
      expect(getNestedValue(obj, "amount")).toBe(1500);
    });

    it("should handle boolean values", () => {
      const obj = { enabled: true };
      expect(getNestedValue(obj, "enabled")).toBe(true);
    });
  });

  describe("evaluateCondition", () => {
    describe("eq operator", () => {
      it("should match equal strings (case-insensitive)", () => {
        expect(evaluateCondition("eq", "active", "active")).toBe(true);
        expect(evaluateCondition("eq", "ACTIVE", "active")).toBe(true);
        expect(evaluateCondition("eq", "Active", "ACTIVE")).toBe(true);
      });

      it("should not match different strings", () => {
        expect(evaluateCondition("eq", "active", "inactive")).toBe(false);
      });

      it("should match equal numbers", () => {
        expect(evaluateCondition("eq", 100, "100")).toBe(true);
        expect(evaluateCondition("eq", 100.5, "100.5")).toBe(true);
      });

      it("should not match different numbers", () => {
        expect(evaluateCondition("eq", 100, "200")).toBe(false);
      });

      it("should match equal booleans", () => {
        expect(evaluateCondition("eq", true, "true")).toBe(true);
        expect(evaluateCondition("eq", false, "false")).toBe(true);
      });

      it("should not match different booleans", () => {
        expect(evaluateCondition("eq", true, "false")).toBe(false);
        expect(evaluateCondition("eq", false, "true")).toBe(false);
      });

      it("should handle null value with 'null' string", () => {
        expect(evaluateCondition("eq", null, "null")).toBe(true);
      });

      it("should handle undefined value with 'undefined' string", () => {
        expect(evaluateCondition("eq", undefined, "undefined")).toBe(true);
      });
    });

    describe("neq operator", () => {
      it("should return true for different strings", () => {
        expect(evaluateCondition("neq", "active", "inactive")).toBe(true);
      });

      it("should return false for equal strings", () => {
        expect(evaluateCondition("neq", "active", "active")).toBe(false);
      });

      it("should return true for different numbers", () => {
        expect(evaluateCondition("neq", 100, "200")).toBe(true);
      });

      it("should return false for equal numbers", () => {
        expect(evaluateCondition("neq", 100, "100")).toBe(false);
      });
    });

    describe("gt operator", () => {
      it("should return true when value is greater", () => {
        expect(evaluateCondition("gt", 150, "100")).toBe(true);
      });

      it("should return false when value is equal", () => {
        expect(evaluateCondition("gt", 100, "100")).toBe(false);
      });

      it("should return false when value is less", () => {
        expect(evaluateCondition("gt", 50, "100")).toBe(false);
      });

      it("should handle string numbers", () => {
        expect(evaluateCondition("gt", "150", "100")).toBe(true);
      });

      it("should return false for non-numeric values", () => {
        expect(evaluateCondition("gt", "abc", "100")).toBe(false);
      });

      it("should return false for null", () => {
        expect(evaluateCondition("gt", null, "100")).toBe(false);
      });
    });

    describe("gte operator", () => {
      it("should return true when value is greater", () => {
        expect(evaluateCondition("gte", 150, "100")).toBe(true);
      });

      it("should return true when value is equal", () => {
        expect(evaluateCondition("gte", 100, "100")).toBe(true);
      });

      it("should return false when value is less", () => {
        expect(evaluateCondition("gte", 50, "100")).toBe(false);
      });
    });

    describe("lt operator", () => {
      it("should return true when value is less", () => {
        expect(evaluateCondition("lt", 50, "100")).toBe(true);
      });

      it("should return false when value is equal", () => {
        expect(evaluateCondition("lt", 100, "100")).toBe(false);
      });

      it("should return false when value is greater", () => {
        expect(evaluateCondition("lt", 150, "100")).toBe(false);
      });
    });

    describe("lte operator", () => {
      it("should return true when value is less", () => {
        expect(evaluateCondition("lte", 50, "100")).toBe(true);
      });

      it("should return true when value is equal", () => {
        expect(evaluateCondition("lte", 100, "100")).toBe(true);
      });

      it("should return false when value is greater", () => {
        expect(evaluateCondition("lte", 150, "100")).toBe(false);
      });
    });

    describe("contains operator", () => {
      it("should return true when string contains substring", () => {
        expect(evaluateCondition("contains", "hello world", "world")).toBe(true);
      });

      it("should be case-insensitive", () => {
        expect(evaluateCondition("contains", "Hello World", "WORLD")).toBe(true);
        expect(evaluateCondition("contains", "HELLO WORLD", "world")).toBe(true);
      });

      it("should return false when string does not contain substring", () => {
        expect(evaluateCondition("contains", "hello", "world")).toBe(false);
      });

      it("should handle numbers converted to strings", () => {
        expect(evaluateCondition("contains", 12345, "234")).toBe(true);
      });

      it("should return false for null", () => {
        expect(evaluateCondition("contains", null, "test")).toBe(false);
      });
    });

    describe("unknown operator", () => {
      it("should return false for unknown operators", () => {
        expect(evaluateCondition("unknown" as any, "value", "value")).toBe(false);
      });
    });
  });

  describe("evaluateAllConditions", () => {
    it("should return passed=true for empty conditions", () => {
      const result = evaluateAllConditions([], { status: "active" });
      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it("should evaluate single condition correctly", () => {
      const conditions: Condition[] = [
        { id: "1", ruleId: "rule1", field: "status", operator: "eq", value: "failed" },
      ];
      const payload = { status: "failed" };
      
      const result = evaluateAllConditions(conditions, payload);
      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(true);
    });

    it("should return passed=false when condition fails", () => {
      const conditions: Condition[] = [
        { id: "1", ruleId: "rule1", field: "status", operator: "eq", value: "failed" },
      ];
      const payload = { status: "success" };
      
      const result = evaluateAllConditions(conditions, payload);
      expect(result.passed).toBe(false);
      expect(result.results[0].passed).toBe(false);
    });

    it("should use AND logic - all conditions must pass", () => {
      const conditions: Condition[] = [
        { id: "1", ruleId: "rule1", field: "status", operator: "eq", value: "failed" },
        { id: "2", ruleId: "rule1", field: "amount", operator: "gt", value: "100" },
      ];
      
      // Both pass
      const result1 = evaluateAllConditions(conditions, { status: "failed", amount: 150 });
      expect(result1.passed).toBe(true);
      
      // First fails
      const result2 = evaluateAllConditions(conditions, { status: "success", amount: 150 });
      expect(result2.passed).toBe(false);
      
      // Second fails
      const result3 = evaluateAllConditions(conditions, { status: "failed", amount: 50 });
      expect(result3.passed).toBe(false);
      
      // Both fail
      const result4 = evaluateAllConditions(conditions, { status: "success", amount: 50 });
      expect(result4.passed).toBe(false);
    });

    it("should handle nested field access in conditions", () => {
      const conditions: Condition[] = [
        { id: "1", ruleId: "rule1", field: "user.type", operator: "eq", value: "vip" },
      ];
      const payload = { user: { type: "vip", name: "John" } };
      
      const result = evaluateAllConditions(conditions, payload);
      expect(result.passed).toBe(true);
    });

    it("should return detailed results for each condition", () => {
      const conditions: Condition[] = [
        { id: "1", ruleId: "rule1", field: "status", operator: "eq", value: "failed" },
        { id: "2", ruleId: "rule1", field: "amount", operator: "gt", value: "100" },
      ];
      const payload = { status: "failed", amount: 50 };
      
      const result = evaluateAllConditions(conditions, payload);
      expect(result.results).toHaveLength(2);
      
      expect(result.results[0].field).toBe("status");
      expect(result.results[0].operator).toBe("eq");
      expect(result.results[0].expectedValue).toBe("failed");
      expect(result.results[0].actualValue).toBe("failed");
      expect(result.results[0].passed).toBe(true);
      
      expect(result.results[1].field).toBe("amount");
      expect(result.results[1].operator).toBe("gt");
      expect(result.results[1].expectedValue).toBe("100");
      expect(result.results[1].actualValue).toBe(50);
      expect(result.results[1].passed).toBe(false);
    });
  });
});
