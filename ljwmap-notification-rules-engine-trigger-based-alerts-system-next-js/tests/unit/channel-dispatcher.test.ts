import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendInAppNotification } from "@/lib/channels/in-app";
import { sendWebhookNotification } from "@/lib/channels/webhook";
import type { NotificationPayload } from "@/lib/types";

describe("channel-dispatcher", () => {
  const createPayload = (overrides: Partial<NotificationPayload> = {}): NotificationPayload => ({
    ruleId: "rule-1",
    ruleName: "Test Rule",
    eventId: "event-1",
    eventType: "test_event",
    eventPayload: { data: "test" },
    priority: "high",
    channel: "in-app",
    webhookUrl: "https://example.com/webhook",
    ...overrides,
  });

  describe("sendInAppNotification", () => {
    it("should return success with metadata", async () => {
      const payload = createPayload({ channel: "in-app" });
      const result = await sendInAppNotification(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("in-app");
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.deliveryMethod).toBe("database");
      expect(result.metadata?.ruleName).toBe("Test Rule");
      expect(result.metadata?.eventType).toBe("test_event");
      expect(result.metadata?.priority).toBe("high");
    });

    it("should include timestamp in metadata", async () => {
      const payload = createPayload({ channel: "in-app" });
      const result = await sendInAppNotification(payload);

      expect(result.metadata?.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      expect(() => new Date(result.metadata?.timestamp as string)).not.toThrow();
    });
  });

  describe("sendWebhookNotification", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return error when no webhook URL is provided", async () => {
      const payload = createPayload({ webhookUrl: undefined, channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(false);
      expect(result.channel).toBe("webhook");
      expect(result.error).toBe("No webhook URL configured for this rule");
    });

    it("should return error when webhook URL is empty", async () => {
      const payload = createPayload({ webhookUrl: "", channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No webhook URL configured for this rule");
    });

    it("should return success when webhook responds with 200", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      global.fetch = mockFetch;

      const payload = createPayload({ channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("webhook");
      expect(result.metadata?.statusCode).toBe(200);
      expect(result.metadata?.url).toBe("https://example.com/webhook");
    });

    it("should send correct headers and payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      global.fetch = mockFetch;

      const payload = createPayload({ 
        channel: "webhook",
        eventType: "order_created",
        priority: "critical",
      });
      await sendWebhookNotification(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "User-Agent": "NotificationRulesEngine/1.0",
            "X-Event-Type": "order_created",
            "X-Priority": "critical",
          }),
        })
      );

      // Verify body contains expected structure
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.alert.ruleName).toBe("Test Rule");
      expect(body.alert.eventType).toBe("order_created");
      expect(body.event).toEqual({ data: "test" });
    });

    it("should return error for non-2xx response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: vi.fn().mockResolvedValue("Server error details"),
      });
      global.fetch = mockFetch;

      const payload = createPayload({ channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook returned 500: Internal Server Error");
      expect(result.metadata?.statusCode).toBe(500);
      expect(result.metadata?.responseBody).toBe("Server error details");
    });

    it("should handle network errors", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const payload = createPayload({ channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.metadata?.errorType).toBe("network");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Timeout");
      timeoutError.name = "TimeoutError";
      const mockFetch = vi.fn().mockRejectedValue(timeoutError);
      global.fetch = mockFetch;

      const payload = createPayload({ channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.success).toBe(false);
      expect(result.metadata?.errorType).toBe("timeout");
    });

    it("should truncate long error response bodies", async () => {
      const longErrorBody = "x".repeat(1000);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: vi.fn().mockResolvedValue(longErrorBody),
      });
      global.fetch = mockFetch;

      const payload = createPayload({ channel: "webhook" });
      const result = await sendWebhookNotification(payload);

      expect(result.metadata?.responseBody?.length).toBeLessThanOrEqual(500);
    });
  });
});
