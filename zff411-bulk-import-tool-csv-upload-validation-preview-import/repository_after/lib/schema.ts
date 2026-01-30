import { z } from 'zod';

/**
 * Required headers for CSV import
 */
export const REQUIRED_HEADERS = ['name', 'email', 'age'] as const;

/**
 * Zod schema for validating a single row
 * Used by both client and server for consistent validation
 */
export const rowSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required'),
  email: z
    .string({ required_error: 'Email is required' })
    .min(1, 'Email is required')
    .email('Invalid email'),
  age: z
    .string()
    .min(1, 'Age is required')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        throw new Error('Age must be a number');
      }
      return parsed;
    })
    .pipe(
      z
        .number({ required_error: 'Age is required' })
        .int('Age must be a whole number')
        .min(0, 'Age must be at least 0')
        .max(150, 'Age must be at most 150')
    ),
});

/**
 * Type for a validated row
 */
export type ValidatedRow = z.infer<typeof rowSchema>;

/**
 * Type for a raw CSV row before validation
 */
export type RawRow = Record<string, string>;

/**
 * Type for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  data?: ValidatedRow;
  errors?: Record<string, string>;
}

/**
 * Type for a row with validation status
 */
export interface ParsedRow {
  rowNumber: number;
  data: RawRow;
  isValid: boolean;
  errors?: Record<string, string>;
}
