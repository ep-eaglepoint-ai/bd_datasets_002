export { sendInAppNotification } from "./in-app";
export { sendWebhookNotification } from "./webhook";

// Channel types for easy reference
export const AVAILABLE_CHANNELS = [
  { id: "in-app", name: "In-App", description: "Store notification for in-app display" },
  { id: "webhook", name: "Webhook", description: "Send HTTP POST to external URL" },
] as const;

export type AvailableChannel = (typeof AVAILABLE_CHANNELS)[number]["id"];
