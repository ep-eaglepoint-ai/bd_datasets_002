import { ZodError } from 'zod';
import { rowSchema, RawRow, ValidationResult, REQUIRED_HEADERS } from './schema';

/**
 * Normalize (trim) all string values in a row
 */
export function normalizeRow(row: RawRow): RawRow {
  const normalized: RawRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase()] = typeof value === 'string' ? value.trim() : value;
  }
  return normalized;
}

/**
 * Format Zod errors into human-readable field-level messages
 */
export function formatErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // Use the first error for each field
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  
  return errors;
}

/**
 * Validate a single row using the shared schema
 */
export function validateRow(row: RawRow): ValidationResult {
  try {
    const data = rowSchema.parse(row);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { isValid: false, errors: formatErrors(error) };
    }
    return { isValid: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Check if all required headers are present
 */
export function validateHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter(h => !normalizedHeaders.includes(h));
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if a row is empty (all values are empty strings or whitespace)
 */
export function isEmptyRow(row: RawRow): boolean {
  return Object.values(row).every(value => !value || value.trim() === '');
}

/**
 * Format error messages for display in UI
 */
export function formatErrorsForDisplay(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
}
