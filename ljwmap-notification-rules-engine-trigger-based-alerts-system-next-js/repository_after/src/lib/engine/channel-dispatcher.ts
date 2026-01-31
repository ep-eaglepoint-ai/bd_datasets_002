import prisma from "../db";
import type { NotificationPayload, SendResult, Channel, Notification } from "../types";
import { sendInAppNotification } from "../channels/in-app";
import { sendWebhookNotification } from "../channels/webhook";

/**
 * Channel sender registry
 */
const channelSenders: Record<Channel, (payload: NotificationPayload) => Promise<SendResult>> = {
  "in-app": sendInAppNotification,
  webhook: sendWebhookNotification,
};

/**
 * Dispatch a notification to a specific channel
 */
export async function dispatchToChannel(
  payload: NotificationPayload
): Promise<{ notification: Notification; result: SendResult }> {
  const sender = channelSenders[payload.channel];

  if (!sender) {
    // Create failed notification record
    const notification = await prisma.notification.create({
      data: {
        ruleId: payload.ruleId,
        eventId: payload.eventId,
        channel: payload.channel,
        status: "failed",
        metadata: JSON.stringify({ error: `Unknown channel: ${payload.channel}` }),
      },
    });

    return {
      notification,
      result: {
        success: false,
        channel: payload.channel,
        error: `Unknown channel: ${payload.channel}`,
      },
    };
  }

  // Create pending notification record
  const notification = await prisma.notification.create({
    data: {
      ruleId: payload.ruleId,
      eventId: payload.eventId,
      channel: payload.channel,
      status: "pending",
    },
  });

  try {
    // Send the notification
    const result = await sender(payload);

    // Update notification status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : null,
        metadata: JSON.stringify(result.metadata || { error: result.error }),
      },
    });

    // Return the updated notification
    const updatedNotification = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    return {
      notification: updatedNotification!,
      result,
    };
  } catch (error) {
    // Update notification as failed
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "failed",
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      },
    });

    const updatedNotification = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    return {
      notification: updatedNotification!,
      result: {
        success: false,
        channel: payload.channel,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Dispatch notifications to all specified channels
 */
export async function dispatchToAllChannels(
  payload: Omit<NotificationPayload, "channel">,
  channels: Channel[]
): Promise<Array<{ notification: Notification; result: SendResult }>> {
  const results = await Promise.all(
    channels.map((channel) =>
      dispatchToChannel({
        ...payload,
        channel,
      })
    )
  );

  return results;
}

/**
 * Register a new channel sender
 */
export function registerChannel(
  name: Channel,
  sender: (payload: NotificationPayload) => Promise<SendResult>
): void {
  channelSenders[name] = sender;
}
