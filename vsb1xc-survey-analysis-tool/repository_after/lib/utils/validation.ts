import { z } from 'zod';
import { SurveySchema, SurveyResponseSchema, DatasetSnapshotSchema } from '@/lib/schemas/survey';
import { StatisticalSummarySchema, CrossTabulationSchema } from '@/lib/schemas/analytics';

export interface ValidationError {
  field: string;
  message: string;
  path: (string | number)[];
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  errorMessage?: string;
}

/**
 * Validates survey data with detailed error reporting
 */
export function validateSurvey(data: unknown): ValidationResult<z.infer<typeof SurveySchema>> {
  try {
    const result = SurveySchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Survey validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates survey response with detailed error reporting
 */
export function validateSurveyResponse(data: unknown): ValidationResult<z.infer<typeof SurveyResponseSchema>> {
  try {
    const result = SurveyResponseSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Response validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates multiple responses, returning valid ones and errors
 */
export function validateSurveyResponses(
  data: unknown[]
): {
  valid: z.infer<typeof SurveyResponseSchema>[];
  invalid: Array<{ index: number; error: ValidationError[]; errorMessage: string }>;
} {
  const valid: z.infer<typeof SurveyResponseSchema>[] = [];
  const invalid: Array<{ index: number; error: ValidationError[]; errorMessage: string }> = [];

  data.forEach((item, index) => {
    const result = validateSurveyResponse(item);
    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        error: result.errors || [],
        errorMessage: result.errorMessage || 'Validation failed',
      });
    }
  });

  return { valid, invalid };
}

/**
 * Validates dataset snapshot
 */
export function validateSnapshot(data: unknown): ValidationResult<z.infer<typeof DatasetSnapshotSchema>> {
  try {
    const result = DatasetSnapshotSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Snapshot validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates statistical summary
 */
export function validateStatisticalSummary(data: unknown): ValidationResult<z.infer<typeof StatisticalSummarySchema>> {
  try {
    const result = StatisticalSummarySchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Statistical summary validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates cross-tabulation result
 */
export function validateCrossTabulation(data: unknown): ValidationResult<z.infer<typeof CrossTabulationSchema>> {
  try {
    const result = CrossTabulationSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Cross-tabulation validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates cleaning rule configuration
 */
export function validateCleaningRule(data: unknown): ValidationResult<{
  id: string;
  type: string;
  config: Record<string, unknown>;
  appliedAt: string;
}> {
  const schema = z.object({
    id: z.string(),
    type: z.enum([
      'remove-duplicates',
      'trim-whitespace',
      'normalize-text',
      'standardize-labels',
      'handle-missing',
      'flag-outliers',
      'transform',
    ]),
    config: z.record(z.unknown()),
    appliedAt: z.string().datetime(),
  });

  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      path: err.path,
      code: err.code,
    }));

    return {
      success: false,
      errors,
      errorMessage: `Cleaning rule validation failed: ${errors.map(e => e.message).join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates imported CSV/JSON data structure
 */
export function validateImportedData(data: unknown[]): {
  valid: unknown[];
  invalid: Array<{ index: number; error: string }>;
} {
  const valid: unknown[] = [];
  const invalid: Array<{ index: number; error: string }> = [];

  if (!Array.isArray(data)) {
    return {
      valid: [],
      invalid: [{ index: 0, error: 'Imported data must be an array' }],
    };
  }

  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      invalid.push({
        index,
        error: 'Each row must be an object',
      });
      return;
    }

    // Basic structure validation
    if (!('id' in item) && !('surveyId' in item)) {
      invalid.push({
        index,
        error: 'Missing required fields: id or surveyId',
      });
      return;
    }

    valid.push(item);
  });

  return { valid, invalid };
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(err => `${err.field}: ${err.message}`)
    .join('\n');
}

/**
 * Creates a safe validation wrapper that never throws
 */
export function safeValidate<T>(
  validator: (data: unknown) => ValidationResult<T>,
  data: unknown,
  onError?: (error: ValidationError[]) => void
): T | null {
  const result = validator(data);
  
  if (result.success && result.data) {
    return result.data;
  }

  if (result.errors && onError) {
    onError(result.errors);
  }

  return null;
}
