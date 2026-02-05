import type { NotificationPayload, SendResult } from "../types";

/**
 * Webhook notification sender
 * Sends a POST request to the configured webhook URL with the event payload
 */
export async function sendWebhookNotification(
  payload: NotificationPayload
): Promise<SendResult> {
  const { webhookUrl, ruleName, eventType, eventPayload, priority } = payload;

  // If no webhook URL is configured, fail gracefully
  if (!webhookUrl) {
    return {
      success: false,
      channel: "webhook",
      error: "No webhook URL configured for this rule",
    };
  }

  try {
    // Prepare the webhook payload
    const webhookPayload = {
      alert: {
        ruleName,
        eventType,
        priority,
        timestamp: new Date().toISOString(),
      },
      event: eventPayload,
    };

    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NotificationRulesEngine/1.0",
        "X-Event-Type": eventType,
        "X-Priority": priority,
      },
      body: JSON.stringify(webhookPayload),
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return {
        success: true,
        channel: "webhook",
        metadata: {
          url: webhookUrl,
          statusCode: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // Non-2xx response
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        // Ignore error reading body
      }

      return {
        success: false,
        channel: "webhook",
        error: `Webhook returned ${response.status}: ${response.statusText}`,
        metadata: {
          url: webhookUrl,
          statusCode: response.status,
          statusText: response.statusText,
          responseBody: errorBody?.substring(0, 500), // Limit error body size
        },
      };
    }
  } catch (error) {
    // Network or timeout error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error sending webhook";

    return {
      success: false,
      channel: "webhook",
      error: errorMessage,
      metadata: {
        url: webhookUrl,
        errorType:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "network",
      },
    };
  }
}
