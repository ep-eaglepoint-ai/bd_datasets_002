import { z } from "zod";

// Define Flag Types
export const FlagTypeSchema = z.enum(["BOOLEAN", "PERCENTAGE", "ENUM"]);
export type FlagType = z.infer<typeof FlagTypeSchema>;

// Base Flag Schema
const BaseFlagSchema = z.object({
  id: z.string().uuid(),
  key: z
    .string()
    .min(1, "Key is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Key must be lowercase alphanumeric with underscores",
    ),
  description: z.string().optional(),
  enabled: z.boolean(),
});

// Discriminated Union for Flag Values
export const BooleanFlagSchema = BaseFlagSchema.extend({
  type: z.literal("BOOLEAN"),
  value: z.boolean(),
});

export const PercentageFlagSchema = BaseFlagSchema.extend({
  type: z.literal("PERCENTAGE"),
  value: z.number().int().min(0).max(100),
});

export const EnumFlagSchema = BaseFlagSchema.extend({
  type: z.literal("ENUM"),
  options: z.array(z.string()).min(1),
  value: z.string(),
}).refine((data) => data.options.includes(data.value), {
  message: "Value must be one of the defined options",
  path: ["value"],
});

export const FeatureFlagSchema = z.discriminatedUnion("type", [
  BooleanFlagSchema,
  PercentageFlagSchema,
  EnumFlagSchema,
]);

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

// Configuration Schema (for the file)
export const ConfigurationSchema = z.object({
  version_id: z.string().uuid(), // Or number, instructions mentioned UUID or integer. I'll use UUID for collision safety.
  flags: z.array(FeatureFlagSchema),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

// API Request Schema for saving
export const SyncRequestSchema = z.object({
  version_id: z.string().uuid(), // The version the client *started* with
  flags: z.array(FeatureFlagSchema),
});

export type SyncRequest = z.infer<typeof SyncRequestSchema>;
