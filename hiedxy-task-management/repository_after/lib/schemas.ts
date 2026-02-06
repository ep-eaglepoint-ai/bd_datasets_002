import { z } from "zod";

export const PrioritySchema = z.enum(["low", "medium", "high"]);
export const StatusSchema = z.enum([
  "pending",
  "in-progress",
  "paused",
  "completed",
  "abandoned",
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: PrioritySchema.default("medium"),
  status: StatusSchema.default("pending"),
  estimatedDuration: z.number().nonnegative().optional(), // in minutes
  dueDate: z.date().optional(), // persisted as ISO string usually, but loaded as Date
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TimeLogSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date().nullable().optional(),
  duration: z.number().int().nonnegative().default(0), // in seconds
  notes: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type TimeLog = z.infer<typeof TimeLogSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Status = z.infer<typeof StatusSchema>;
