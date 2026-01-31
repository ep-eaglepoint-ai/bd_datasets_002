import { z } from "zod";

export const eventSchema = z.object({
  eventType: z
    .string()
    .min(1, "Event type is required")
    .max(100, "Event type must be 100 characters or less")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Event type must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  payload: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime().optional(),
});

export type EventInput = z.infer<typeof eventSchema>;

// Common event types for reference
export const COMMON_EVENT_TYPES = [
  { id: "order_created", name: "Order Created", description: "When a new order is placed" },
  { id: "order_status_changed", name: "Order Status Changed", description: "When order status updates" },
  { id: "payment_failed", name: "Payment Failed", description: "When a payment attempt fails" },
  { id: "payment_succeeded", name: "Payment Succeeded", description: "When a payment is successful" },
  { id: "user_registered", name: "User Registered", description: "When a new user signs up" },
  { id: "user_login_failed", name: "User Login Failed", description: "When login attempt fails" },
  { id: "inventory_low", name: "Inventory Low", description: "When stock falls below threshold" },
  { id: "error_occurred", name: "Error Occurred", description: "When a system error occurs" },
] as const;
