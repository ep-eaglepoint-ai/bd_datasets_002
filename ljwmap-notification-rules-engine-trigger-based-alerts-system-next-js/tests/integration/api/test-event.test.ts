import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/test-event/route";
import { NextRequest } from "next/server";

// Mock the engine
vi.mock("@/lib/engine", () => ({
  testEvent: vi.fn(),
}));

import { testEvent } from "@/lib/engine";

const mockedTestEvent = vi.mocked(testEvent);

describe("POST /api/test-event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost:3000/api/test-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const createMockRule = (overrides = {}) => ({
    id: "rule-1",
    name: "Test Rule",
    description: "Test description",
    eventType: "order_created",
    priority: "high",
    cooldownMs: 0,
    channels: '["in-app"]',
    webhookUrl: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    conditions: [],
    ...overrides,
  });

  it("should return matched rules without storing event", async () => {
    mockedTestEvent.mockResolvedValue({
      matchedRules: [
        {
          rule: createMockRule(),
          conditionResults: [],
        },
      ],
      unmatchedRules: [],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: { status: "failed" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.matchedRules).toHaveLength(1);
    expect(data.matchedRules[0].name).toBe("Test Rule");
  });

  it("should return unmatched rules with reason", async () => {
    mockedTestEvent.mockResolvedValue({
      matchedRules: [],
      unmatchedRules: [
        {
          rule: createMockRule(),
          reason: "Conditions not met",
          conditionResults: [
            { field: "status", operator: "eq", expected: "failed", actual: "success", passed: false },
          ],
        },
      ],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: { status: "success" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.unmatchedRules).toHaveLength(1);
    expect(data.unmatchedRules[0].reason).toBe("Conditions not met");
  });

  it("should include condition evaluation details", async () => {
    mockedTestEvent.mockResolvedValue({
      matchedRules: [
        {
          rule: createMockRule(),
          conditionResults: [
            { field: "status", operator: "eq", expected: "failed", actual: "failed", passed: true },
            { field: "amount", operator: "gt", expected: "100", actual: 150, passed: true },
          ],
        },
      ],
      unmatchedRules: [],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: { status: "failed", amount: 150 },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.matchedRules[0].conditionResults).toHaveLength(2);
    expect(data.matchedRules[0].conditionResults[0].passed).toBe(true);
    expect(data.matchedRules[0].conditionResults[1].actual).toBe(150);
  });

  it("should parse channels from JSON string", async () => {
    mockedTestEvent.mockResolvedValue({
      matchedRules: [
        {
          rule: createMockRule({ channels: '["in-app", "webhook"]' }),
          conditionResults: [],
        },
      ],
      unmatchedRules: [],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.matchedRules[0].channels).toEqual(["in-app", "webhook"]);
  });

  it("should reject invalid event type", async () => {
    const request = createRequest({
      eventType: "Invalid_Event",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid event payload");
  });

  it("should reject missing event type", async () => {
    const request = createRequest({
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("should echo back event type and payload", async () => {
    mockedTestEvent.mockResolvedValue({
      matchedRules: [],
      unmatchedRules: [],
    });

    const request = createRequest({
      eventType: "test_event",
      payload: { key: "value", nested: { data: 123 } },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.eventType).toBe("test_event");
    expect(data.payload).toEqual({ key: "value", nested: { data: 123 } });
  });

  it("should handle server errors gracefully", async () => {
    mockedTestEvent.mockRejectedValue(new Error("Database error"));

    const request = createRequest({
      eventType: "order_created",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
