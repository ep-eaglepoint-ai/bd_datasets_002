import type { Condition, EventPayload, Operator, ConditionEvaluationResult } from "../types";

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue({ user: { email: "test@example.com" } }, "user.email") => "test@example.com"
 */
export function getNestedValue(obj: EventPayload, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Evaluate a single condition against a value
 */
export function evaluateCondition(
  operator: Operator,
  actualValue: unknown,
  expectedValue: string
): boolean {
  // Handle null/undefined values
  if (actualValue === null || actualValue === undefined) {
    // For equality checks, compare against the string "null" or "undefined"
    if (operator === "eq") {
      return expectedValue === "null" || expectedValue === "undefined";
    }
    if (operator === "neq") {
      return expectedValue !== "null" && expectedValue !== "undefined";
    }
    return false;
  }

  switch (operator) {
    case "eq": {
      // String comparison (case-insensitive for strings)
      if (typeof actualValue === "string") {
        return actualValue.toLowerCase() === expectedValue.toLowerCase();
      }
      // Number comparison
      if (typeof actualValue === "number") {
        const expectedNum = parseFloat(expectedValue);
        return !isNaN(expectedNum) && actualValue === expectedNum;
      }
      // Boolean comparison
      if (typeof actualValue === "boolean") {
        return actualValue === (expectedValue.toLowerCase() === "true");
      }
      // Fallback to string comparison
      return String(actualValue) === expectedValue;
    }

    case "neq": {
      return !evaluateCondition("eq", actualValue, expectedValue);
    }

    case "gt": {
      const num = typeof actualValue === "number" ? actualValue : parseFloat(String(actualValue));
      const expectedNum = parseFloat(expectedValue);
      return !isNaN(num) && !isNaN(expectedNum) && num > expectedNum;
    }

    case "gte": {
      const num = typeof actualValue === "number" ? actualValue : parseFloat(String(actualValue));
      const expectedNum = parseFloat(expectedValue);
      return !isNaN(num) && !isNaN(expectedNum) && num >= expectedNum;
    }

    case "lt": {
      const num = typeof actualValue === "number" ? actualValue : parseFloat(String(actualValue));
      const expectedNum = parseFloat(expectedValue);
      return !isNaN(num) && !isNaN(expectedNum) && num < expectedNum;
    }

    case "lte": {
      const num = typeof actualValue === "number" ? actualValue : parseFloat(String(actualValue));
      const expectedNum = parseFloat(expectedValue);
      return !isNaN(num) && !isNaN(expectedNum) && num <= expectedNum;
    }

    case "contains": {
      const strValue = String(actualValue).toLowerCase();
      return strValue.includes(expectedValue.toLowerCase());
    }

    default:
      return false;
  }
}

/**
 * Evaluate all conditions for a rule against an event payload
 * All conditions must pass (AND logic)
 */
export function evaluateAllConditions(
  conditions: Condition[],
  payload: EventPayload
): { passed: boolean; results: ConditionEvaluationResult[] } {
  if (conditions.length === 0) {
    // No conditions means the rule matches all events of this type
    return { passed: true, results: [] };
  }

  const results: ConditionEvaluationResult[] = [];
  let allPassed = true;

  for (const condition of conditions) {
    const actualValue = getNestedValue(payload, condition.field);
    const passed = evaluateCondition(
      condition.operator as Operator,
      actualValue,
      condition.value
    );

    results.push({
      passed,
      field: condition.field,
      operator: condition.operator as Operator,
      expectedValue: condition.value,
      actualValue,
    });

    if (!passed) {
      allPassed = false;
    }
  }

  return { passed: allPassed, results };
}
