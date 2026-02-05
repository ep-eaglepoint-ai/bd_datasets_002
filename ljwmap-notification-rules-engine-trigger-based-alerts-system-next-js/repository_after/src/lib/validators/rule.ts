import { z } from "zod";

export const operatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]);

export const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const channelSchema = z.enum(["in-app", "webhook"]);

export const conditionSchema = z.object({
  id: z.string().optional(), // Optional for new conditions
  field: z
    .string()
    .min(1, "Field is required")
    .max(100, "Field must be 100 characters or less"),
  operator: operatorSchema,
  value: z.string().max(500, "Value must be 500 characters or less"),
});

export const ruleSchema = z.object({
  name: z
    .string()
    .min(1, "Rule name is required")
    .max(100, "Rule name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  eventType: z
    .string()
    .min(1, "Event type is required")
    .max(100, "Event type must be 100 characters or less"),
  priority: prioritySchema.default("medium"),
  cooldownMs: z
    .number()
    .int()
    .min(0, "Cooldown must be non-negative")
    .max(86400000, "Cooldown must be 24 hours or less") // Max 24 hours
    .default(0),
  channels: z.array(channelSchema).min(1, "At least one channel is required"),
  webhookUrl: z
    .string()
    .url("Invalid webhook URL")
    .max(500, "Webhook URL must be 500 characters or less")
    .optional()
    .nullable(),
  enabled: z.boolean().default(true),
  conditions: z.array(conditionSchema).default([]),
});

export type RuleInput = z.infer<typeof ruleSchema>;
export type ConditionInput = z.infer<typeof conditionSchema>;

// Operator labels for UI
export const OPERATORS = [
  { id: "eq", label: "equals", description: "Value equals" },
  { id: "neq", label: "not equals", description: "Value does not equal" },
  { id: "gt", label: ">", description: "Greater than (numeric)" },
  { id: "gte", label: ">=", description: "Greater than or equal (numeric)" },
  { id: "lt", label: "<", description: "Less than (numeric)" },
  { id: "lte", label: "<=", description: "Less than or equal (numeric)" },
  { id: "contains", label: "contains", description: "String contains substring" },
] as const;

// Priority labels for UI
export const PRIORITIES = [
  { id: "low", label: "Low", color: "gray" },
  { id: "medium", label: "Medium", color: "blue" },
  { id: "high", label: "High", color: "orange" },
  { id: "critical", label: "Critical", color: "red" },
] as const;
