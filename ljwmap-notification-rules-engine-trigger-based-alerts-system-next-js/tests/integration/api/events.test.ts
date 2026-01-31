import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/route";
import { NextRequest } from "next/server";

// Mock the engine
vi.mock("@/lib/engine", () => ({
  processEvent: vi.fn(),
}));

import { processEvent } from "@/lib/engine";

const mockedProcessEvent = vi.mocked(processEvent);

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest("http://localhost:3000/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("should accept valid event and return evaluation results", async () => {
    mockedProcessEvent.mockResolvedValue({
      event: { id: "event-1", eventType: "order_created" },
      results: [
        { ruleId: "rule-1", ruleName: "Test Rule", matched: true, notifications: [] },
      ],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: { orderId: "123", amount: 100 },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.event.id).toBe("event-1");
    expect(data.summary.rulesEvaluated).toBe(1);
    expect(data.summary.rulesMatched).toBe(1);
  });

  it("should reject missing eventType", async () => {
    const request = createRequest({
      payload: { orderId: "123" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid event payload");
    expect(data.details).toBeDefined();
  });

  it("should reject empty eventType", async () => {
    const request = createRequest({
      eventType: "",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid event payload");
  });

  it("should reject invalid eventType format (uppercase)", async () => {
    const request = createRequest({
      eventType: "Order_Created",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid event payload");
  });

  it("should reject eventType starting with number", async () => {
    const request = createRequest({
      eventType: "123_event",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("should accept event with empty payload", async () => {
    mockedProcessEvent.mockResolvedValue({
      event: { id: "event-1", eventType: "test_event" },
      results: [],
    });

    const request = createRequest({
      eventType: "test_event",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return correct notification count summary", async () => {
    mockedProcessEvent.mockResolvedValue({
      event: { id: "event-1", eventType: "order_created" },
      results: [
        { 
          ruleId: "rule-1", 
          ruleName: "Rule 1", 
          matched: true, 
          notifications: [{ id: "n1" } as any, { id: "n2" } as any] 
        },
        { 
          ruleId: "rule-2", 
          ruleName: "Rule 2", 
          matched: false, 
          skippedReason: "conditions_not_met" as const 
        },
        { 
          ruleId: "rule-3", 
          ruleName: "Rule 3", 
          matched: true, 
          notifications: [{ id: "n3" } as any] 
        },
      ],
    });

    const request = createRequest({
      eventType: "order_created",
      payload: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.summary.rulesEvaluated).toBe(3);
    expect(data.summary.rulesMatched).toBe(2);
    expect(data.summary.notificationsCreated).toBe(3);
  });

  it("should handle server errors gracefully", async () => {
    mockedProcessEvent.mockRejectedValue(new Error("Database error"));

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
