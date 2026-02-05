import type { NotificationPayload, SendResult } from "../types";

/**
 * In-app notification sender
 * For this implementation, in-app notifications are stored in the database
 * and can be queried by the frontend to display to users
 */
export async function sendInAppNotification(
  payload: NotificationPayload
): Promise<SendResult> {
  // In-app notifications are simply stored in the database
  // The notification record is already created by the dispatcher
  // This function just confirms the "send" was successful

  // In a real application, you might:
  // - Push to a real-time channel (WebSocket, SSE, etc.)
  // - Send to a push notification service
  // - Queue for batch processing

  return {
    success: true,
    channel: "in-app",
    metadata: {
      deliveryMethod: "database",
      timestamp: new Date().toISOString(),
      ruleName: payload.ruleName,
      eventType: payload.eventType,
      priority: payload.priority,
    },
  };
}
