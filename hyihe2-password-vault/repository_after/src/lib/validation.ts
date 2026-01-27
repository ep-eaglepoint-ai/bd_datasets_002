import { z } from "zod";

export const VaultItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  username: z.string(),
  password: z.string().min(1, "Password is required"),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  tags: z.preprocess(
    (val) => (typeof val === "string" ? val.split(",").map((t) => t.trim()).filter(Boolean) : val),
    z.array(z.string()).optional()
  ),
  category: z.string().optional(),
});

export type VaultItemSchemaType = z.infer<typeof VaultItemSchema>;

export const MasterPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const VaultBackupSchema = z.object({
  version: z.number(),
  timestamp: z.number().optional(),
  meta: z.object({
      salt: z.string(),
      validator: z.string(),
      validatorIv: z.string(),
      wrappedKey: z.string(),
      wrappedKeyIv: z.string(),
      autoLock: z.any().optional()
  }),
  items: z.array(z.any()) // Validation of items structure is skipped for now to avoid migration issues, or we can use z.array(z.object({ id: z.string(), ... }))
});
