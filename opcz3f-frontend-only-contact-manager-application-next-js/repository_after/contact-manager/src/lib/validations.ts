import { z } from 'zod';

export const contactMethodSchema = z.object({
  id: z.string(),
  type: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  emails: z.array(contactMethodSchema.extend({
    value: z.string().email("Invalid email address"),
  })),
  phones: z.array(contactMethodSchema.extend({
    value: z.string().min(3, "Phone number is too short"),
  })),
  address: addressSchema.optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  avatarUrl: z.string().optional(),
  isFavorite: z.boolean(),
});

export type ContactSchema = z.infer<typeof contactSchema>;
