import { z } from 'zod';
import { normalizeUrl } from '../utils/url';

/* -----------------------------------------------------
   Result type (explicit, no exceptions)
----------------------------------------------------- */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string[] };

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */
const safeNormalizeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return normalizeUrl(value);
};

/* -----------------------------------------------------
   URL schema (NO THROWS)
----------------------------------------------------- */
const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .max(2048, 'URL must be less than 2048 characters')
  .trim()
  .refine(
    (value) => safeNormalizeUrl(value) !== null,
    { message: 'Invalid URL format or unsafe protocol' }
  )
  .transform((value) => safeNormalizeUrl(value)!);

/* -----------------------------------------------------
   Base bookmark schema
----------------------------------------------------- */
const baseBookmarkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),

  url: urlSchema,

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),

  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be less than 50 characters')
        .trim()
        .transform((t) => t.toLowerCase())
    )
    .max(20, 'Cannot have more than 20 tags')
    .optional()
    .default([]),

  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),

  isFavorite: z.boolean().optional().default(false),
});

/* -----------------------------------------------------
   Schemas
----------------------------------------------------- */
export const createBookmarkSchema = baseBookmarkSchema;

export const updateBookmarkSchema = baseBookmarkSchema
  .partial()
  .extend({
    id: z.string().min(1, 'ID is required'),
  });

/* -----------------------------------------------------
   Types
----------------------------------------------------- */
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;

/* -----------------------------------------------------
   Validation functions (safeParse ONLY)
----------------------------------------------------- */
export function validateCreateBookmark(
  data: unknown
): ValidationResult<CreateBookmarkInput> {
  const result = createBookmarkSchema.safeParse(data);

  if (result.success) {
    return { ok: true, value: result.data };
  }

  return {
    ok: false,
    error: result.error.issues.map((i) => i.message),
  };
}

export function validateUpdateBookmark(
  data: unknown
): ValidationResult<UpdateBookmarkInput> {
  const result = updateBookmarkSchema.safeParse(data);

  if (result.success) {
    return { ok: true, value: result.data };
  }

  return {
    ok: false,
    error: result.error.issues.map((i) => i.message),
  };
}

/* -----------------------------------------------------
   Tag helpers (optional but compliant)
----------------------------------------------------- */
export function validateTag(tag: unknown): ValidationResult<string> {
  const schema = z
    .string()
    .min(1, 'Tag cannot be empty')
    .max(50, 'Tag must be less than 50 characters')
    .trim()
    .transform((t) => t.toLowerCase());

  const result = schema.safeParse(tag);

  if (result.success) {
    return { ok: true, value: result.data };
  }

  return {
    ok: false,
    error: result.error.issues.map((i) => i.message),
  };
}

export function validateTags(tags: unknown): ValidationResult<string[]> {
  const schema = z
    .array(
      z
        .string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be less than 50 characters')
        .trim()
        .transform((t) => t.toLowerCase())
    )
    .max(20, 'Cannot have more than 20 tags');

  const result = schema.safeParse(tags);

  if (result.success) {
    return { ok: true, value: result.data };
  }

  return {
    ok: false,
    error: result.error.issues.map((i) => i.message),
  };
}