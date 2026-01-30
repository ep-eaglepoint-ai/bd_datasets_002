import { z } from "zod";

export const TemplateItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Item text is required"),
  description: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number().default(0),
});

export const TemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(TemplateItemSchema).default([]),
});

export const CreateInstanceSchema = z.object({
  templateId: z.string(),
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
});

export const UpdateInstanceItemSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
});

export const UpdateInstanceStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
});
